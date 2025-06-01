// 이 파일은 애플리케이션의 메인 로직을 담당하며, UI 초기화, 이벤트 핸들러 설정, API 호출 조정 등의 기능을 수행합니다.

// TypeScript가 L 전역 변수를 인식하도록 이 줄을 추가합니다 (전역 타입 파일에서 이미 처리되지 않은 경우).
declare var L: any;

// 타입 임포트
import { AdmissionTypeFilterKey, UserNaesinGrades, UserSuneungGrades, ApiNaesinGrades, UserNaesinSubject } from './types';

// 설정 및 상태 관리 임포트
import { API_BASE_URL } from './config'; // API_BASE_URL은 api.ts에서 사용, 여기서는 직접 사용 안 함
import {
    userAllGrades,
    selectedDepartment, setSelectedDepartment,
    currentAdmissionTypeFilter, setCurrentAdmissionTypeFilter,
    currentScoreDifferenceTolerance, setCurrentScoreDifferenceTolerance,
    currentSidebarData, lastOpenedUniversityId,
    map, markersLayerGroup,
    currentFilteredUniversities, setCurrentFilteredUniversities
} from './state';

// API 유틸리티 임포트
import { fetchAllSubjectLists, fetchFilteredUniversitiesApi, fetchSuneungExamCutInfo } from './api';

// 지도 유틸리티 임포트
import { initMap, loadInitialMarkers, updateMarkers } from './mapUtils';

// 사이드바 유틸리티 임포트
import { initializeSidebarControls, openSidebar, closeSidebar, renderSidebarContent as renderSidebarContentUtil } from './sidebarUtils';

// 성적 모달 유틸리티 임포트
import { 
    initializeGradeModalDOM, openGradeModal, closeGradeModal, handleGradeModalTabClick,
    addNaesinSubjectRow, populateSuneungSubjectDropdowns,
    saveGradesToFile, loadGradesFromFile, // handleSuneungExamSelectionChange 제거됨
    collectSuneungGradesFromForm
} from './gradeModalUtils';

// UI 유틸리티 임포트
import { initializeUiUtilsDOM, showLoading } from './uiUtils';


// --- DOM 요소 ---
const departmentSearchInputEl = document.getElementById('department-search') as HTMLInputElement; // 학과 검색 입력란
const departmentSuggestionsDivEl = document.getElementById('department-suggestions') as HTMLDivElement; // 학과 추천 목록 표시 div
const enterGradesButtonEl = document.getElementById('enter-grades-button') as HTMLButtonElement; // 성적 입력 버튼
const admissionTypeFilterSelectEl = document.getElementById('admission-type-filter') as HTMLSelectElement; // 입시 전형 필터 선택
const scoreDifferenceToleranceInputEl = document.getElementById('score-difference-tolerance') as HTMLInputElement; // 점수차 허용치 입력란
const scoreDifferenceToleranceSliderEl = document.getElementById('score-difference-tolerance-slider') as HTMLInputElement; // 점수차 허용치 슬라이더
const applyFiltersButtonEl = document.getElementById('apply-filters-button') as HTMLButtonElement; // 필터 적용 버튼

const mapDivEl = document.getElementById('map') as HTMLDivElement; // 지도 표시 div
const sidebarDivEl = document.getElementById('sidebar') as HTMLElement; // 사이드바 div
const sidebarContentDivEl = document.getElementById('sidebar-content') as HTMLDivElement; // 사이드바 콘텐츠 div
const closeSidebarButtonEl = document.getElementById('close-sidebar-button') as HTMLButtonElement; // 사이드바 닫기 버튼
const loadingOverlayEl = document.getElementById('loading-overlay') as HTMLDivElement; // 로딩 오버레이 div

