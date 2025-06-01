package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

// ApiSubjectInfo는 API 응답을 위한 공통 구조체입니다.
// 코드, 명칭, 그리고 상위 코드(선택적)를 포함합니다.
type ApiSubjectInfo struct {
	SubjectCode string  `json:"subjectCode"`
	SubjectName string  `json:"subjectName"`
	ParentCode  *string `json:"parentCode,omitempty"` // 상위 코드가 없는 경우 JSON에서 생략됨
}

// --- 내신 데이터 구조 ---

// NaesinCurriculumClassification: 내신 '교과구분종류' (예: 일반 교과, 진로 선택 교과)
type NaesinCurriculumClassification struct {
	Code string // 예: "CLASS_COMMON"
	Name string // 예: "일반 교과"
}

// NaesinCurriculum: 특정 '교과구분종류'에 속하는 '교과' (예: 국어, 수학)
type NaesinCurriculum struct {
	Code               string // 예: "CURR_MATH_COMMON"
	Name               string // 예: "수학"
	ClassificationCode string // 상위 '교과구분종류'의 Code
}

// NaesinRawSubject: 특정 '교과'에 속하는 '과목'의 원본 데이터 (과목명만 저장)
// SubjectCode는 "NAESIN_" + Name 형태로 동적 생성됩니다.
type NaesinRawSubject struct {
	Name           string // 예: "수학Ⅰ"
	CurriculumCode string // 상위 '교과'의 Code
}

// --- 하드코딩 데이터 영역 ---
// 사용자가 여기에 실제 데이터를 채워 넣습니다.

// 교과구분종류 목록
var naesinClassificationsData = []NaesinCurriculumClassification{
	{Code: "CLASS_CORE", Name: "공통 교과"}, // 예: 1학년 공통
	{Code: "CLASS_COMMON_SELECT", Name: "일반 선택"},
	{Code: "CLASS_CAREER_SELECT", Name: "진로 선택"},
	// 추가 교과구분종류...
}

// 교과 목록
var naesinCurriculumsData = []NaesinCurriculum{
	// 공통 교과
	{Code: "CURR_CORE_KOR", Name: "국어(공통)", ClassificationCode: "CLASS_CORE"},
	{Code: "CURR_CORE_MATH", Name: "수학(공통)", ClassificationCode: "CLASS_CORE"},
	{Code: "CURR_CORE_ENG", Name: "영어(공통)", ClassificationCode: "CLASS_CORE"},
	{Code: "CURR_CORE_SOCIETY", Name: "통합사회", ClassificationCode: "CLASS_CORE"},
	{Code: "CURR_CORE_SCIENCE", Name: "통합과학", ClassificationCode: "CLASS_CORE"},
	{Code: "CURR_CORE_HISTORY", Name: "한국사(공통)", ClassificationCode: "CLASS_CORE"},

	// 일반 선택 - 국어 교과
	{Code: "CURR_COMMON_KOR_SELECT", Name: "국어", ClassificationCode: "CLASS_COMMON_SELECT"},
	// 일반 선택 - 수학 교과
	{Code: "CURR_COMMON_MATH_SELECT", Name: "수학", ClassificationCode: "CLASS_COMMON_SELECT"},
	// 일반 선택 - 영어 교과
	{Code: "CURR_COMMON_ENG_SELECT", Name: "영어", ClassificationCode: "CLASS_COMMON_SELECT"},
	// 일반 선택 - 사회탐구 교과
	{Code: "CURR_COMMON_SOCIETY_SELECT", Name: "사회탐구", ClassificationCode: "CLASS_COMMON_SELECT"},
	// 일반 선택 - 과학탐구 교과
	{Code: "CURR_COMMON_SCIENCE_SELECT", Name: "과학탐구", ClassificationCode: "CLASS_COMMON_SELECT"},
	// 일반 선택 - 기타 교과 (예체능, 제2외국어 등)
	{Code: "CURR_COMMON_ARTPHY_SELECT", Name: "예술/체육", ClassificationCode: "CLASS_COMMON_SELECT"},
	{Code: "CURR_COMMON_FOREIGN_SELECT", Name: "제2외국어/한문", ClassificationCode: "CLASS_COMMON_SELECT"},

	// 진로 선택 - 국어 교과
	{Code: "CURR_CAREER_KOR_SELECT", Name: "국어(진로)", ClassificationCode: "CLASS_CAREER_SELECT"},
	// 진로 선택 - 수학 교과
	{Code: "CURR_CAREER_MATH_SELECT", Name: "수학(진로)", ClassificationCode: "CLASS_CAREER_SELECT"},
	// 진로 선택 - 영어 교과
	{Code: "CURR_CAREER_ENG_SELECT", Name: "영어(진로)", ClassificationCode: "CLASS_CAREER_SELECT"},
	// 진로 선택 - 사회탐구 교과
	{Code: "CURR_CAREER_SOCIETY_SELECT", Name: "사회탐구(진로)", ClassificationCode: "CLASS_CAREER_SELECT"},
	// 진로 선택 - 과학탐구 교과
	{Code: "CURR_CAREER_SCIENCE_SELECT", Name: "과학탐구(진로)", ClassificationCode: "CLASS_CAREER_SELECT"},
	// 추가 교과...
}

