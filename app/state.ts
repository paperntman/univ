// 이 파일은 애플리케이션의 전역 상태를 관리합니다.
// 지도 인스턴스, 마커 레이어 그룹, 현재 필터링된 대학 목록, 사용자 선택 학과,
// 점수차 허용치, 입시 전형 필터, 사이드바 데이터, 사용자 성적 데이터,
// API로부터 가져온 과목 목록 및 등급컷 정보 등의 상태 변수와 이를 업데이트하는 함수를 포함합니다.

import {
    UserAllGrades,
    UserNaesinGrades,
    UserSuneungGrades,
    UserNaesinYearData,
    UserNaesinSemesterData,
    FilteredUniversity,
    UniversitySidebarDetails,
    AdmissionTypeFilterKey,
    ApiSubjectInfo, // NaesinSubjectFromAPI에서 이름 변경됨
    SuneungExamCutInfoFromAPI,
    UserNaesinSubject, // 사용되지 않지만, 타입 정의 파일에는 존재
    UserSuneungSubjectDetailScore, // 사용되지 않지만, 타입 정의 파일에는 존재
    UserSuneungSubjectExplorerScore // 사용되지 않지만, 타입 정의 파일에는 존재
} from './types';
import { SUNEUNG_EXPLORER_SUBJECTS_STATIC, SUNEUNG_KOREAN_OPTIONS_STATIC, SUNEUNG_MATH_OPTIONS_STATIC } from './config';

// --- 상태 변수 ---
export let map: any | null = null; // Leaflet 지도 인스턴스
export function setMap(leafletMap: any) { map = leafletMap; } // 지도 인스턴스 설정

export let markersLayerGroup: any = null; // Leaflet 마커 레이어 그룹
export function setMarkersLayerGroup(group: any) { markersLayerGroup = group; } // 마커 레이어 그룹 설정

export let currentFilteredUniversities: FilteredUniversity[] = []; // 현재 필터링 조건에 맞는 대학 목록
export function setCurrentFilteredUniversities(universities: FilteredUniversity[]) { // 필터링된 대학 목록 설정
    currentFilteredUniversities = universities;
}

export let selectedDepartment: string | null = null; // 사용자가 선택한 학과명
export function setSelectedDepartment(department: string | null) { // 선택된 학과명 설정
    selectedDepartment = department;
}

export let currentScoreDifferenceTolerance: number = 10; // 현재 설정된 점수차 허용치 (기본값 10)
export function setCurrentScoreDifferenceTolerance(tolerance: number) { // 점수차 허용치 설정
    currentScoreDifferenceTolerance = tolerance;
}

export let currentAdmissionTypeFilter: AdmissionTypeFilterKey = '경쟁률'; // 현재 선택된 입시 전형 필터 (기본값 '경쟁률')
export function setCurrentAdmissionTypeFilter(filter: AdmissionTypeFilterKey) { // 입시 전형 필터 설정
    currentAdmissionTypeFilter = filter;
}

export let currentSidebarData: UniversitySidebarDetails | null = null; // 현재 사이드바에 표시될 대학 상세 정보
export function setCurrentSidebarData(data: UniversitySidebarDetails | null) { // 사이드바 데이터 설정
    currentSidebarData = data;
}

export let activeDepartmentSuggestionIndex: number = -1; // 학과 검색 자동완성 목록에서 현재 활성화된 항목 인덱스
export function setActiveDepartmentSuggestionIndex(index: number) { // 활성화된 추천 항목 인덱스 설정
    activeDepartmentSuggestionIndex = index;
}
export let lastOpenedUniversityId: string | null = null; // 마지막으로 열었던 대학의 ID (사이드바 관련)
export function setLastOpenedUniversityId(id: string | null) { // 마지막으로 열었던 대학 ID 설정
    lastOpenedUniversityId = id;
}


// --- 성적 관련 상태 ---
function createInitialNaesinSemester(): UserNaesinSemesterData { // 초기 내신 학기 데이터 생성
    return { subjects: [] };
}

function createInitialNaesinYear(): UserNaesinYearData { // 초기 내신 학년 데이터 생성
    return {
        semester1: createInitialNaesinSemester(),
        semester2: createInitialNaesinSemester(),
    };
}

function initializeBaseUserNaesinGrades(): UserNaesinGrades { // 기본 사용자 내신 성적 구조 초기화
     return {
        year1: createInitialNaesinYear(),
        year2: createInitialNaesinYear(),
        year3: createInitialNaesinYear(), // 3학년 데이터도 초기화 (1학기만 사용 예정)
    };
}

