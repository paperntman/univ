// 이 파일은 애플리케이션의 백엔드 API 통신을 담당합니다.
// API_BASE_URL을 통해 요청 경로를 구성하고, 실제 fetch를 사용하여 데이터를 요청합니다.
// 과목 목록, 등급컷 정보 등을 가져오는 함수들을 포함합니다.

import {
    InitialUniversityData, DepartmentSuggestion, FilteredUniversity,
    AdmissionTypeFilterKey, UniversitySidebarDetails, ApiSubjectInfo, SuneungExamCutInfoFromAPI,
    UserAllGrades, UserSuneungGrades 
} from './types';
import { API_BASE_URL } from './config';
import { showLoading } from './uiUtils';
import { 
    setCurrentSuneungExamCutInfo, 
    setNaesinAllRawSubjectsFromApi, // 이름 변경됨
    setSuneungExplorerSubjectsFromApi, 
    setSuneungKoreanOptionsFromApi, 
    setSuneungMathOptionsFromApi,
    setCurriculumAreasFromApi,
    setCurriculumClassificationsFromApi
} from './state';

// Helper function to handle fetch responses
async function handleResponse<T>(response: Response, errorMessage: string): Promise<T | null> {
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`${errorMessage}: ${response.status} ${response.statusText}`, errorText);
        alert(`${errorMessage} (오류: ${response.status})`);
        return null;
    }
    try {
        return await response.json() as T;
    } catch (e) {
        console.error(`JSON 파싱 오류: ${errorMessage}`, e);
        alert(`서버 응답 처리 중 오류가 발생했습니다. (JSON 파싱 실패)`);
        return null;
    }
}

// GET /map/initial-data (초기 대학 마커 데이터)
export async function fetchInitialMapData(): Promise<InitialUniversityData[]> {
    showLoading(true);
    try {
        const response = await fetch(`/map/initial-data`);
        const data = await handleResponse<InitialUniversityData[]>(response, "초기 대학 마커 데이터를 불러오는 데 실패했습니다.");
        return data || [];
    } catch (error) {
        console.error("Error fetching initial map data:", error);
        alert("초기 대학 마커 데이터를 불러오는 중 네트워크 오류가 발생했습니다.");
        return [];
    } finally {
        showLoading(false);
    }
}

// GET /api/departments/suggest (학과 검색 자동완성)
export async function fetchDepartmentSuggestionsApi(query: string): Promise<DepartmentSuggestion[]> {
    // uiUtils에서 로딩 관리를 하므로 여기서는 showLoading 호출 안 함
    try {
        const response = await fetch(`${API_BASE_URL}/departments/suggest?query=${encodeURIComponent(query)}`);
        const data = await handleResponse<DepartmentSuggestion[]>(response, "학과 추천 목록을 가져오는 데 실패했습니다.");
        return data || [];
    } catch (error) {
        console.error("Error fetching department suggestions:", error);
        // alert 호출은 uiUtils의 호출부에서 고려
        return [];
    }
}

// GET /api/subjects?type=... (과목 목록 등)
// type: "naesin_curriculum_classifications", "naesin_curriculums_for_classification?classificationCode=CODE", "naesin_curriculum_areas", "naesin_subjects_all", "naesin_subjects_for_curriculum?curriculumCode=CODE", "suneung_국어", "suneung_수학", "suneung_탐구"
async function fetchGenericSubjectList(type: string, params?: Record<string, string>): Promise<ApiSubjectInfo[]> {
    // showLoading은 fetchAllSubjectLists 또는 개별 호출 지점에서 관리
    try {
        let url = `${API_BASE_URL}/subjects?type=${type}`;
        if (params) {
            url += `&${new URLSearchParams(params).toString()}`;
        }
        const response = await fetch(url);
        const data = await handleResponse<ApiSubjectInfo[]>(response, `${type} 목록을 가져오는 데 실패했습니다.`);
        return data || [];
    } catch (error) {
        console.error(`Error fetching ${type} list:`, error);
        // alert는 호출부에서 포괄적으로 처리
        return [];
    }
}

// 교과구분종류 목록 가져오기
export async function fetchCurriculumClassificationsApi(): Promise<ApiSubjectInfo[]> {
    return fetchGenericSubjectList("naesin_curriculum_classifications");
}

// 특정 교과구분종류에 해당하는 교과 목록 가져오기
export async function fetchCurriculumsForClassificationApi(classificationCode: string): Promise<ApiSubjectInfo[]> {
    return fetchGenericSubjectList("naesin_curriculums_for_classification", { classificationCode });
}

// 교과 영역 목록 가져오기 (이것은 특정 교과구분종류 하위의 교과가 아니라, 전체 교과 목록일 수 있음 - API 명세 확인 필요)
// 현재 로직에서는 fetchCurriculumsForClassificationApi를 사용하므로, 이 함수는 중복될 수 있음.
// 만약 독립적인 전체 '교과' 목록이 필요하다면 유지.
export async function fetchCurriculumAreasApi(): Promise<ApiSubjectInfo[]> {
    return fetchGenericSubjectList("naesin_curriculum_areas");
}

// 특정 교과 영역에 해당하는 과목 목록 가져오기
export async function fetchSubjectsForCurriculumApi(curriculumCode: string): Promise<ApiSubjectInfo[]> {
    return fetchGenericSubjectList("naesin_subjects_for_curriculum", { curriculumCode });
}

// 모든 내신 과목의 원시 목록 가져오기 (필터링 전)
async function fetchAllNaesinRawSubjectsApi(): Promise<ApiSubjectInfo[]> {
    return fetchGenericSubjectList("naesin_subjects_all");
}


