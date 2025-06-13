package handlers

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
)

// --- 데이터 구조 정의 ---

// GpaScore 는 학생의 한 학기 교과 성적을 나타냅니다.
type GpaScore struct {
	SubjectName    string  `json:"과목명"`
	Category       string  `json:"과목분류"`
	Units          float64 `json:"이수단위"`
	Rank           int     `json:"석차등급"`
	Achievement    string  `json:"성취도"`
	Year           int     `json:"학년"`
	Semester       int     `json:"학기"`
	ConvertedScore float64 `json:"-"` // 환산점수
	YearlyWeight   float64 `json:"-"` // 학년가중치
	FinalWeight    float64 `json:"-"` // 최종가중치
}

// CsatScore 는 학생의 수능 성적을 나타냅니다.
type CsatScore struct {
	SubjectName    string  `json:"선택과목"`
	StandardScore  int     `json:"표준점수"`
	Percentile     int     `json:"백분위"`
	Rank           int     `json:"등급"`
	ConvertedScore float64 `json:"-"` // 환산점수
}

// CalculationStep 은 파이프라인의 한 단계를 나타냅니다.
type CalculationStep struct {
	Step        int             `json:"step"`
	FuncName    string          `json:"function_name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

// SchemeDetails 는 계산 스키마의 상세 정보를 담습니다.
type SchemeDetails struct {
	ScoreSource string            `json:"score_source"`
	Pipeline    []CalculationStep `json:"calculation_pipeline"`
}

// CalculationScheme 은 하나의 완전한 계산 스키마입니다.
type CalculationScheme struct {
	AdmissionType string        `json:"admission_type"`
	Details       SchemeDetails `json:"scheme_details"`
}

// --- ScoreCalculator 구조체 및 메소드 ---

type ScoreCalculator struct {
	originalGpaScores  []GpaScore
	originalCsatScores map[string]CsatScore
	currentGpaData     []GpaScore
	currentCsatData    map[string]CsatScore
	finalScore         float64
	scoreSource        string
	functionDispatcher map[string]func(params json.RawMessage) error
}

// NewScoreCalculator 는 ScoreCalculator의 생성자 함수입니다.
func NewScoreCalculator(gpaScores []GpaScore, csatScores map[string]CsatScore) *ScoreCalculator {
	sc := &ScoreCalculator{
		originalGpaScores:  gpaScores,
		originalCsatScores: csatScores,
	}

	sc.functionDispatcher = map[string]func(params json.RawMessage) error{
		// GPA Functions
		"FILTER_SUBJECTS_BY_CATEGORY":       sc.filterSubjectsByCategory,
		"SELECT_TOP_N_UNITS_PER_CATEGORY":   sc.selectTopNUnitsPerCategory,
		"APPLY_GRADE_TO_SCORE_MAP":          sc.applyGradeToScoreMap,
		"APPLY_GRADE_LEVEL_WEIGHTING":       sc.applyGradeLevelWeighting,
		"CALCULATE_WEIGHTED_AVERAGE":        sc.calculateWeightedAverage,
		"APPLY_JINRO_SUBJECT_BONUS_PERCENT": sc.applyJinroSubjectBonusPercent,

		// CSAT Functions
		"UTILIZE_CSAT_SCORE_TYPE":        sc.utilizeCsatScoreType,
		"APPLY_ABSOLUTE_SCORE_POLICY":    sc.applyAbsoluteScorePolicy,
		"APPLY_SUBJECT_WEIGHTING":        sc.applySubjectWeighting,
		"SELECT_TOP_N_AREAS":             sc.selectTopNAreas,
		"CALCULATE_ARITHMETIC_AVERAGE":   sc.calculateArithmeticAverage,
		"APPLY_SCORE_ADJUSTMENT_PERCENT": sc.applyScoreAdjustmentPercent,

		// 명세서에 있었지만, 핵심 기능 외의 함수들 (필요 시 구현)
		// "APPLY_ATTENDANCE_SCORE": sc.applyAttendanceScore,
		// "APPLY_PERCENTAGE_WEIGHTING": sc.applyPercentageWeighting,
	}
	return sc
}

// Calculate 는 JSON 스키마를 받아 최종 점수를 계산합니다.
func (sc *ScoreCalculator) Calculate(scheme CalculationScheme) (float64, error) {
	// (이전 코드와 동일 - 변경 없음)
	sc.scoreSource = scheme.Details.ScoreSource
	pipeline := scheme.Details.Pipeline

	if sc.scoreSource == "" || len(pipeline) == 0 {
		return 0, fmt.Errorf("스키마에 score_source 또는 calculation_pipeline이 없습니다")
	}

	sc.finalScore = 0
	if sc.scoreSource == "GPA" {
		sc.currentGpaData = make([]GpaScore, len(sc.originalGpaScores))
		copy(sc.currentGpaData, sc.originalGpaScores)
	} else if sc.scoreSource == "CSAT" {
		sc.currentCsatData = make(map[string]CsatScore)
		for k, v := range sc.originalCsatScores {
			sc.currentCsatData[k] = v
		}
	} else {
		return 0, fmt.Errorf("알 수 없는 score_source: %s", sc.scoreSource)
	}

	fmt.Printf("\n--- '%s' 점수 계산 시작 (Source: %s) ---\n", scheme.AdmissionType, sc.scoreSource)

	sort.SliceStable(pipeline, func(i, j int) bool {
		return pipeline[i].Step < pipeline[j].Step
	})

	for _, step := range pipeline {
		if handler, ok := sc.functionDispatcher[step.FuncName]; ok {
			fmt.Printf("  [Step %d] 실행: %s\n", step.Step, step.FuncName)
			err := handler(step.Parameters)
			if err != nil {
				return 0, fmt.Errorf("Step %d (%s) 실행 중 오류: %w", step.Step, step.FuncName, err)
			}
		} else {
			fmt.Printf("  - 경고: '%s' 함수는 ScoreCalculator에 아직 구현되지 않았습니다. 건너뜁니다.\n", step.FuncName)
		}
	}

	fmt.Printf("--- 계산 완료: 최종 점수 = %.4f ---\n", sc.finalScore)
	return sc.finalScore, nil
}

// --- GPA 관련 개별 기능 메소드들 ---

func (sc *ScoreCalculator) filterSubjectsByCategory(params json.RawMessage) error {
	// (이전 코드와 동일 - 변경 없음)
	var p struct {
		Categories []string `json:"categories"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}
	categorySet := make(map[string]bool)
	for _, cat := range p.Categories {
		categorySet[cat] = true
	}
	var filtered []GpaScore
	for _, score := range sc.currentGpaData {
		if categorySet[score.Category] {
			filtered = append(filtered, score)
		}
	}
	sc.currentGpaData = filtered
	return nil
}