const gradeInputModalEl = document.getElementById('grade-input-modal') as HTMLDivElement; // 성적 입력 모달 div
const closeGradeModalButtonEl = document.getElementById('close-grade-modal-button') as HTMLButtonElement; // 성적 입력 모달 닫기 버튼
const saveGradesButtonEl = document.getElementById('save-grades-button') as HTMLButtonElement; // 성적 저장 버튼
const loadGradesInputEl = document.getElementById('load-grades-input') as HTMLInputElement; // 성적 불러오기 파일 입력
const loadGradesButtonEl = document.getElementById('load-grades-button') as HTMLButtonElement; // 성적 불러오기 버튼
const modalTabsEl = gradeInputModalEl.querySelectorAll('.tab-button'); // 모달 탭 버튼
const modalTabContentsEl = gradeInputModalEl.querySelectorAll('.tab-content'); // 모달 탭 콘텐츠
const submitGradesButtonEl = document.getElementById('submit-grades-button') as HTMLButtonElement; // 성적 제출(확인) 버튼

const naesinSubjectRowTemplateEl = document.getElementById('naesin-subject-row-template') as HTMLTemplateElement; // 내신 과목 행 템플릿
const naesinGradeFormDivsEls = { // 내신 성적 입력 폼 div
    y1s1: document.getElementById('naesin-y1s1-subjects') as HTMLDivElement,
    y1s2: document.getElementById('naesin-y1s2-subjects') as HTMLDivElement,
    y2s1: document.getElementById('naesin-y2s1-subjects') as HTMLDivElement,
    y2s2: document.getElementById('naesin-y2s2-subjects') as HTMLDivElement,
    y3s1: document.getElementById('naesin-y3s1-subjects') as HTMLDivElement,
    y3s2: document.getElementById('naesin-y3s2-subjects') as HTMLDivElement, // 3학년 2학기는 UI에서 제거되었으므로 null이 될 수 있음
};

const suneungExamSelectorEl = document.getElementById('suneung-exam-selector') as HTMLSelectElement; // 수능 기준 시험 선택
const suneungKoreanChoiceEl = document.getElementById('suneung-korean-choice') as HTMLSelectElement; // 수능 국어 선택과목
const suneungKoreanRawEl = document.getElementById('suneung-korean-raw') as HTMLInputElement; // 수능 국어 원점수
const suneungKoreanCalculatedDivEl = document.getElementById('suneung-korean-calculated') as HTMLDivElement; // 수능 국어 계산된 점수 표시 div
const suneungMathChoiceEl = document.getElementById('suneung-math-choice') as HTMLSelectElement; // 수능 수학 선택과목
const suneungMathRawEl = document.getElementById('suneung-math-raw') as HTMLInputElement; // 수능 수학 원점수
const suneungMathCalculatedDivEl = document.getElementById('suneung-math-calculated') as HTMLDivElement; // 수능 수학 계산된 점수 표시 div
const suneungEnglishRawEl = document.getElementById('suneung-english-raw') as HTMLInputElement; // 수능 영어 원점수
const suneungEnglishCalculatedDivEl = document.getElementById('suneung-english-calculated') as HTMLDivElement; // 수능 영어 계산된 점수 표시 div
const suneungHistoryRawEl = document.getElementById('suneung-history-raw') as HTMLInputElement; // 수능 한국사 원점수
const suneungHistoryCalculatedDivEl = document.getElementById('suneung-history-calculated') as HTMLDivElement; // 수능 한국사 계산된 점수 표시 div
const suneungExplorer1SubjectEl = document.getElementById('suneung-explorer1-subject') as HTMLSelectElement; // 수능 탐구1 과목 선택
const suneungExplorer1RawEl = document.getElementById('suneung-explorer1-raw') as HTMLInputElement; // 수능 탐구1 원점수
const suneungExplorer1CalculatedDivEl = document.getElementById('suneung-explorer1-calculated') as HTMLDivElement; // 수능 탐구1 계산된 점수 표시 div
const suneungExplorer2SubjectEl = document.getElementById('suneung-explorer2-subject') as HTMLSelectElement; // 수능 탐구2 과목 선택
const suneungExplorer2RawEl = document.getElementById('suneung-explorer2-raw') as HTMLInputElement; // 수능 탐구2 원점수
const suneungExplorer2CalculatedDivEl = document.getElementById('suneung-explorer2-calculated') as HTMLDivElement; // 수능 탐구2 계산된 점수 표시 div


