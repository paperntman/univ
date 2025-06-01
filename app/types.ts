// 이 파일은 애플리케이션 전반에서 사용되는 TypeScript 타입 정의를 포함합니다.
// 데이터 구조, API 응답 형태, 상태 관리 객체 등의 타입을 명시하여 코드의 안정성과 가독성을 높입니다.

// L (Leaflet)이 전역적으로 사용 가능하거나 'leaflet'에서 임포트 되었는지 확인합니다.
// declare var L: any; // Leaflet 라이브러리 타입 선언 (필요시)

// --- 핵심 타입 ---
export interface Location { // 위치 정보 (위도, 경도)
    latitude: number;
    longitude: number;
}

export interface UniversityBase { // 대학 기본 정보
    universityId: string; // 대학 고유 ID
    universityName: string; // 대학명
    location: Location; // 대학 위치
}

export interface InitialUniversityData extends UniversityBase {} // 초기 로드되는 대학 데이터 (지도 마커용)

// --- 성적 입력 타입 ---
export interface UserNaesinSubject { // 사용자 내신 과목 정보 (UI 및 내부 상태용)
    id: string; // UI에서 동적 행 관리를 위한 고유 ID
    subjectCode: string | null; // 과목 코드 (API에서 사용)
    subjectName: string; // 과목명 (표시 및 코드 없을 경우 매칭용)
    grade: number | null; // 등급
    credits: number | null; // 이수단위
    rawScore?: number | null; // 원점수 (선택)
    subjectMean?: number | null; // 과목 평균 (선택)
    stdDev?: number | null; // 표준편차 (선택)
}

export interface UserNaesinSemesterData { // 사용자 내신 학기별 데이터
    subjects: UserNaesinSubject[]; // 해당 학기 과목 목록
}

export interface UserNaesinYearData { // 사용자 내신 학년별 데이터
    semester1: UserNaesinSemesterData; // 1학기
    semester2: UserNaesinSemesterData; // 2학기
}

// 내신 성적의 내부 상태 표현
export interface UserNaesinGrades {
    year1: UserNaesinYearData; // 1학년
    year2: UserNaesinYearData; // 2학년
    year3: UserNaesinYearData; // 3학년
}

// 내신 성적의 API 표현 (POST /universities/filter 요청 시 사용)
// 키는 "1-1", "1-2" 등 학년-학기 형태
export type ApiNaesinGrades = Record<string, UserNaesinSubject[]>;


export interface UserSuneungSubjectDetailScore { // 사용자 수능 과목별 상세 점수
    selectedOption?: string | null; // 선택 과목 (예: 국어 - "언어와 매체")
    rawScore: number | null; // 원점수
    standardScore?: number | null; // 표준점수
    percentile?: number | null; // 백분위
    grade?: number | null; // 등급
}
export interface UserSuneungSubjectExplorerScore extends UserSuneungSubjectDetailScore { // 사용자 수능 탐구 과목 점수 (과목 코드/명 포함)
    subjectCode?: string | null; // 탐구 과목 코드 (예: "SA01")
    subjectName?: string | null; // 탐구 과목명 (예: "생활과 윤리")
}

// POST /universities/filter 요청 및 내부 상태에서 사용될 수능 성적 구조
export interface UserSuneungGrades {
    examYear: number | null; // 응시 연도
    examMonth: number | null; // 응시 월 (수능은 11, 모의고사는 3,6,9 등)
    examIdentifierForCutInfo: string; // 등급컷 정보 요청을 위한 시험 식별자 (예: "202411_csat")
    subjects: {
        korean?: UserSuneungSubjectDetailScore; // 국어
        math?: UserSuneungSubjectDetailScore;   // 수학
        english?: UserSuneungSubjectDetailScore; // 영어
        history?: UserSuneungSubjectDetailScore; // 한국사
        explorer1?: UserSuneungSubjectExplorerScore; // 탐구1
        explorer2?: UserSuneungSubjectExplorerScore; // 탐구2
    };
}

export interface UserAllGrades { // 사용자의 모든 성적 정보 (내신 + 수능)
    naesin: UserNaesinGrades; // 내신 (내부 표현)
    suneung: UserSuneungGrades; // 수능
}