func (sc *ScoreCalculator) selectTopNUnitsPerCategory(params json.RawMessage) error {
	// (이전 코드와 동일 - 변경 없음)
	var p struct {
		CategoryNCounts map[string]int `json:"category_n_counts"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}
	subjectsByCategory := make(map[string][]GpaScore)
	for _, score := range sc.currentGpaData {
		subjectsByCategory[score.Category] = append(subjectsByCategory[score.Category], score)
	}
	var topSubjects []GpaScore
	for category, subjects := range subjectsByCategory {
		sort.SliceStable(subjects, func(i, j int) bool {
			if subjects[i].Rank != subjects[j].Rank {
				return subjects[i].Rank < subjects[j].Rank
			}
			return subjects[i].Units > subjects[j].Units
		})
		n := p.CategoryNCounts[category]
		if n > len(subjects) {
			n = len(subjects)
		}
		topSubjects = append(topSubjects, subjects[:n]...)
	}
	sc.currentGpaData = topSubjects
	return nil
}

func (sc *ScoreCalculator) applyGradeToScoreMap(params json.RawMessage) error {
	// (이전 코드와 동일 - 변경 없음)
	var p struct {
		Map map[string]float64 `json:"map"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}
	gradeMap := make(map[int]float64)
	for k, v := range p.Map {
		rank, err := strconv.Atoi(k)
		if err != nil {
			return err
		}
		gradeMap[rank] = v
	}
	for i := range sc.currentGpaData {
		if score, ok := gradeMap[sc.currentGpaData[i].Rank]; ok {
			sc.currentGpaData[i].ConvertedScore = score
		} else {
			sc.currentGpaData[i].ConvertedScore = 0
		}
	}
	return nil
}

