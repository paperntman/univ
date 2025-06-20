// handlers/filter.go

package handlers

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

// --- 프런트엔드와 통신하기 위한 구조체 정의 ---

type NaesinSubject struct {
	ID                           string   `json:"id"`
	CurriculumClassificationCode *string  `json:"curriculumClassificationCode"`
	CurriculumClassificationName *string  `json:"curriculumClassificationName"`
	CurriculumAreaCode           *string  `json:"curriculumAreaCode"`
	CurriculumAreaName           *string  `json:"curriculumAreaName"`
	SubjectCode                  *string  `json:"subjectCode"`
	SubjectName                  string   `json:"subjectName"`
	Grade                        *int     `json:"grade"`
	Credits                      *float64 `json:"credits"`
	RawScore                     *float64 `json:"rawScore"`
	SubjectMean                  *float64 `json:"subjectMean"`
	StdDev                       *float64 `json:"stdDev"`
	StudentCount                 *int     `json:"studentCount"`
	AchievementLevel             *string  `json:"achievementLevel"`
	DistributionA                *float64 `json:"distributionA"`
	DistributionB                *float64 `json:"distributionB"`
	DistributionC                *float64 `json:"distributionC"`
}

type NaesinGrades map[string][]NaesinSubject

type SuneungGrades struct {
	ExamYear                 int         `json:"examYear"`
	ExamMonth                int         `json:"examMonth"`
	ExamIdentifierForCutInfo string      `json:"examIdentifierForCutInfo"`
	Subjects                 interface{} `json:"subjects"`
}

type FilterPayload struct {
	UserGrades struct {
		Naesin  NaesinGrades  `json:"naesin"`
		Suneung SuneungGrades `json:"suneung"`
	} `json:"userGrades"`
	FilterCriteria struct {
		DepartmentKeywords       string `json:"departmentKeywords"`
		AdmissionType            string `json:"admissionType"`
		ScoreDifferenceTolerance int    `json:"scoreDifferenceTolerance"`
	} `json:"filterCriteria"`
}