// --- API 및 필터링 타입 ---
export interface AdmissionTypeSpecificResults { // 전형 유형별 결과
    userCalculatedScore?: number; // 사용자 계산 점수 (대학별 환산 점수)
    lastYearAvgConvertedScore?: number; // 작년 평균 합격자 환산 점수
    lastYear70CutConvertedScore?: number; // 작년 70%컷 합격자 환산 점수 (새 필드)
    suneungMinSatisfied?: boolean; // 수능 최저학력기준 충족 여부
    qualitativeEvaluation?: string; // 정성평가 결과 (학생부종합전형용)
}

export interface CompetitionRateData { // 경쟁률 데이터 (현재는 사용되지 않으나, 확장 가능성 있음)
    rate?: number;
}

// POST /universities/filter 응답의 admissionTypeResults 구조
export interface FilteredUniversityAdmissionResults {
    suneung?: AdmissionTypeSpecificResults; // 수능 위주 전형 결과
    gyogwa?: AdmissionTypeSpecificResults; // 학생부교과 전형 결과
    jonghap?: AdmissionTypeSpecificResults; // 학생부종합 전형 결과
}

export interface FilteredUniversity extends UniversityBase { // 필터링된 대학 정보
    departmentName: string; // 학과명
    admissionTypeResults: FilteredUniversityAdmissionResults; // 전형 유형별 결과
    overallCompetitionRate?: number; // 전체 경쟁률 (새 필드)
}

export interface DepartmentSuggestion { // 학과 검색 추천 결과
    departmentName: string; // 추천 학과명
    keywords: string[]; // 관련 키워드 목록
}

// GET /api/subjects 응답 타입 (내신/수능 과목 목록)
export interface ApiSubjectInfo {
    subjectCode: string; // 과목 코드
    subjectName: string; // 과목명
}

// GET /api/exam-grade-cuts 응답 타입 (수능 시험 등급컷)
export interface ExamGradeCutMappingItem { // 등급컷 매핑 항목 (원점수 -> 표준점수/백분위/등급)
    rawScoreMin?: number; // 원점수 최소 (이상)
    rawScoreMax?: number; // 원점수 최대 (이하)
    standardScore?: number; // 표준점수
    percentile?: number; // 백분위
    grade: number; // 등급
}
export interface ExamGradeCutSubjectOptionData { // 선택과목이 있는 과목의 등급컷 데이터 (예: 국어 - 화법과작문/언어와매체)
    [optionName: string]: ExamGradeCutMappingItem[]; // 예: "언어와 매체": [...]
}
export interface ExamGradeCutSubjectData { // 과목별 등급컷 데이터 (선택과목 있거나 없거나)
    // 예: "국어": { "언어와 매체": [...] } 또는 "영어": [...]
    [subjectName: string]: ExamGradeCutSubjectOptionData | ExamGradeCutMappingItem[];
}
export interface SuneungExamCutInfoFromAPI { // API로부터 받는 수능 시험 등급컷 전체 정보
    examName: string; // 시험명 (예: "2024년 11월 수능")
    subjects: ExamGradeCutSubjectData; // 과목별 등급컷
}


// --- 사이드바 타입 ---
export interface SidebarItem { // 사이드바에 표시될 개별 정보 항목
    label: string; // 정보 레이블 (예: "나의 예상 점수")
    value: string | number; // 정보 값
    link?: string; // 링크 URL (선택, type: "link"와 함께 사용)
    type?: "link"; // 항목 타입 (링크인 경우 명시, API 명세에 따름)
}

export interface SidebarSection { // 사이드바 정보 섹션 (예: "수능 위주 전형")
    sectionTitle: string; // 섹션 제목
    isHighlighted: boolean; // 강조 여부
    items: SidebarItem[]; // 섹션 내 정보 항목 목록
    notes?: string[]; // 추가 참고사항 (선택)
}

export interface UniversitySidebarDetails { // 대학 상세 정보 (사이드바 표시용)
    universityName: string; // 대학명
    departmentName: string; // 학과명
    logoUrl?: string; // 대학 로고 URL (선택)
    sidebarSections: SidebarSection[]; // 정보 섹션 목록
}

// 입시 전형 필터 키 타입 (네비게이션 바 드롭다운 옵션)
export type AdmissionTypeFilterKey = '경쟁률' | '수능' | '종합' | '교과';