func (sc *ScoreCalculator) applyGradeLevelWeighting(params json.RawMessage) error {
	var p struct {
		Weights map[string]float64 `json:"weights"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}

	weightsMap := make(map[int]float64)
	for k, v := range p.Weights {
		year, err := strconv.Atoi(k)
		if err != nil {
			return err
		}
		weightsMap[year] = v / 100.0 // 100% -> 1.0으로 변환
	}

	for i := range sc.currentGpaData {
		if weight, ok := weightsMap[sc.currentGpaData[i].Year]; ok {
			sc.currentGpaData[i].YearlyWeight = weight
		} else {
			sc.currentGpaData[i].YearlyWeight = 1.0 // 가중치가 없는 학년은 1.0으로 처리
		}
	}
	return nil
}

func (sc *ScoreCalculator) calculateWeightedAverage(params json.RawMessage) error {
	var totalWeightedScore float64
	var totalWeight float64

	for i := range sc.currentGpaData {
		// YearlyWeight가 설정되어 있지 않으면 1.0 (가중치 없음)으로 간주
		if sc.currentGpaData[i].YearlyWeight == 0 {
			sc.currentGpaData[i].YearlyWeight = 1.0
		}

		finalWeight := sc.currentGpaData[i].Units * sc.currentGpaData[i].YearlyWeight
		sc.currentGpaData[i].FinalWeight = finalWeight

		totalWeightedScore += sc.currentGpaData[i].ConvertedScore * finalWeight
		totalWeight += finalWeight
	}

	if totalWeight > 0 {
		sc.finalScore = totalWeightedScore / totalWeight
	} else {
		sc.finalScore = 0
	}
	return nil
}

func (sc *ScoreCalculator) applyJinroSubjectBonusPercent(params json.RawMessage) error {
	var p struct {
		BonusTiers []struct {
			MinACount    int     `json:"min_A_count"`
			BonusPercent float64 `json:"bonus_percent"`
		} `json:"bonus_tiers"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}
	if len(p.BonusTiers) == 0 {
		return nil
	}

	aCount := 0
	for _, score := range sc.originalGpaScores {
		if score.Category == "진로선택" && score.Achievement == "A" {
			aCount++
		}
	}

	bonusPercent := 0.0
	// 보너스 구간을 A 개수 기준 내림차순으로 정렬
	sort.Slice(p.BonusTiers, func(i, j int) bool {
		return p.BonusTiers[i].MinACount > p.BonusTiers[j].MinACount
	})

	for _, tier := range p.BonusTiers {
		if aCount >= tier.MinACount {
			bonusPercent = tier.BonusPercent
			break // 가장 먼저 충족되는 상위 구간의 보너스를 적용하고 종료
		}
	}

	if bonusPercent > 0 {
		sc.finalScore *= (1 + bonusPercent/100.0)
	}
	return nil
}

// --- CSAT 관련 개별 기능 메소드들 ---

