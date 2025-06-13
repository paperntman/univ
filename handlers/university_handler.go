// --- 파일: handlers/university_handler.go ---
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

// FilterRequest는 /universities/filter 요청의 Body를 담는 구조체입니다.
type FilterRequest struct {
	UserGrades struct {
		Naesin []GpaScore           `json:"naesin"`  // 계산기 GpaScore와 일치시킴
		Csat   map[string]CsatScore `json:"suneung"` // 계산기 CsatScore와 일치시킴
	} `json:"userGrades"`
	FilterCriteria struct {
		DepartmentKeywords string `json:"departmentKeywords"`
		AdmissionType      string `json:"admissionType"`
	} `json:"filterCriteria"`
}

// FilteredUniversityResult는 필터링된 개별 대학의 결과를 담는 구조체입니다.
type FilteredUniversityResult struct {
	UniversityID         string `json:"universityId"`
	UniversityName       string `json:"universityName"`
	DepartmentName       string `json:"departmentName"`
	AdmissionTypeResults struct {
		// 실제로는 gyogwa, jonghap 등도 있겠지만, 테스트를 위해 suneung만 정의
		Suneung struct {
			UserCalculatedScore       float64 `json:"userCalculatedScore"`
			LastYearAvgConvertedScore float64 `json:"lastYearAvgConvertedScore"`
		} `json:"suneung"`
	} `json:"admissionTypeResults"`
}

// FilterUniversitiesHandler는 사용자 성적을 받아 대학별 환산 점수를 계산하고 필터링합니다.
func FilterUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST 요청만 허용됩니다.", http.StatusMethodNotAllowed)
		return
	}

	var requestBody FilterRequest
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "잘못된 요청 본문입니다: "+err.Error(), http.StatusBadRequest)
		return
	}

	// --- ScoreCalculator 연결 지점 ---

	// 1. 계산기 인스턴스 생성
	// 사용자 성적 데이터를 계산기에 전달합니다.
	sc := NewScoreCalculator(requestBody.UserGrades.Naesin, requestBody.UserGrades.Csat)

	// 2. 계산 스키마(CalculationScheme) 정의 또는 로드
	// TODO: 실제 애플리케이션에서는 이 부분을 DB에서 대학/학과/전형에 맞는 스키마를 조회해야 합니다.
	// 지금은 테스트를 위해 하드코딩된 스키마를 사용합니다.
	mockSchemeJSON := `
	{
		"admission_type": "교과전형-A",
		"scheme_details": {
			"score_source": "GPA",
			"calculation_pipeline": [
				{
					"step": 1,
					"function_name": "FILTER_SUBJECTS_BY_CATEGORY",
					"description": "국어, 수학 교과만 반영",
					"parameters": {
						"categories": ["국어", "수학"]
					}
				},
				{
					"step": 2,
					"function_name": "APPLY_GRADE_TO_SCORE_MAP",
					"description": "등급을 점수로 환산",
					"parameters": {
						"map": {
							"1": 100,
							"2": 95,
							"3": 90,
							"4": 85,
							"5": 80
						}
					}
				},
				{
					"step": 3,
					"function_name": "CALCULATE_WEIGHTED_AVERAGE",
					"description": "이수단위를 가중치로 사용하여 가중평균 계산",
					"parameters": {}
				}
			]
		}
	}`
	var scheme CalculationScheme
	if err := json.Unmarshal([]byte(mockSchemeJSON), &scheme); err != nil {
		log.Printf("스키마 파싱 오류: %v", err)
		http.Error(w, "서버 내부 오류", http.StatusInternalServerError)
		return
	}

	// 3. 계산 실행
	finalScore, err := sc.Calculate(scheme)
	if err != nil {
		log.Printf("점수 계산 중 오류: %v", err)
		http.Error(w, "점수 계산 중 오류 발생", http.StatusInternalServerError)
		return
	}

	// --- 결과 조합 및 응답 ---

	// TODO: 실제로는 requestBody.FilterCriteria를 사용해 여러 대학을 필터링하고
	// 각 대학에 맞는 스키마로 점수를 계산하는 반복문이 필요합니다.
	// 이 예제에서는 단일 계산 결과만 반환합니다.

	response := []FilteredUniversityResult{
		{
			UniversityID:   "TEST_UNIV_001",
			UniversityName: "테스트대학교",
			DepartmentName: requestBody.FilterCriteria.DepartmentKeywords,
			AdmissionTypeResults: struct {
				Suneung struct {
					UserCalculatedScore       float64 `json:"userCalculatedScore"`
					LastYearAvgConvertedScore float64 `json:"lastYearAvgConvertedScore"`
				} `json:"suneung"`
			}{
				Suneung: struct {
					UserCalculatedScore       float64 `json:"userCalculatedScore"`
					LastYearAvgConvertedScore float64 `json:"lastYearAvgConvertedScore"`
				}{
					UserCalculatedScore:       finalScore, // 계산된 최종 점수
					LastYearAvgConvertedScore: 91.5,       // 예시 작년도 점수
				},
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("JSON 응답 인코딩 오류: %v", err)
	}
}
