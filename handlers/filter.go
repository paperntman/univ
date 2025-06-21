// handlers/filter.go

package handlers

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
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
		DepartmentKeywords       string  `json:"departmentKeywords"`
		AdmissionType            string  `json:"admissionType"`
		ScoreDifferenceTolerance float64 `json:"scoreDifferenceTolerance"`
	} `json:"filterCriteria"`
}

type FilteredUniversity struct {
	UniversityID           string               `json:"universityId"`
	UniversityName         string               `json:"universityName"`
	Location               Location             `json:"location"`
	DepartmentName         string               `json:"departmentName"`
	AdmissionTypeResults   AdmissionTypeResults `json:"admissionTypeResults"`
	OverallCompetitionRate *float64             `json:"overallCompetitionRate,omitempty"`
	DetailAdmissionType    string               `json:"detailAdmissionType,omitempty"` // 세부 전형명 추가
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
	// 세부 전형명 추가
	DetailAdmissionType string
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
		if db == nil {
			return
		}
		rows, err := db.Query("SELECT name, latitude, longitude FROM universities")
		if err != nil {
			return
		}
		defer rows.Close()

		for rows.Next() {
			var name string
			var lat, lon sql.NullFloat64
			if err := rows.Scan(&name, &lat, &lon); err != nil {
				continue
			}
			if lat.Valid && lon.Valid {
				universityLocations[name] = Location{
					Latitude:  lat.Float64,
					Longitude: lon.Float64,
				}
			}
		}

		// --- 1단계: 학과 정보 CSV 로드하여 맵 생성 ---
		deptCodeMap := make(map[string]string)

		deptFile, err := os.Open(departmentInfoPath)
		if err != nil {
			return
		}
		defer deptFile.Close()

		deptReader := csv.NewReader(deptFile)
		deptReader.FieldsPerRecord = -1
		if _, err := deptReader.Read(); err != nil { // 헤더 스킵
			return
		}

		lineNum := 1
		for {
			lineNum++
			record, err := deptReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
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
		}

		// --- 2단계: 입시 결과 CSV 로드 및 학과 코드 결합 ---
		resultFile, err := os.Open(admissionResultPath)
		if err != nil {
			return
		}
		defer resultFile.Close()

		resultReader := csv.NewReader(resultFile)
		resultReader.FieldsPerRecord = -1
		if _, err := resultReader.Read(); err != nil { // 헤더 스킵
			return
		}

		lineNum = 1
		for {
			lineNum++
			record, err := resultReader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				continue
			}

			uniName := strings.TrimSpace(record[0])
			deptName := strings.TrimSpace(record[2])

			mapKey := fmt.Sprintf("%s|%s", uniName, deptName)
			deptCode, ok := deptCodeMap[mapKey]

			if !ok {
				continue
			}

			admissionType := record[4]
			if !(strings.Contains(admissionType, "수능") || strings.Contains(admissionType, "교과") || strings.Contains(admissionType, "종합")) {
				continue
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
			// 세부 전형명 필드 추가
			data.DetailAdmissionType = strings.TrimSpace(record[5])

			admissionData = append(admissionData, data)
		}
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
	admissionTypeKeyword := payload.FilterCriteria.AdmissionType

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
	}

	scoreDifferenceTolerance := float64(payload.FilterCriteria.ScoreDifferenceTolerance)

	finalResults := make([]FilteredUniversity, 0)

	for _, record := range admissionData {
		// --- 세부전형명(AdmissionType) 필터링 ---
		if admissionTypeKeyword != "경쟁률" && admissionTypeKeyword != "" && !strings.Contains(record.AdmissionType, admissionTypeKeyword) {
			continue
		}
		if deptCodeKeywords != "" && record.DepartmentCode != deptCodeKeywords {
			continue
		}

		// 경쟁률 전형 필터일 때: 성적 기반 필터링 없이 경쟁률 정보가 있는 모든 학과 포함
		if admissionTypeKeyword == "경쟁률" {
			if record.CompetitionRate == nil {
				continue
			}
			location := Location{}
			if loc, found := universityLocations[record.UniversityName]; found {
				location = loc
			}
			finalResults = append(finalResults, FilteredUniversity{
				UniversityID:           fmt.Sprintf("%s-%s", record.UniversityName, record.DepartmentName),
				UniversityName:         record.UniversityName,
				DepartmentName:         record.DepartmentName,
				Location:               location,
				OverallCompetitionRate: record.CompetitionRate,
				// 세부 전형명 전달
				AdmissionTypeResults: AdmissionTypeResults{},
			})
			continue
		}

		// 수능 전형 필터일 때: 오로지 수능 성적만 사용, 내신 기반 산출 금지
		if admissionTypeKeyword == "수능" {
			if !strings.Contains(record.AdmissionType, "수능") {
				continue
			}
			if userCalculatedScore == nil {
				continue
			}
		}

		// 경쟁률 필터일 때는 점수차 허용치 필터링을 건너뜀
		if admissionTypeKeyword != "경쟁률" {
			if userCalculatedScore != nil {
				var lastYearScore *float64
				if record.Cut70 != nil {
					lastYearScore = record.Cut70
				} else if record.Cut50 != nil {
					lastYearScore = record.Cut50
				}
				if lastYearScore != nil {
					if abs(*userCalculatedScore-*lastYearScore) > float64(scoreDifferenceTolerance) {
						continue
					}
				}
			}
		}

		location := Location{}
		if loc, found := universityLocations[record.UniversityName]; found {
			location = loc
		}

		admissionTypeResults := AdmissionTypeResults{}
		specificResult := &AdmissionTypeSpecificResults{
			UserCalculatedScore:         userCalculatedScore,
			LastYearAvgConvertedScore:   record.Cut50,
			LastYear70CutConvertedScore: record.Cut70,
			SuneungMinSatisfied:         new(bool),
		}
		*specificResult.SuneungMinSatisfied = true

		if strings.Contains(record.AdmissionType, "수능") {
			admissionTypeResults.Suneung = specificResult
		} else if strings.Contains(record.AdmissionType, "교과") {
			admissionTypeResults.Gyogwa = specificResult
		} else if strings.Contains(record.AdmissionType, "종합") {
			admissionTypeResults.Jonghap = specificResult
		}

		finalResults = append(finalResults, FilteredUniversity{
			UniversityID:           fmt.Sprintf("%s-%s", record.UniversityName, record.DepartmentName),
			UniversityName:         record.UniversityName,
			DepartmentName:         record.DepartmentName,
			Location:               location,
			AdmissionTypeResults:   admissionTypeResults,
			OverallCompetitionRate: record.CompetitionRate,
			// 세부 전형명 전달 (프론트에서 활용할 수 있도록)
			DetailAdmissionType: record.DetailAdmissionType,
		})
	}

	c.JSON(http.StatusOK, finalResults)
}

// abs 함수 추가
func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
