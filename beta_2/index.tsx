// 이 파일은 애플리케이션의 메인 로직을 담당하며, UI 초기화, 이벤트 핸들러 설정, API 호출 조정 등의 기능을 수행합니다.

// TypeScript가 L 전역 변수를 인식하도록 이 줄을 추가합니다 (전역 타입 파일에서 이미 처리되지 않은 경우).
declare var L: any;
declare var XLSX: any; // SheetJS


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
    saveSuneungGradesToJsonFile, loadSuneungGradesFromJsonFile, // 이름 변경됨
    saveNaesinGradesToXlsFile, loadNaesinGradesFromXlsFile, // XLS용 함수 추가
    collectSuneungGradesFromForm
} from './gradeModalUtils';

// UI 유틸리티 임포트
import { initializeUiUtilsDOM, showLoading } from './uiUtils';


// --- DOM 요소 ---
const departmentSearchInputEl = document.getElementById('department-search') as HTMLInputElement; 
const departmentSuggestionsDivEl = document.getElementById('department-suggestions') as HTMLDivElement; 
const enterGradesButtonEl = document.getElementById('enter-grades-button') as HTMLButtonElement; 
const admissionTypeFilterSelectEl = document.getElementById('admission-type-filter') as HTMLSelectElement; 
const scoreDifferenceToleranceInputEl = document.getElementById('score-difference-tolerance') as HTMLInputElement; 
const scoreDifferenceToleranceSliderEl = document.getElementById('score-difference-tolerance-slider') as HTMLInputElement; 
const applyFiltersButtonEl = document.getElementById('apply-filters-button') as HTMLButtonElement; 

const mapDivEl = document.getElementById('map') as HTMLDivElement; 
const sidebarDivEl = document.getElementById('sidebar') as HTMLElement; 
const sidebarContentDivEl = document.getElementById('sidebar-content') as HTMLDivElement; 
const closeSidebarButtonEl = document.getElementById('close-sidebar-button') as HTMLButtonElement; 
const loadingOverlayEl = document.getElementById('loading-overlay') as HTMLDivElement; 

const gradeInputModalEl = document.getElementById('grade-input-modal') as HTMLDivElement; 
const closeGradeModalButtonEl = document.getElementById('close-grade-modal-button') as HTMLButtonElement; 

// JSON 버튼
const saveSuneungGradesJsonButtonEl = document.getElementById('save-suneung-grades-json-button') as HTMLButtonElement; 
const loadSuneungGradesJsonInputEl = document.getElementById('load-suneung-grades-json-input') as HTMLInputElement; 
const loadSuneungGradesJsonButtonEl = document.getElementById('load-suneung-grades-json-button') as HTMLButtonElement; 

// XLS 버튼
const saveNaesinGradesXlsButtonEl = document.getElementById('save-naesin-grades-xls-button') as HTMLButtonElement;
const loadNaesinGradesXlsInputEl = document.getElementById('load-naesin-grades-xls-input') as HTMLInputElement;
const loadNaesinGradesXlsButtonEl = document.getElementById('load-naesin-grades-xls-button') as HTMLButtonElement;

const modalTabsEl = gradeInputModalEl.querySelectorAll('.tab-button'); 
const modalTabContentsEl = gradeInputModalEl.querySelectorAll('.tab-content'); 
const submitGradesButtonEl = document.getElementById('submit-grades-button') as HTMLButtonElement; 

const naesinSubjectRowTemplateEl = document.getElementById('naesin-subject-row-template') as HTMLTemplateElement; 
const naesinGradeFormDivsEls = { 
    y1s1: document.getElementById('naesin-y1s1-subjects') as HTMLDivElement,
    y1s2: document.getElementById('naesin-y1s2-subjects') as HTMLDivElement,
    y2s1: document.getElementById('naesin-y2s1-subjects') as HTMLDivElement,
    y2s2: document.getElementById('naesin-y2s2-subjects') as HTMLDivElement,
    y3s1: document.getElementById('naesin-y3s1-subjects') as HTMLDivElement,
    y3s2: document.getElementById('naesin-y3s2-subjects') as HTMLDivElement, 
};