// --- 메인 애플리케이션 로직 및 이벤트 핸들러 ---

// POST /universities/filter API 명세에 맞게 내신 성적을 변환하는 함수
function transformNaesinGradesForApi(internalNaesin: UserNaesinGrades): ApiNaesinGrades {
    const apiNaesin: ApiNaesinGrades = {};
    for (const year of [1, 2, 3]) {
        for (const semester of [1, 2]) {
            // 3학년 2학기 데이터는 포함하지 않음
            if (year === 3 && semester === 2) continue;

            const yearKey = `year${year}` as keyof UserNaesinGrades; // 예: year1
            const semesterKey = `semester${semester}` as keyof UserNaesinGrades['year1']; // 예: semester1
            
            // 내부 구조에서 과목 접근
            const subjects: UserNaesinSubject[] = internalNaesin[yearKey][semesterKey].subjects;
            
            if (subjects.length > 0) {
                // API는 "1-1", "1-2"와 같은 키를 기대함
                const apiSemesterKey = `${year}-${semester}`;
                apiNaesin[apiSemesterKey] = subjects.map(s => ({
                    // 내부 과목 구조를 API가 기대하는 구조로 매핑
                    id: s.id, // UI id는 참조용으로 유지, API는 무시할 수 있음
                    subjectCode: s.subjectCode || "N/A", // API 명세는 subjectCode를 기대함
                    subjectName: s.subjectName, // API 명세는 subjectName도 포함
                    grade: s.grade,
                    credits: s.credits,
                    rawScore: s.rawScore,
                    subjectMean: s.subjectMean,
                    stdDev: s.stdDev,
                }));
            }
        }
    }
    return apiNaesin;
}

// 필터 업데이트 처리 함수
async function handleFilterUpdate() {
    if (!selectedDepartment) {
        alert("학과를 먼저 선택해주세요.");
        setCurrentFilteredUniversities([]);
        updateMarkers();
        return;
    }
    collectSuneungGradesFromForm(); // 최신 수능 성적이 전역 상태에 있는지 확인

    // showLoading(true); // fetchFilteredUniversitiesApi 내부에서 처리
    try {
        // 내신 성적을 API가 기대하는 형식으로 변환
        const apiNaesinPayload = transformNaesinGradesForApi(userAllGrades.naesin);
        
        // 전역 상태의 수능 성적은 이미 올바른 API 구조여야 함
        const apiSuneungPayload = userAllGrades.suneung;

        const requestPayload = {
            userGrades: {
                naesin: apiNaesinPayload,
                suneung: apiSuneungPayload
            },
            filterCriteria: {
                departmentKeywords: selectedDepartment,
                admissionType: currentAdmissionTypeFilter,
                scoreDifferenceTolerance: currentScoreDifferenceTolerance
            }
        };
        
        console.log("Sending to /universities/filter:", JSON.stringify(requestPayload, null, 2));

        const responseData = await fetchFilteredUniversitiesApi(requestPayload);
        
        if(responseData && Array.isArray(responseData)) {
            setCurrentFilteredUniversities(responseData);
        } else {
            // fetchFilteredUniversitiesApi 내부에서 alert 또는 오류 처리가 있을 수 있음
            console.error("Invalid data from fetchFilteredUniversitiesApi or API call failed.");
            setCurrentFilteredUniversities([]); // 실패 시 빈 배열로 설정
        }
       
        updateMarkers(); // 마커 업데이트
        // 이전에 열었던 대학이 필터링된 목록에 없으면 사이드바 닫기
        if (lastOpenedUniversityId && !currentFilteredUniversities.find(u => u.universityId === lastOpenedUniversityId)) {
            closeSidebar();
        }

    } catch (error) { // fetchFilteredUniversitiesApi 에서 throw된 에러는 여기서 잡히지 않을 수 있음 (내부에서 alert 처리 시)
        console.error("Error in handleFilterUpdate after API call:", error);
        // alert("대학 정보를 필터링하는 중 오류가 발생했습니다."); // API 함수에서 이미 alert 했을 수 있음
        setCurrentFilteredUniversities([]);
        updateMarkers();
    } finally {
        // showLoading(false); // fetchFilteredUniversitiesApi 내부에서 처리
    }
}