func (sc *ScoreCalculator) utilizeCsatScoreType(params json.RawMessage) error {
	var p struct {
		ScoreType string `json:"score_type"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}

	for subject, score := range sc.currentCsatData {
		var newScore CsatScore = score
		switch p.ScoreType {
		case "백분위":
			newScore.ConvertedScore = float64(score.Percentile)
		case "표준점수":
			newScore.ConvertedScore = float64(score.StandardScore)
		default:
			return fmt.Errorf("지원하지 않는 score_type: %s", p.ScoreType)
		}
		sc.currentCsatData[subject] = newScore
	}
	return nil
}

func (sc *ScoreCalculator) applyAbsoluteScorePolicy(params json.RawMessage) error {
	var p struct {
		Subject string             `json:"subject"`
		Map     map[string]float64 `json:"map"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}

	gradeMap := make(map[int]float64)
	for k, v := range p.Map {
		rank, err := strconv.Atoi(k)
		if err != nil {
			return err
		}
		gradeMap[rank] = v
	}

	if scoreData, ok := sc.currentCsatData[p.Subject]; ok {
		if score, found := gradeMap[scoreData.Rank]; found {
			scoreData.ConvertedScore = score
			sc.currentCsatData[p.Subject] = scoreData
		}
	} else {
		return fmt.Errorf("수능 성적에 '%s' 과목이 없습니다", p.Subject)
	}
	return nil
}

func (sc *ScoreCalculator) applySubjectWeighting(params json.RawMessage) error {
	var p struct {
		Weights map[string]float64 `json:"weights"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}

	totalScore := 0.0
	for subject, weight := range p.Weights {
		if scoreData, ok := sc.currentCsatData[subject]; ok {
			totalScore += scoreData.ConvertedScore * (weight / 100.0)
		}
	}
	sc.finalScore = totalScore
	return nil
}

func (sc *ScoreCalculator) selectTopNAreas(params json.RawMessage) error {
	var p struct {
		N        int      `json:"n"`
		AreaPool []string `json:"area_pool"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}

	var availableScores []CsatScore
	for _, area := range p.AreaPool {
		if score, ok := sc.currentCsatData[area]; ok {
			// 맵에서 직접 가져온 값은 수정이 안되므로, area 이름을 추가해서 복사본을 만듬
			tempScore := score
			tempScore.SubjectName = area // 과목명을 복원 (맵의 키)
			availableScores = append(availableScores, tempScore)
		}
	}

	// 환산점수 기준 내림차순 정렬
	sort.SliceStable(availableScores, func(i, j int) bool {
		return availableScores[i].ConvertedScore > availableScores[j].ConvertedScore
	})

	// 상위 N개 선택
	if p.N > len(availableScores) {
		p.N = len(availableScores)
	}
	topScores := availableScores[:p.N]

	// currentCsatData를 상위 N개 과목으로 재구성
	newCsatData := make(map[string]CsatScore)
	for _, score := range topScores {
		newCsatData[score.SubjectName] = score
	}
	sc.currentCsatData = newCsatData
	return nil
}

func (sc *ScoreCalculator) calculateArithmeticAverage(params json.RawMessage) error {
	if len(sc.currentCsatData) == 0 {
		sc.finalScore = 0
		return nil
	}

	var sum float64
	for _, score := range sc.currentCsatData {
		sum += score.ConvertedScore
	}
	sc.finalScore = sum / float64(len(sc.currentCsatData))
	return nil
}

func (sc *ScoreCalculator) applyScoreAdjustmentPercent(params json.RawMessage) error {
	var p struct {
		Adjustments []struct {
			Subject      string   `json:"subject"`
			Condition    []string `json:"condition_value"`
			BonusPercent float64  `json:"bonus_percent"`
		} `json:"adjustments"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return err
	}

	for _, adj := range p.Adjustments {
		if scoreData, ok := sc.currentCsatData[adj.Subject]; ok {
			// 학생의 선택과목이 조건에 맞는지 확인
			isConditionMet := false
			for _, condValue := range adj.Condition {
				if scoreData.SubjectName == condValue {
					isConditionMet = true
					break
				}
			}

			if isConditionMet {
				scoreData.ConvertedScore *= (1 + adj.BonusPercent/100.0)
				sc.currentCsatData[adj.Subject] = scoreData
			}
		}
	}
	return nil
}