// (내신) 과목 목록 (과목명만 정의, 코드는 "NAESIN_과목명"으로 생성)
var naesinRawSubjectsData = []NaesinRawSubject{
	// 공통 교과 과목
	{Name: "국어", CurriculumCode: "CURR_CORE_KOR"},
	{Name: "수학", CurriculumCode: "CURR_CORE_MATH"},
	{Name: "영어", CurriculumCode: "CURR_CORE_ENG"},
	{Name: "통합사회", CurriculumCode: "CURR_CORE_SOCIETY"},
	{Name: "통합과학", CurriculumCode: "CURR_CORE_SCIENCE"},
	{Name: "한국사", CurriculumCode: "CURR_CORE_HISTORY"},

	// 일반 선택 > 국어
	{Name: "화법과 작문", CurriculumCode: "CURR_COMMON_KOR_SELECT"},
	{Name: "독서", CurriculumCode: "CURR_COMMON_KOR_SELECT"},
	{Name: "언어와 매체", CurriculumCode: "CURR_COMMON_KOR_SELECT"},
	{Name: "문학", CurriculumCode: "CURR_COMMON_KOR_SELECT"},
	// 일반 선택 > 수학
	{Name: "수학Ⅰ", CurriculumCode: "CURR_COMMON_MATH_SELECT"},
	{Name: "수학Ⅱ", CurriculumCode: "CURR_COMMON_MATH_SELECT"},
	{Name: "미적분", CurriculumCode: "CURR_COMMON_MATH_SELECT"},
	{Name: "확률과 통계", CurriculumCode: "CURR_COMMON_MATH_SELECT"},
	// 일반 선택 > 영어
	{Name: "영어Ⅰ", CurriculumCode: "CURR_COMMON_ENG_SELECT"},
	{Name: "영어Ⅱ", CurriculumCode: "CURR_COMMON_ENG_SELECT"},
	// 일반 선택 > 사회탐구
	{Name: "생활과 윤리", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "윤리와 사상", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "한국지리", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "세계지리", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "동아시아사", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "세계사", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "경제", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "정치와 법", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	{Name: "사회·문화", CurriculumCode: "CURR_COMMON_SOCIETY_SELECT"},
	// 일반 선택 > 과학탐구
	{Name: "물리학Ⅰ", CurriculumCode: "CURR_COMMON_SCIENCE_SELECT"},
	{Name: "화학Ⅰ", CurriculumCode: "CURR_COMMON_SCIENCE_SELECT"},
	{Name: "생명과학Ⅰ", CurriculumCode: "CURR_COMMON_SCIENCE_SELECT"},
	{Name: "지구과학Ⅰ", CurriculumCode: "CURR_COMMON_SCIENCE_SELECT"},

	// 진로 선택 > 국어(진로)
	{Name: "실용 국어", CurriculumCode: "CURR_CAREER_KOR_SELECT"},
	{Name: "심화 국어", CurriculumCode: "CURR_CAREER_KOR_SELECT"},
	{Name: "고전 읽기", CurriculumCode: "CURR_CAREER_KOR_SELECT"},
	// 진로 선택 > 수학(진로)
	{Name: "기하", CurriculumCode: "CURR_CAREER_MATH_SELECT"}, // 기하를 진로선택으로 분류
	{Name: "경제 수학", CurriculumCode: "CURR_CAREER_MATH_SELECT"},
	{Name: "인공지능 수학", CurriculumCode: "CURR_CAREER_MATH_SELECT"},
	// 진로 선택 > 과학탐구(진로)
	{Name: "물리학Ⅱ", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	{Name: "화학Ⅱ", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	{Name: "생명과학Ⅱ", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	{Name: "지구과학Ⅱ", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	{Name: "과학사", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	{Name: "생활과 과학", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	{Name: "융합과학", CurriculumCode: "CURR_CAREER_SCIENCE_SELECT"},
	// 추가 과목...
}

// 수능 과목명 목록 (코드는 "SUNEUNG_과목명"으로 생성)
var suneungKoreanRawSubjectNames = []string{"화법과 작문", "언어와 매체"}
var suneungMathRawSubjectNames = []string{"확률과 통계", "미적분", "기하"}
var suneungSocialTamguRawSubjectNames = []string{
	"생활과 윤리", "윤리와 사상", "한국지리", "세계지리", "동아시아사", "세계사", "정치와 법", "경제", "사회·문화",
}
var suneungScienceTamguRawSubjectNames = []string{
	"물리학Ⅰ", "화학Ⅰ", "생명과학Ⅰ", "지구과학Ⅰ", "물리학Ⅱ", "화학Ⅱ", "생명과학Ⅱ", "지구과학Ⅱ",
}

// --- 핸들러 함수 ---
func Subject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET 요청만 허용됩니다.", http.StatusMethodNotAllowed)
		return
	}

	subjectType := r.URL.Query().Get("type")
	classificationCode := r.URL.Query().Get("classificationCode") // Optional
	curriculumCode := r.URL.Query().Get("curriculumCode")         // Optional

	var results []ApiSubjectInfo

	switch subjectType {
	case "naesin_curriculum_classifications":
		for _, class := range naesinClassificationsData {
			results = append(results, ApiSubjectInfo{
				SubjectCode: class.Code,
				SubjectName: class.Name,
				ParentCode:  nil, // 최상위이므로 ParentCode 없음
			})
		}

	case "naesin_curriculums_for_classification":
		if classificationCode == "" {
			http.Error(w, "type이 'naesin_curriculums_for_classification'일 때 classificationCode 파라미터가 필요합니다.", http.StatusBadRequest)
			return
		}
		for _, curr := range naesinCurriculumsData {
			if curr.ClassificationCode == classificationCode {
				parentC := curr.ClassificationCode // 할당 후 주소 전달
				results = append(results, ApiSubjectInfo{
					SubjectCode: curr.Code,
					SubjectName: curr.Name,
					ParentCode:  &parentC,
				})
			}
		}

	case "naesin_subjects_for_curriculum":
		if curriculumCode == "" {
			http.Error(w, "type이 'naesin_subjects_for_curriculum'일 때 curriculumCode 파라미터가 필요합니다.", http.StatusBadRequest)
			return
		}
		for _, subj := range naesinRawSubjectsData {
			if subj.CurriculumCode == curriculumCode {
				parentC := subj.CurriculumCode // 할당 후 주소 전달
				results = append(results, ApiSubjectInfo{
					SubjectCode: "NAESIN_" + strings.ReplaceAll(subj.Name, " ", "_"), // 예: "NAESIN_수학Ⅰ", "NAESIN_화법과_작문"
					SubjectName: subj.Name,
					ParentCode:  &parentC,
				})
			}
		}

	case "naesin_subjects_all":
		for _, subj := range naesinRawSubjectsData {
			parentC := subj.CurriculumCode
			results = append(results, ApiSubjectInfo{
				SubjectCode: "NAESIN_" + strings.ReplaceAll(subj.Name, " ", "_"),
				SubjectName: subj.Name,
				ParentCode:  &parentC,
			})
		}

	case "suneung_국어":
		for _, name := range suneungKoreanRawSubjectNames {
			results = append(results, ApiSubjectInfo{
				SubjectCode: "SUNEUNG_" + strings.ReplaceAll(name, " ", "_"),
				SubjectName: name,
				ParentCode:  nil,
			})
		}

	case "suneung_수학":
		for _, name := range suneungMathRawSubjectNames {
			results = append(results, ApiSubjectInfo{
				SubjectCode: "SUNEUNG_" + strings.ReplaceAll(name, " ", "_"),
				SubjectName: name,
				ParentCode:  nil,
			})
		}

	case "suneung_탐구":
		for _, name := range suneungSocialTamguRawSubjectNames {
			results = append(results, ApiSubjectInfo{
				SubjectCode: "SUNEUNG_" + strings.ReplaceAll(name, " ", "_"), // 필요시 "SUNEUNG_사회탐구_" 등으로 Prefix 구분 가능
				SubjectName: name,
				ParentCode:  nil,
			})
		}
		for _, name := range suneungScienceTamguRawSubjectNames {
			results = append(results, ApiSubjectInfo{
				SubjectCode: "SUNEUNG_" + strings.ReplaceAll(name, " ", "_"), // 필요시 "SUNEUNG_과학탐구_" 등으로 Prefix 구분 가능
				SubjectName: name,
				ParentCode:  nil,
			})
		}

	default:
		if subjectType == "" {
			http.Error(w, "type 파라미터가 필요합니다.", http.StatusBadRequest)
		} else {
			// 유효하지 않은 type의 경우 빈 배열 반환 (또는 404 Not Found)
			// http.Error(w, "유효하지 않은 type 값입니다: "+subjectType, http.StatusNotFound)
			log.Printf("유효하지 않은 type 값 수신: %s", subjectType)
		}
		// results는 이미 빈 슬라이스로 초기화되어 있음
	}

	w.Header().Set("Content-Type", "application/json")
	// results가 비어있더라도 성공(200)으로 간주하고 빈 배열 []을 반환합니다.
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(results); err != nil {
		log.Printf("JSON 인코딩 에러: %v", err)
	}
}