const suneungExamSelectorEl = document.getElementById('suneung-exam-selector') as HTMLSelectElement; 
const suneungKoreanChoiceEl = document.getElementById('suneung-korean-choice') as HTMLSelectElement; 
const suneungKoreanRawEl = document.getElementById('suneung-korean-raw') as HTMLInputElement; 
const suneungKoreanCalculatedDivEl = document.getElementById('suneung-korean-calculated') as HTMLDivElement; 
const suneungMathChoiceEl = document.getElementById('suneung-math-choice') as HTMLSelectElement; 
const suneungMathRawEl = document.getElementById('suneung-math-raw') as HTMLInputElement; 
const suneungMathCalculatedDivEl = document.getElementById('suneung-math-calculated') as HTMLDivElement; 
const suneungEnglishRawEl = document.getElementById('suneung-english-raw') as HTMLInputElement; 
const suneungEnglishCalculatedDivEl = document.getElementById('suneung-english-calculated') as HTMLDivElement; 
const suneungHistoryRawEl = document.getElementById('suneung-history-raw') as HTMLInputElement; 
const suneungHistoryCalculatedDivEl = document.getElementById('suneung-history-calculated') as HTMLDivElement; 
const suneungExplorer1SubjectEl = document.getElementById('suneung-explorer1-subject') as HTMLSelectElement; 
const suneungExplorer1RawEl = document.getElementById('suneung-explorer1-raw') as HTMLInputElement; 
const suneungExplorer1CalculatedDivEl = document.getElementById('suneung-explorer1-calculated') as HTMLDivElement; 
const suneungExplorer2SubjectEl = document.getElementById('suneung-explorer2-subject') as HTMLSelectElement; 
const suneungExplorer2RawEl = document.getElementById('suneung-explorer2-raw') as HTMLInputElement; 
const suneungExplorer2CalculatedDivEl = document.getElementById('suneung-explorer2-calculated') as HTMLDivElement; 


// --- 메인 애플리케이션 로직 및 이벤트 핸들러 ---

// POST /universities/filter API 명세에 맞게 내신 성적을 변환하는 함수
function transformNaesinGradesForApi(internalNaesin: UserNaesinGrades): ApiNaesinGrades {
    const apiNaesin: ApiNaesinGrades = {};
    for (const year of [1, 2, 3]) {
        for (const semester of [1, 2]) {
            if (year === 3 && semester === 2) continue;

            const yearKey = `year${year}` as keyof UserNaesinGrades; 
            const semesterKey = `semester${semester}` as keyof UserNaesinGrades['year1']; 
            
            const subjects: UserNaesinSubject[] = internalNaesin[yearKey][semesterKey].subjects;
            
            if (subjects.length > 0) {
                const apiSemesterKey = `${year}-${semester}`;
                apiNaesin[apiSemesterKey] = subjects.map(s => ({
                    id: s.id,
                    curriculumClassificationCode: s.curriculumClassificationCode, // 교과구분종류 코드
                    curriculumClassificationName: s.curriculumClassificationName, // 교과구분종류명
                    curriculumAreaCode: s.curriculumAreaCode, // 교과 코드
                    curriculumAreaName: s.curriculumAreaName, // 교과명
                    subjectCode: s.subjectCode || "N/A", 
                    subjectName: s.subjectName, 
                    grade: s.grade,
                    credits: s.credits,
                    rawScore: s.rawScore,
                    subjectMean: s.subjectMean,
                    stdDev: s.stdDev,
                    studentCount: s.studentCount,
                    achievementLevel: s.achievementLevel,
                    distributionA: s.distributionA,
                    distributionB: s.distributionB,
                    distributionC: s.distributionC,
                }));
            }
        }
    }
    return apiNaesin;
}

