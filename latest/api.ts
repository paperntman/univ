// 이 파일은 애플리케이션의 백엔드 API 통신을 담당합니다.
// API_BASE_URL을 통해 요청 경로를 구성하고, 실제 fetch를 사용하여 데이터를 요청합니다.
// 과목 목록, 등급컷 정보 등을 가져오는 함수들을 포함합니다.

import {
    InitialUniversityData, FilteredUniversity,
    AdmissionTypeFilterKey, UniversitySidebarDetails, ApiSubjectInfo,
    UserAllGrades, UserSuneungGrades // UserSuneungGrades is the internal state type
} from './types';
import { API_BASE_URL } from './config';
import { showLoading } from './uiUtils';
import {
    // setCurrentSuneungExamCutInfo, // Removed
    setNaesinAllRawSubjectsFromApi, // 이름 변경됨
    setSuneungExplorerSubjectsFromApi,
    setSuneungKoreanOptionsFromApi,
    setSuneungMathOptionsFromApi,
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

// GET /api/subjects?type=... (과목 목록 등)
async function fetchGenericSubjectList(type: string, params?: Record<string, string>): Promise<ApiSubjectInfo[]> {
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
        const [curriculumClassifications, allNaesinRawSubjects, koreanOptions, mathOptions, explorerOptions] = await Promise.all([
            fetchCurriculumClassificationsApi(),
            fetchAllNaesinRawSubjectsApi(), 
            fetchGenericSubjectList("suneung_국어"),
            fetchGenericSubjectList("suneung_수학"),
            fetchGenericSubjectList("suneung_탐구")
        ]);
        setCurriculumClassificationsFromApi(curriculumClassifications);
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

// POST /api/universities/filter (대학 필터링)
export async function fetchFilteredUniversitiesApi(
    payload: {
        userGrades: { naesin: any, suneung: any }, // suneung type is 'any' here as it's transformed in index.tsx
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
): Promise<UniversitySidebarDetails | null> {
    showLoading(true);
    try {
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