type FilteredUniversity struct {
	UniversityID           string               `json:"universityId"`
	UniversityName         string               `json:"universityName"`
	Location               Location             `json:"location"`
	DepartmentName         string               `json:"departmentName"`
	AdmissionTypeResults   AdmissionTypeResults `json:"admissionTypeResults"`
	OverallCompetitionRate *float64             `json:"overallCompetitionRate,omitempty"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type AdmissionTypeResults struct {
	Suneung *AdmissionTypeSpecificResults `json:"suneung,omitempty"`
	Gyogwa  *AdmissionTypeSpecificResults `json:"gyogwa,omitempty"`
	Jonghap *AdmissionTypeSpecificResults `json:"jonghap,omitempty"`
}

type AdmissionTypeSpecificResults struct {
	UserCalculatedScore         *float64 `json:"userCalculatedScore,omitempty"`
	LastYearAvgConvertedScore   *float64 `json:"lastYearAvgConvertedScore,omitempty"`
	LastYear70CutConvertedScore *float64 `json:"lastYear70CutConvertedScore,omitempty"`
	SuneungMinSatisfied         *bool    `json:"suneungMinSatisfied,omitempty"`
}

// --- CSV 및 DB 데이터 처리를 위한 구조체 및 변수 ---

type AdmissionResult struct {
	UniversityName  string
	Campus          string
	DepartmentName  string
	DepartmentCode  string
	Region          string
	AdmissionType   string
	CompetitionRate *float64
	Cut50           *float64
	Cut70           *float64
}

var universityLocations = make(map[string]Location)
var (
	admissionData []AdmissionResult
	once          sync.Once
)

// LoadAdmissionData (디버깅 로그 추가)
func LoadAdmissionData(departmentInfoPath, admissionResultPath string) {
	once.Do(func() {
		// --- 0단계: DB 위치 정보 로드 ---
		log.Println("Loading university location data from DB...")
		if db == nil {
			log.Fatal("DB is not initialized. Make sure InitDB() is called before LoadAdmissionData().")
		}
		rows, err := db.Query("SELECT name, latitude, longitude FROM universities")
		if err != nil {
			log.Fatalf("Failed to query university locations: %v", err)
		}
		defer rows.Close()

		for rows.Next() {
			var name string
			var lat, lon sql.NullFloat64
			if err := rows.Scan(&name, &lat, &lon); err != nil {
				log.Printf("Error scanning university location: %v", err)
				continue
			}
			if lat.Valid && lon.Valid {
				universityLocations[name] = Location{
					Latitude:  lat.Float64,
					Longitude: lon.Float64,
				}
			}
		}
		log.Printf("Successfully cached %d university locations.", len(universityLocations))

		// --- 1단계: 학과 정보 CSV 로드하여 맵 생성 ---
		log.Println("[DEBUG] Stage 1: Loading department info and creating code map...")
		deptCodeMap := make(map[string]string)

		deptFile, err := os.Open(departmentInfoPath)
		if err != nil {
			log.Fatalf("Failed to open department info file: %s", err)
		}
		defer deptFile.Close()

		deptReader := csv.NewReader(deptFile)
		deptReader.FieldsPerRecord = -1
		if _, err := deptReader.Read(); err != nil { // 헤더 스킵
			log.Fatalf("Failed to read department info header: %s", err)
		}

		lineNum := 1
		for {
			lineNum++
			record, err := deptReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Printf("[DEBUG] Line %d: Error reading department info record: %s, skipping row", lineNum, err)
				continue
			}

			if record[9] != "주간" {
				continue
			}

			uniName := strings.TrimSpace(record[5])
			deptName := strings.TrimSpace(record[11])
			deptCode := strings.TrimSpace(record[13])

			if uniName == "" || deptName == "" {
				continue
			}

			mapKey := fmt.Sprintf("%s|%s", uniName, deptName)
			deptCodeMap[mapKey] = deptCode
			if strings.Contains(uniName, "인천") {
				log.Printf(`[DEBUG] DeptMap ADDED: Key="%s", Code="%s"`, mapKey, deptCode)
			}
		}
		log.Printf("Successfully loaded %d department codes.", len(deptCodeMap))

		// --- 2단계: 입시 결과 CSV 로드 및 학과 코드 결합 ---
		log.Println("\n[DEBUG] Stage 2: Loading admission results and joining with code map...")
		resultFile, err := os.Open(admissionResultPath)
		if err != nil {
			log.Fatalf("Failed to open admission result file: %s", err)
		}
		defer resultFile.Close()

		resultReader := csv.NewReader(resultFile)
		resultReader.FieldsPerRecord = -1
		if _, err := resultReader.Read(); err != nil { // 헤더 스킵
			log.Fatalf("Failed to read admission result header: %s", err)
		}

		lineNum = 1
		for {
			lineNum++
			record, err := resultReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Printf("[DEBUG] Line %d: Error reading admission result record: %s, skipping row", lineNum, err)
				continue
			}

			uniName := strings.TrimSpace(record[0])
			deptName := strings.TrimSpace(record[2])

			mapKey := fmt.Sprintf("%s|%s", uniName, deptName)
			deptCode, ok := deptCodeMap[mapKey]

			// --- 조인 과정 로그 ---
			isTargetUni := strings.Contains(uniName, "인천") // 추적할 대학인지 확인
			if !ok {
				if isTargetUni {
					log.Printf(`[DEBUG] FAILED JOIN: Key="%s" not found in deptCodeMap. SKIPPING.`, mapKey)
				}
				continue
			}

			admissionType := record[4]
			if !(strings.Contains(admissionType, "수능") || strings.Contains(admissionType, "교과") || strings.Contains(admissionType, "종합")) {
				if isTargetUni {
					log.Printf(`[DEBUG] SKIPPED (Invalid Admission Type): Key="%s", Type="%s"`, mapKey, admissionType)
				}
				continue
			}

			if isTargetUni {
				log.Printf(`[DEBUG] SUCCESS JOIN: Key="%s", Code="%s", Type="%s"`, mapKey, deptCode, admissionType)
			}

			data := AdmissionResult{
				UniversityName: uniName,
				Campus:         record[1],
				DepartmentName: deptName,
				DepartmentCode: deptCode,
				Region:         record[3],
				AdmissionType:  admissionType,
			}

			if val, err := strconv.ParseFloat(record[7], 64); err == nil {
				data.CompetitionRate = &val
			}
			if val, err := strconv.ParseFloat(record[9], 64); err == nil {
				data.Cut50 = &val
			}
			if val, err := strconv.ParseFloat(record[10], 64); err == nil {
				data.Cut70 = &val
			}

			admissionData = append(admissionData, data)
		}
		log.Printf("Successfully loaded and joined %d final admission records.", len(admissionData))
	})
}

// FilterUniversities 핸들러 (디버깅 로그 추가)
func FilterUniversities(c *gin.Context) {
	var payload FilterPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	deptCodeKeywords := payload.FilterCriteria.DepartmentKeywords
	log.Printf("\n\n[DEBUG] <<<<<<<< New Filter Request Received >>>>>>>>")
	log.Printf("[DEBUG] Filtering with Department Code: '%s'", deptCodeKeywords)

	// --- 사용자 내신 평균 등급 계산 ---
	var totalGradeCredits float64 = 0.0
	var totalCredits float64 = 0.0
	var userCalculatedScore *float64
	for _, semesterSubjects := range payload.UserGrades.Naesin {
		for _, subject := range semesterSubjects {
			if subject.Grade != nil && subject.Credits != nil && *subject.Credits > 0 {
				totalGradeCredits += float64(*subject.Grade) * (*subject.Credits)
				totalCredits += *subject.Credits
			}
		}
	}
	if totalCredits > 0 {
		calculatedScore := totalGradeCredits / totalCredits
		userCalculatedScore = &calculatedScore
		log.Printf("[DEBUG] User Calculated Score (Naesin Avg): %.2f", *userCalculatedScore)
	} else {
		log.Printf("[DEBUG] No valid Naesin grades to calculate user score.")
	}

	resultsMap := make(map[string]*FilteredUniversity)
	log.Printf("[DEBUG] --- Start Filtering %d records in memory ---", len(admissionData))

	for i, record := range admissionData {
		// 요청된 학과 코드와 일치하는 데이터만 추적
		if record.DepartmentCode == deptCodeKeywords {
			log.Printf("[DEBUG] Record %d MATCHED: Code '%s' for '%s - %s'", i, record.DepartmentCode, record.UniversityName, record.DepartmentName)
		}

		if deptCodeKeywords != "" && record.DepartmentCode != deptCodeKeywords {
			continue
		}

		mapKey := fmt.Sprintf("%s|%s", record.UniversityName, record.DepartmentName)
		uniResult, ok := resultsMap[mapKey]
		if !ok {
			location := Location{}
			if loc, found := universityLocations[record.UniversityName]; found {
				location = loc
			}
			uniResult = &FilteredUniversity{
				UniversityID:   fmt.Sprintf("%s-%s", record.UniversityName, record.DepartmentName),
				UniversityName: record.UniversityName,
				DepartmentName: record.DepartmentName,
				Location:       location,
			}
			resultsMap[mapKey] = uniResult
		}

		specificResult := &AdmissionTypeSpecificResults{
			UserCalculatedScore:         userCalculatedScore,
			LastYearAvgConvertedScore:   record.Cut50,
			LastYear70CutConvertedScore: record.Cut70,
			SuneungMinSatisfied:         new(bool), // true로 초기화
		}
		*specificResult.SuneungMinSatisfied = true

		if strings.Contains(record.AdmissionType, "수능") {
			uniResult.AdmissionTypeResults.Suneung = specificResult
			if uniResult.OverallCompetitionRate == nil {
				uniResult.OverallCompetitionRate = record.CompetitionRate
			}
		} else if strings.Contains(record.AdmissionType, "교과") {
			uniResult.AdmissionTypeResults.Gyogwa = specificResult
		} else if strings.Contains(record.AdmissionType, "종합") {
			uniResult.AdmissionTypeResults.Jonghap = specificResult
		}
	}
	log.Printf("[DEBUG] --- Filtering Finished. Found %d unique university-departments ---", len(resultsMap))

	finalResults := make([]FilteredUniversity, 0, len(resultsMap))
	for _, result := range resultsMap {
		finalResults = append(finalResults, *result)
	}

	c.JSON(http.StatusOK, finalResults)
}