// 모든 필요한 과목 목록 및 교과 영역을 한 번에 가져와 상태에 저장하는 함수
export async function fetchAllSubjectLists() {
    showLoading(true);
    try {
        const [curriculumClassifications, curriculumAreas, allNaesinRawSubjects, koreanOptions, mathOptions, explorerOptions] = await Promise.all([
            fetchCurriculumClassificationsApi(),
            fetchCurriculumAreasApi(), // 전체 교과 목록 (또는 교과구분별 교과를 여기서 한번에 다 가져올 수도 있음)
            fetchAllNaesinRawSubjectsApi(), // 모든 내신 '과목'을 가져옴
            fetchGenericSubjectList("suneung_국어"),
            fetchGenericSubjectList("suneung_수학"),
            fetchGenericSubjectList("suneung_탐구")
        ]);
        setCurriculumClassificationsFromApi(curriculumClassifications);
        setCurriculumAreasFromApi(curriculumAreas); // 이 부분은 fetchCurriculumsForClassificationApi와 역할 분담 고려
        setNaesinAllRawSubjectsFromApi(allNaesinRawSubjects); 
        setSuneungKoreanOptionsFromApi(koreanOptions);
        setSuneungMathOptionsFromApi(mathOptions);
        setSuneungExplorerSubjectsFromApi(explorerOptions);
    } catch (error) {
        console.error("Error fetching all subject/curriculum lists:", error);
        alert("전체 과목/교과/교과구분 목록을 가져오는 중 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}

// GET /api/exam-grade-cuts?year=YYYY&month=MM (수능 등급컷) - 순수 fetch 함수
async function fetchExamGradeCutsApi(year: string, month: string): Promise<SuneungExamCutInfoFromAPI | null> {
    // showLoading은 fetchSuneungExamCutInfo 에서 호출
    try {
        const response = await fetch(`${API_BASE_URL}/exam-grade-cuts?year=${year}&month=${month}`);
        return await handleResponse<SuneungExamCutInfoFromAPI>(response, "수능 등급컷 정보를 가져오는 데 실패했습니다.");
    } catch (error) {
        console.error("Error fetching Suneung exam cut info (API call):", error);
        alert("수능 등급컷 정보 조회 중 네트워크 오류가 발생했습니다.");
        return null;
    }
}


// 수능 시험 등급컷 정보를 API로부터 가져와 상태에 저장하는 함수
export async function fetchSuneungExamCutInfo(examIdentifier: string): Promise<void> {
    if (!examIdentifier) {
        setCurrentSuneungExamCutInfo(null);
        return;
    }
    const [yearMonth, ] = examIdentifier.split('_'); // type은 현재 사용 안함
    const year = yearMonth.substring(0, 4);
    const month = yearMonth.substring(4, 6);

    if (!year || !month) {
        console.error("Invalid examId format for fetching cut info:", examIdentifier);
        setCurrentSuneungExamCutInfo(null);
        alert("잘못된 시험 식별자입니다.");
        return;
    }

    showLoading(true);
    try {
        const cutInfo = await fetchExamGradeCutsApi(year, month);
        setCurrentSuneungExamCutInfo(cutInfo);
    } catch (error) {
        // fetchExamGradeCutsApi 내부에서 이미 console.error 및 alert 처리
        setCurrentSuneungExamCutInfo(null);
    } finally {
        showLoading(false);
    }
}

// POST /api/universities/filter (대학 필터링)
export async function fetchFilteredUniversitiesApi(
    payload: {
        userGrades: { naesin: any, suneung: UserSuneungGrades }, // naesin은 index.tsx에서 변환된 API 형식
        filterCriteria: { departmentKeywords: string | null, admissionType: AdmissionTypeFilterKey, scoreDifferenceTolerance?: number }
    }
): Promise<FilteredUniversity[]> {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/universities/filter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await handleResponse<FilteredUniversity[]>(response, "대학 정보 필터링에 실패했습니다.");
        return data || [];
    } catch (error) {
        console.error("Error fetching filtered universities:", error);
        alert("대학 정보 필터링 중 네트워크 오류가 발생했습니다.");
        return [];
    } finally {
        showLoading(false);
    }
}

// GET /api/universities/{universityId}/sidebar-details
export async function fetchUniversitySidebarDetailsApi(
    universityId: string,
    departmentName: string,
    admissionTypeFilter: AdmissionTypeFilterKey,
    // userGradesSnapshot?: UserAllGrades // 필요시 userGrades 전달 확장 가능성
): Promise<UniversitySidebarDetails | null> {
    showLoading(true);
    try {
        // 실제 백엔드는 userGradesSnapshot 같은 것을 받을 수 있음
        // const queryParams = new URLSearchParams({
        //     departmentName,
        //     admissionTypeFilter,
        //     ...(userGradesSnapshot && { userGrades: JSON.stringify(userGradesSnapshot) })
        // });
        const url = `${API_BASE_URL}/universities/${universityId}/sidebar-details?departmentName=${encodeURIComponent(departmentName)}&admissionTypeFilter=${encodeURIComponent(admissionTypeFilter)}`;
        
        const response = await fetch(url);
        return await handleResponse<UniversitySidebarDetails>(response, "대학 상세 정보를 불러오는 데 실패했습니다.");
    } catch (error) {
        console.error("Exception fetching sidebar details:", error);
        alert("대학 상세 정보 조회 중 네트워크 오류가 발생했습니다.");
        return null;
    } finally {
        showLoading(false);
    }
}