// DOM 콘텐츠 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', async () => {
    // UI 유틸리티 DOM 초기화
    initializeUiUtilsDOM({
        loadingOverlay: loadingOverlayEl,
        departmentSearchInput: departmentSearchInputEl,
        departmentSuggestionsDiv: departmentSuggestionsDivEl
    });
    // 사이드바 컨트롤 초기화
    initializeSidebarControls(sidebarDivEl, sidebarContentDivEl, closeSidebarButtonEl);
    // 성적 입력 모달 DOM 초기화
    initializeGradeModalDOM({
        gradeInputModal: gradeInputModalEl,
        modalTabsElements: modalTabsEl,
        modalTabContentsElements: modalTabContentsEl,
        naesinSubjectRowTemplate: naesinSubjectRowTemplateEl,
        naesinGradeFormDivs: naesinGradeFormDivsEls,
        suneungExamSelector: suneungExamSelectorEl,
        suneungKoreanChoice: suneungKoreanChoiceEl, suneungKoreanRaw: suneungKoreanRawEl, suneungKoreanCalculatedDiv: suneungKoreanCalculatedDivEl,
        suneungMathChoice: suneungMathChoiceEl, suneungMathRaw: suneungMathRawEl, suneungMathCalculatedDiv: suneungMathCalculatedDivEl,
        suneungEnglishRaw: suneungEnglishRawEl, suneungEnglishCalculatedDiv: suneungEnglishCalculatedDivEl,
        suneungHistoryRaw: suneungHistoryRawEl, suneungHistoryCalculatedDiv: suneungHistoryCalculatedDivEl,
        suneungExplorer1Subject: suneungExplorer1SubjectEl, suneungExplorer1Raw: suneungExplorer1RawEl, suneungExplorer1CalculatedDiv: suneungExplorer1CalculatedDivEl,
        suneungExplorer2Subject: suneungExplorer2SubjectEl, suneungExplorer2Raw: suneungExplorer2RawEl, suneungExplorer2CalculatedDiv: suneungExplorer2CalculatedDivEl,
    });
    
    if (mapDivEl) initMap(mapDivEl); // 지도 초기화
    else console.error("Map container not found!");

    await loadInitialMarkers(); // 초기 마커 로드
    await fetchAllSubjectLists(); // 모든 과목 목록 (내신, 수능 국어/수학 옵션, 수능 탐구) 가져오기
    
    // 기본 수능 시험에 대한 초기 시험 컷 정보 가져오기
    if (suneungExamSelectorEl && suneungExamSelectorEl.value) {
        await fetchSuneungExamCutInfo(suneungExamSelectorEl.value);
    }
    
    populateSuneungSubjectDropdowns(); // 수능 드롭다운에 가져온 옵션 채우기

    // UI 컨트롤 초기값 설정
    scoreDifferenceToleranceInputEl.value = currentScoreDifferenceTolerance.toString();
    scoreDifferenceToleranceSliderEl.value = currentScoreDifferenceTolerance.toString();
    admissionTypeFilterSelectEl.value = currentAdmissionTypeFilter;

    // 이벤트 리스너 설정
    enterGradesButtonEl.addEventListener('click', openGradeModal);
    admissionTypeFilterSelectEl.addEventListener('change', (e) => {
        setCurrentAdmissionTypeFilter((e.target as HTMLSelectElement).value as AdmissionTypeFilterKey);
        // 사이드바가 열려있고 데이터가 있다면 업데이트된 필터 기준으로 다시 렌더링
        if (sidebarDivEl.classList.contains('visible') && currentSidebarData && lastOpenedUniversityId) {
            openSidebar(lastOpenedUniversityId, currentSidebarData.departmentName); 
        } else if (currentSidebarData) { // 사이드바가 닫혀있지만 데이터가 있다면 (예: 필터 변경 후 마커 클릭 시)
            renderSidebarContentUtil();
        }
        // 필터링된 대학이 있다면 마커 업데이트
        if (currentFilteredUniversities.length > 0) {
            updateMarkers();
        }
    });
    scoreDifferenceToleranceInputEl.addEventListener('change', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            setCurrentScoreDifferenceTolerance(value);
            scoreDifferenceToleranceSliderEl.value = value.toString();
        } else {
            (e.target as HTMLInputElement).value = currentScoreDifferenceTolerance.toString(); // 잘못된 값이면 이전 값으로 복원
            alert("유효한 점수차 허용치를 입력해주세요 (0 ~ 100).");
        }
    });
    scoreDifferenceToleranceSliderEl.addEventListener('input', (e) => { // 슬라이더 사용 시 실시간 반영
        const value = parseFloat((e.target as HTMLInputElement).value);
        setCurrentScoreDifferenceTolerance(value);
        scoreDifferenceToleranceInputEl.value = value.toFixed(0); // 소수점 없이 입력란에 표시
    });
    applyFiltersButtonEl.addEventListener('click', handleFilterUpdate); // 필터 적용 버튼 클릭 시

    closeGradeModalButtonEl.addEventListener('click', closeGradeModal); // 성적 모달 닫기
    submitGradesButtonEl.addEventListener('click', () => { // 성적 모달 확인(제출) 버튼
        collectSuneungGradesFromForm(); // 폼에서 수능 성적 수집
        closeGradeModal();
        alert("성적이 반영되었습니다. '필터 적용 및 지도 업데이트' 버튼을 클릭하여 결과를 확인하세요.");
    });
    saveGradesButtonEl.addEventListener('click', saveGradesToFile); // 성적 파일로 저장
    loadGradesButtonEl.addEventListener('click', () => loadGradesInputEl.click()); // 성적 파일 불러오기 (숨겨진 input 클릭)
    loadGradesInputEl.addEventListener('change', loadGradesFromFile); // 파일 선택 시
    modalTabsEl.forEach(tab => tab.addEventListener('click', handleGradeModalTabClick)); // 모달 탭 클릭 시

    // 내신 과목 추가 버튼 이벤트 리스너
    gradeInputModalEl.querySelectorAll('.add-subject-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const year = parseInt(target.dataset.year!) as 1 | 2 | 3;
            const semester = parseInt(target.dataset.semester!) as 1 | 2;
            if (year && semester) {
                addNaesinSubjectRow(year, semester);
            }
        });
    });
    
    // 수능 시험 선택 변경 시
    suneungExamSelectorEl.addEventListener('change', async () => {
        if (suneungExamSelectorEl) {
            await fetchSuneungExamCutInfo(suneungExamSelectorEl.value); // API 호출 (내부에서 상태 업데이트)
            collectSuneungGradesFromForm(); // 수능 성적 재수집 및 계산된 점수 업데이트
        }
    });

    // 수능 관련 입력 필드 변경/입력 시 실시간으로 수능 성적 수집 (계산된 점수 업데이트 위함)
    [suneungKoreanRawEl, suneungMathRawEl, suneungEnglishRawEl, suneungHistoryRawEl, suneungExplorer1RawEl, suneungExplorer2RawEl,
     suneungKoreanChoiceEl, suneungMathChoiceEl, suneungExplorer1SubjectEl, suneungExplorer2SubjectEl].forEach(el => {
        if (el) {
            el.addEventListener('change', () => { // select 변경 또는 number input 포커스 아웃
                collectSuneungGradesFromForm();
            });
             el.addEventListener('input', () => { // number input 실시간 입력
                if (el.type === 'number') collectSuneungGradesFromForm();
            });
        }
    });

    console.log("Application initialized with real fetch API calls.");
});