async function handleFilterUpdate() {
    if (!selectedDepartment) {
        alert("학과를 먼저 선택해주세요.");
        setCurrentFilteredUniversities([]);
        updateMarkers();
        return;
    }
    collectSuneungGradesFromForm(); 

    try {
        const apiNaesinPayload = transformNaesinGradesForApi(userAllGrades.naesin);
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
            console.error("Invalid data from fetchFilteredUniversitiesApi or API call failed.");
            setCurrentFilteredUniversities([]); 
        }
       
        updateMarkers(); 
        if (lastOpenedUniversityId && !currentFilteredUniversities.find(u => u.universityId === lastOpenedUniversityId)) {
            closeSidebar();
        }

    } catch (error) { 
        console.error("Error in handleFilterUpdate after API call:", error);
        setCurrentFilteredUniversities([]);
        updateMarkers();
    } finally {
        // showLoading(false); 
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeUiUtilsDOM({
        loadingOverlay: loadingOverlayEl,
        departmentSearchInput: departmentSearchInputEl,
        departmentSuggestionsDiv: departmentSuggestionsDivEl
    });
    initializeSidebarControls(sidebarDivEl, sidebarContentDivEl, closeSidebarButtonEl);
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
    
    if (mapDivEl) initMap(mapDivEl); 
    else console.error("Map container not found!");

    await loadInitialMarkers(); 
    await fetchAllSubjectLists(); 
    
    if (suneungExamSelectorEl && suneungExamSelectorEl.value) {
        await fetchSuneungExamCutInfo(suneungExamSelectorEl.value);
    }
    
    populateSuneungSubjectDropdowns(); 

    scoreDifferenceToleranceInputEl.value = currentScoreDifferenceTolerance.toString();
    scoreDifferenceToleranceSliderEl.value = currentScoreDifferenceTolerance.toString();
    admissionTypeFilterSelectEl.value = currentAdmissionTypeFilter;

    enterGradesButtonEl.addEventListener('click', openGradeModal);
    admissionTypeFilterSelectEl.addEventListener('change', (e) => {
        setCurrentAdmissionTypeFilter((e.target as HTMLSelectElement).value as AdmissionTypeFilterKey);
        if (sidebarDivEl.classList.contains('visible') && currentSidebarData && lastOpenedUniversityId) {
            openSidebar(lastOpenedUniversityId, currentSidebarData.departmentName); 
        } else if (currentSidebarData) { 
            renderSidebarContentUtil();
        }
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
            (e.target as HTMLInputElement).value = currentScoreDifferenceTolerance.toString(); 
            alert("유효한 점수차 허용치를 입력해주세요 (0 ~ 100).");
        }
    });
    scoreDifferenceToleranceSliderEl.addEventListener('input', (e) => { 
        const value = parseFloat((e.target as HTMLInputElement).value);
        setCurrentScoreDifferenceTolerance(value);
        scoreDifferenceToleranceInputEl.value = value.toFixed(0); 
    });
    applyFiltersButtonEl.addEventListener('click', handleFilterUpdate); 

    closeGradeModalButtonEl.addEventListener('click', closeGradeModal); 
    submitGradesButtonEl.addEventListener('click', () => { 
        collectSuneungGradesFromForm(); 
        // Naesin grades are updated in real-time
        closeGradeModal();
        alert("성적이 반영되었습니다. '필터 적용 및 지도 업데이트' 버튼을 클릭하여 결과를 확인하세요.");
    });

    // Suneung JSON
    saveSuneungGradesJsonButtonEl.addEventListener('click', saveSuneungGradesToJsonFile); 
    loadSuneungGradesJsonButtonEl.addEventListener('click', () => loadSuneungGradesJsonInputEl.click()); 
    loadSuneungGradesJsonInputEl.addEventListener('change', loadSuneungGradesFromJsonFile); 

    // Naesin XLS
    saveNaesinGradesXlsButtonEl.addEventListener('click', saveNaesinGradesToXlsFile);
    loadNaesinGradesXlsButtonEl.addEventListener('click', () => loadNaesinGradesXlsInputEl.click());
    loadNaesinGradesXlsInputEl.addEventListener('change', loadNaesinGradesFromXlsFile);
    
    modalTabsEl.forEach(tab => tab.addEventListener('click', handleGradeModalTabClick)); 

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
    
    suneungExamSelectorEl.addEventListener('change', async () => {
        if (suneungExamSelectorEl) {
            await fetchSuneungExamCutInfo(suneungExamSelectorEl.value); 
            collectSuneungGradesFromForm(); 
        }
    });

    [suneungKoreanRawEl, suneungMathRawEl, suneungEnglishRawEl, suneungHistoryRawEl, suneungExplorer1RawEl, suneungExplorer2RawEl,
     suneungKoreanChoiceEl, suneungMathChoiceEl, suneungExplorer1SubjectEl, suneungExplorer2SubjectEl].forEach(el => {
        if (el) {
            el.addEventListener('change', () => { 
                collectSuneungGradesFromForm();
            });
             el.addEventListener('input', () => { 
                if (el.type === 'number') collectSuneungGradesFromForm();
            });
        }
    });

    console.log("Application initialized with real fetch API calls.");
});