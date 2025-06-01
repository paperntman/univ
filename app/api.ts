// 이 파일은 애플리케이션의 백엔드 API 통신을 담당합니다.
// API_BASE_URL을 통해 요청 경로를 구성하고, 실제 fetch를 사용하여 데이터를 요청합니다.
// 과목 목록, 등급컷 정보 등을 가져오는 함수들을 포함합니다.

import {
    InitialUniversityData, DepartmentSuggestion, FilteredUniversity,
    AdmissionTypeFilterKey, UniversitySidebarDetails, ApiSubjectInfo, SuneungExamCutInfoFromAPI,
    UserAllGrades, UserSuneungGrades // FilteredUniversityAdmissionResults, UserNaesinGrades, UserNaesinSubject, ExamGradeCutSubjectData, ExamGradeCutMappingItem 사용되지 않지만 타입 정의 파일에는 존재
} from './types';
import { API_BASE_URL } from './config';
import { showLoading } from './uiUtils';
import { setCurrentSuneungExamCutInfo, setNaesinSubjectsFromApi, setSuneungExplorerSubjectsFromApi, setSuneungKoreanOptionsFromApi, setSuneungMathOptionsFromApi } from './state';
// collectSuneungGradesFromForm는 api.ts에서 직접 사용하지 않도록 변경

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

// GET /api/subjects?type=... (과목 목록)
async function fetchSubjectList(type: "naesin" | "suneung_국어" | "suneung_수학" | "suneung_탐구"): Promise<ApiSubjectInfo[]> {
    // showLoading은 fetchAllSubjectLists에서 한 번만 호출
    try {
        const response = await fetch(`${API_BASE_URL}/subjects?type=${type}`);
        const data = await handleResponse<ApiSubjectInfo[]>(response, `${type} 과목 목록을 가져오는 데 실패했습니다.`);
        return data || [];
    } catch (error) {
        console.error(`Error fetching ${type} subjects:`, error);
        // alert는 fetchAllSubjectLists에서 포괄적으로 처리 가능
        return [];
    }
}

// 모든 필요한 과목 목록을 한 번에 가져와 상태에 저장하는 함수
export async function fetchAllSubjectLists() {
    showLoading(true);
    try {
        const [naesin, korean, math, explorer] = await Promise.all([
            fetchSubjectList("naesin"),
            fetchSubjectList("suneung_국어"),
            fetchSubjectList("suneung_수학"),
            fetchSubjectList("suneung_탐구")
        ]);
        setNaesinSubjectsFromApi(naesin);
        setSuneungKoreanOptionsFromApi(korean);
        setSuneungMathOptionsFromApi(math);
        setSuneungExplorerSubjectsFromApi(explorer);
    } catch (error) {
        console.error("Error fetching all subject lists:", error);
        alert("전체 과목 목록을 가져오는 중 오류가 발생했습니다.");
        // 일부만 성공했을 수 있으므로, 각 set 함수는 호출됨
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
