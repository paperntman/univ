// --- 파일: handlers/university_handler_test.go ---
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFilterUniversitiesHandler_IntegrationWithCalculator(t *testing.T) {
	// 1. Arrange: 테스트에 필요한 모든 것을 설정합니다.

	// 테스트할 사용자 성적 데이터 생성
	// 이 데이터는 위에서 정의한 mockScheme의 계산 과정을 거치게 됩니다.
	testGpaScores := []GpaScore{
		{SubjectName: "국어", Category: "국어", Units: 4, Rank: 2},
		{SubjectName: "수학Ⅰ", Category: "수학", Units: 4, Rank: 3},
		{SubjectName: "영어", Category: "영어", Units: 3, Rank: 1}, // 이 과목은 필터링되어야 함
	}
	testCsatScores := map[string]CsatScore{} // 이 테스트에서는 사용되지 않음

	// 서버로 보낼 요청 본문(request body) 생성
	requestPayload := FilterRequest{
		UserGrades: struct {
			Naesin []GpaScore           `json:"naesin"`
			Csat   map[string]CsatScore `json:"suneung"`
		}{
			Naesin: testGpaScores,
			Csat:   testCsatScores,
		},
		FilterCriteria: struct {
			DepartmentKeywords string `json:"departmentKeywords"`
			AdmissionType      string `json:"admissionType"`
		}{
			DepartmentKeywords: "컴퓨터공학과",
			AdmissionType:      "교과",
		},
	}

	// 요청 본문을 JSON으로 마샬링
	body, err := json.Marshal(requestPayload)
	assert.NoError(t, err)

	// HTTP 요청 시뮬레이션
	req := httptest.NewRequest(http.MethodPost, "/universities/filter", bytes.NewReader(body))
	rr := httptest.NewRecorder() // 응답을 기록할 ResponseRecorder

	// 2. Act: 핸들러 함수를 직접 호출합니다.
	handler := http.HandlerFunc(FilterUniversitiesHandler)
	handler.ServeHTTP(rr, req)

	// 3. Assert: 결과를 검증합니다.

	// 상태 코드가 200 OK인지 확인
	assert.Equal(t, http.StatusOK, rr.Code, "핸들러가 200 OK를 반환해야 합니다.")

	// 응답 본문을 디코딩
	var responseData []FilteredUniversityResult
	err = json.Unmarshal(rr.Body.Bytes(), &responseData)
	assert.NoError(t, err, "응답 본문 JSON 디코딩에 실패해서는 안 됩니다.")

	// 응답 데이터가 비어있지 않은지 확인
	assert.Len(t, responseData, 1, "응답으로 하나의 대학 결과가 있어야 합니다.")

	// --- 가장 중요한 검증: 계산된 점수가 예상과 일치하는가? ---
	// 계산 과정:
	// 1. `FILTER_SUBJECTS_BY_CATEGORY`: 국어, 수학만 남음 (영어는 필터링됨)
	// 2. `APPLY_GRADE_TO_SCORE_MAP`: 국어(2등급) -> 95점, 수학(3등급) -> 90점
	// 3. `CALCULATE_WEIGHTED_AVERAGE`: ((95점 * 4단위) + (90점 * 4단위)) / (4단위 + 4단위)
	//    = (380 + 360) / 8 = 740 / 8 = 92.5
	expectedScore := 92.5
	actualScore := responseData[0].AdmissionTypeResults.Suneung.UserCalculatedScore

	// 부동소수점 비교를 위해 InDelta 사용
	assert.InDelta(t, expectedScore, actualScore, 0.001, "계산된 환산 점수가 예상 값과 일치해야 합니다.")
}