function initializeBaseUserSuneungGrades(): UserSuneungGrades { // 기본 사용자 수능 성적 구조 초기화
    // 기본 선택 과목 설정 (config에서 가져오거나 첫 번째 옵션 사용)
    const defaultKoreanOption = SUNEUNG_KOREAN_OPTIONS_STATIC[0]?.subjectName || "";
    const defaultMathOption = SUNEUNG_MATH_OPTIONS_STATIC[0]?.subjectName || "";
    const defaultExplorer1 = SUNEUNG_EXPLORER_SUBJECTS_STATIC[0];
    const defaultExplorer2 = SUNEUNG_EXPLORER_SUBJECTS_STATIC[1];

    return {
        examYear: 2024, // 기본 응시 연도
        examMonth: 11,  // 기본 응시 월 (수능)
        examIdentifierForCutInfo: '202411_csat', // 등급컷 정보 요청용 식별자 (기본 2024년 11월 수능)
        subjects: {
            korean: { selectedOption: defaultKoreanOption, rawScore: null, standardScore: null, percentile: null, grade: null },
            math: { selectedOption: defaultMathOption, rawScore: null, standardScore: null, percentile: null, grade: null },
            english: { rawScore: null, standardScore: null, percentile: null, grade: null },
            history: { rawScore: null, standardScore: null, percentile: null, grade: null },
            explorer1: { subjectCode: defaultExplorer1?.subjectCode, subjectName: defaultExplorer1?.subjectName, rawScore: null, standardScore: null, percentile: null, grade: null },
            explorer2: { subjectCode: defaultExplorer2?.subjectCode, subjectName: defaultExplorer2?.subjectName, rawScore: null, standardScore: null, percentile: null, grade: null },
        }
    };
}

export function initializeUserAllGrades(): UserAllGrades { // 사용자의 모든 성적(내신+수능) 초기화
    return {
        naesin: initializeBaseUserNaesinGrades(),
        suneung: initializeBaseUserSuneungGrades(),
    };
}

export let userAllGrades: UserAllGrades = initializeUserAllGrades(); // 사용자 전체 성적 상태 변수
export function setUserAllGrades(grades: UserAllGrades) { // 사용자 전체 성적 설정
    userAllGrades = grades;
}
export function updateUserNaesinGrades(naesinGrades: UserNaesinGrades) { // 사용자 내신 성적 부분 업데이트
    userAllGrades.naesin = naesinGrades;
}
export function updateUserSuneungGrades(suneungGrades: UserSuneungGrades) { // 사용자 수능 성적 부분 업데이트
    userAllGrades.suneung = suneungGrades;
}

// --- API로부터 가져온 데이터 상태 ---
export let naesinSubjectsFromApi: ApiSubjectInfo[] = []; // API에서 가져온 내신 과목 목록
export function setNaesinSubjectsFromApi(subjects: ApiSubjectInfo[]) { // 내신 과목 목록 설정
    naesinSubjectsFromApi = subjects;
}

export let suneungKoreanOptionsFromApi: ApiSubjectInfo[] = SUNEUNG_KOREAN_OPTIONS_STATIC; // API에서 가져온 수능 국어 선택과목 목록 (정적 데이터로 초기화)
export function setSuneungKoreanOptionsFromApi(subjects: ApiSubjectInfo[]) { // 수능 국어 선택과목 목록 설정
    suneungKoreanOptionsFromApi = subjects;
}

export let suneungMathOptionsFromApi: ApiSubjectInfo[] = SUNEUNG_MATH_OPTIONS_STATIC; // API에서 가져온 수능 수학 선택과목 목록 (정적 데이터로 초기화)
export function setSuneungMathOptionsFromApi(subjects: ApiSubjectInfo[]) { // 수능 수학 선택과목 목록 설정
    suneungMathOptionsFromApi = subjects;
}

export let suneungExplorerSubjectsFromApi: ApiSubjectInfo[] = SUNEUNG_EXPLORER_SUBJECTS_STATIC; // API에서 가져온 수능 탐구 과목 목록 (정적 데이터로 초기화)
export function setSuneungExplorerSubjectsFromApi(subjects: ApiSubjectInfo[]) { // 수능 탐구 과목 목록 설정
    suneungExplorerSubjectsFromApi = subjects;
}


export let currentSuneungExamCutInfo: SuneungExamCutInfoFromAPI | null = null; // 현재 선택된 수능 시험의 등급컷 정보
export function setCurrentSuneungExamCutInfo(info: SuneungExamCutInfoFromAPI | null) { // 수능 시험 등급컷 정보 설정
    currentSuneungExamCutInfo = info;
}
