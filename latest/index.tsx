// 이 파일은 애플리케이션의 메인 로직을 담당하며, UI 초기화, 이벤트 핸들러 설정, API 호출 조정 등의 기능을 수행합니다.

// TypeScript가 L 전역 변수를 인식하도록 이 줄을 추가합니다 (전역 타입 파일에서 이미 처리되지 않은 경우).
declare var L: any;
declare var XLSX: any; // SheetJS


// 타입 임포트
import { AdmissionTypeFilterKey, UserNaesinGrades, UserSuneungGrades, ApiNaesinGrades, UserNaesinSubject, UserSuneungSubjectDetailScore, UserSuneungSubjectExplorerScore } from './types';

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
import { fetchAllSubjectLists, fetchFilteredUniversitiesApi } from './api';

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
// 학과 검색 관련: 기존 input과 suggestions div는 제거되고, 새 모달 관련 요소들 추가
const openDepartmentSearchModalButtonEl = document.getElementById('open-department-select-modal-button') as HTMLButtonElement;
const departmentSelectModalEl = document.getElementById('department-select-modal') as HTMLDivElement;
const majorCategorySelectEl = document.getElementById('major-category-select') as HTMLSelectElement;
const mediumCategorySelectEl = document.getElementById('medium-category-select') as HTMLSelectElement;
const minorCategorySelectEl = document.getElementById('minor-category-select') as HTMLSelectElement;
const applyDepartmentSelectionButtonEl = document.getElementById('apply-department-selection-button') as HTMLButtonElement;
const closeDepartmentModalButtonEl = document.getElementById('close-department-modal-button') as HTMLButtonElement;


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
// const suneungKoreanCalculatedDivEl = document.getElementById('suneung-korean-calculated') as HTMLDivElement; // Removed
const suneungMathChoiceEl = document.getElementById('suneung-math-choice') as HTMLSelectElement; 
const suneungMathRawEl = document.getElementById('suneung-math-raw') as HTMLInputElement; 
// const suneungMathCalculatedDivEl = document.getElementById('suneung-math-calculated') as HTMLDivElement; // Removed
const suneungEnglishRawEl = document.getElementById('suneung-english-raw') as HTMLInputElement; 
// const suneungEnglishCalculatedDivEl = document.getElementById('suneung-english-calculated') as HTMLDivElement; // Removed
const suneungHistoryRawEl = document.getElementById('suneung-history-raw') as HTMLInputElement; 
// const suneungHistoryCalculatedDivEl = document.getElementById('suneung-history-calculated') as HTMLDivElement; // Removed
const suneungExplorer1SubjectEl = document.getElementById('suneung-explorer1-subject') as HTMLSelectElement; 
const suneungExplorer1RawEl = document.getElementById('suneung-explorer1-raw') as HTMLInputElement; 
// const suneungExplorer1CalculatedDivEl = document.getElementById('suneung-explorer1-calculated') as HTMLDivElement; // Removed
const suneungExplorer2SubjectEl = document.getElementById('suneung-explorer2-subject') as HTMLSelectElement; 
const suneungExplorer2RawEl = document.getElementById('suneung-explorer2-raw') as HTMLInputElement; 
// const suneungExplorer2CalculatedDivEl = document.getElementById('suneung-explorer2-calculated') as HTMLDivElement; // Removed


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
                    // id: s.id, // API 전송 시 id는 필요 없음 (ApiNaesinSubjectPayload 타입에 의해 id 제외됨)
                    curriculumClassificationCode: s.curriculumClassificationCode, 
                    curriculumClassificationName: s.curriculumClassificationName, 
                    curriculumAreaCode: s.curriculumAreaCode, 
                    curriculumAreaName: s.curriculumAreaName, 
                    subjectCode: s.subjectCode || null, 
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

interface ApiSuneungSubjectPayload {
    rawScore: number | null;
    selectedOption?: string | null; // 국어, 수학용
    subjectName?: string | null;    // 탐구 과목명 (API가 과목 코드가 아닌 이름으로 식별할 경우)
    // subjectCode?: string | null; // 또는 subjectCode (API가 코드로 식별할 경우)
}

interface ApiSuneungGradesPayload {
    examIdentifierForCutInfo: string;
    subjects: {
        korean?: ApiSuneungSubjectPayload;
        math?: ApiSuneungSubjectPayload;
        english?: ApiSuneungSubjectPayload;
        history?: ApiSuneungSubjectPayload;
        explorer1?: ApiSuneungSubjectPayload;
        explorer2?: ApiSuneungSubjectPayload;
    };
}

function transformSuneungGradesForApi(suneungGrades: UserSuneungGrades): ApiSuneungGradesPayload {
    const payloadSubjects: Partial<ApiSuneungGradesPayload['subjects']> = {};

    const processSubject = (
        subjectData: UserSuneungSubjectDetailScore | UserSuneungSubjectExplorerScore | undefined,
        isExplorer: boolean = false
    ): ApiSuneungSubjectPayload | undefined => {
        if (!subjectData || subjectData.rawScore === null || subjectData.rawScore === undefined) {
            return undefined; 
        }
        
        const basePayload: ApiSuneungSubjectPayload = { rawScore: subjectData.rawScore };
        
        if (subjectData.selectedOption) { 
            basePayload.selectedOption = subjectData.selectedOption;
        }
        
        if (isExplorer) { 
            const explorerData = subjectData as UserSuneungSubjectExplorerScore;
            basePayload.subjectName = explorerData.subjectName; 
        }
        return basePayload;
    };

    payloadSubjects.korean = processSubject(suneungGrades.subjects.korean);
    payloadSubjects.math = processSubject(suneungGrades.subjects.math);
    payloadSubjects.english = processSubject(suneungGrades.subjects.english);
    payloadSubjects.history = processSubject(suneungGrades.subjects.history);
    payloadSubjects.explorer1 = processSubject(suneungGrades.subjects.explorer1, true);
    payloadSubjects.explorer2 = processSubject(suneungGrades.subjects.explorer2, true);
    
    const finalPayloadSubjects: any = {};
    for (const key in payloadSubjects) {
        if (payloadSubjects[key as keyof typeof payloadSubjects] !== undefined) {
            finalPayloadSubjects[key] = payloadSubjects[key as keyof typeof payloadSubjects];
        }
    }

    return {
        examIdentifierForCutInfo: suneungGrades.examIdentifierForCutInfo,
        subjects: finalPayloadSubjects as ApiSuneungGradesPayload['subjects']
    };
}


async function handleFilterUpdate() {
    if (!selectedDepartment) {
        alert("학과를 먼저 선택해주세요.");
        setCurrentFilteredUniversities([]);
        updateMarkers();
        return;
    }

    let naesinPayloadForApi: ApiNaesinGrades = {};
    // examIdentifierForCutInfo는 suneungExamSelectorEl의 change 이벤트에서 collectSuneungGradesFromForm()를 통해
    // userAllGrades.suneung에 이미 업데이트 되어 있다고 가정합니다.
    let suneungPayloadForApi: ApiSuneungGradesPayload = {
        examIdentifierForCutInfo: userAllGrades.suneung.examIdentifierForCutInfo,
        subjects: {}
    };

    if (currentAdmissionTypeFilter !== '경쟁률') {
        collectSuneungGradesFromForm(); // "경쟁률"이 아닐 때만 현재 폼의 수능 점수 수집
        naesinPayloadForApi = transformNaesinGradesForApi(userAllGrades.naesin); // 내신 성적은 항상 현재 상태 반영
        suneungPayloadForApi = transformSuneungGradesForApi(userAllGrades.suneung);
    }
    // "경쟁률"일 경우, naesinPayloadForApi는 {} 이고,
    // suneungPayloadForApi는 examIdentifierForCutInfo는 유지하되 subjects는 {} 인 상태로 전송됩니다.

    try {
        const requestPayload = {
            userGrades: {
                naesin: naesinPayloadForApi,
                suneung: suneungPayloadForApi
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
        departmentSelectModal: departmentSelectModalEl,
        majorCategorySelect: majorCategorySelectEl,
        mediumCategorySelect: mediumCategorySelectEl,
        minorCategorySelect: minorCategorySelectEl,
        applyDepartmentSelectionButton: applyDepartmentSelectionButtonEl,
        closeDepartmentModalButton: closeDepartmentModalButtonEl,
        openDepartmentSearchModalButton: openDepartmentSearchModalButtonEl
    });
    initializeSidebarControls(sidebarDivEl, sidebarContentDivEl, closeSidebarButtonEl);
    initializeGradeModalDOM({
        gradeInputModal: gradeInputModalEl,
        modalTabsElements: modalTabsEl,
        modalTabContentsElements: modalTabContentsEl,
        naesinSubjectRowTemplate: naesinSubjectRowTemplateEl,
        naesinGradeFormDivs: naesinGradeFormDivsEls,
        suneungExamSelector: suneungExamSelectorEl,
        suneungKoreanChoice: suneungKoreanChoiceEl, suneungKoreanRaw: suneungKoreanRawEl, 
        suneungMathChoice: suneungMathChoiceEl, suneungMathRaw: suneungMathRawEl, 
        suneungEnglishRaw: suneungEnglishRawEl, 
        suneungHistoryRaw: suneungHistoryRawEl, 
        suneungExplorer1Subject: suneungExplorer1SubjectEl, suneungExplorer1Raw: suneungExplorer1RawEl, 
        suneungExplorer2Subject: suneungExplorer2SubjectEl, suneungExplorer2Raw: suneungExplorer2RawEl, 
    });
    
    if (mapDivEl) initMap(mapDivEl); 
    else console.error("Map container not found!");

    await loadInitialMarkers(); 
    await fetchAllSubjectLists(); 
    
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
        // 수능 점수는 실시간으로 collectSuneungGradesFromForm()을 통해 userAllGrades.suneung에 반영됨.
        // 내신 성적도 각 입력 필드의 이벤트 리스너를 통해 userAllGrades.naesin에 실시간 반영됨.
        // 따라서 이 버튼 클릭 시에는 추가적인 수집 없이 모달만 닫습니다.
        // handleFilterUpdate 호출 시점에 필요한 전형에 따라 수능 점수를 다시 한 번 수집.
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
            collectSuneungGradesFromForm(); // Update state with new exam identifier
                                            // This ensures userAllGrades.suneung.examIdentifierForCutInfo is up-to-date
        }
    });

    // Event listeners for Suneung inputs to update state on change
    [suneungKoreanRawEl, suneungMathRawEl, suneungEnglishRawEl, suneungHistoryRawEl, suneungExplorer1RawEl, suneungExplorer2RawEl,
     suneungKoreanChoiceEl, suneungMathChoiceEl, suneungExplorer1SubjectEl, suneungExplorer2SubjectEl].forEach(el => {
        if (el) {
            const eventType = (el.tagName === 'SELECT' || el.type === 'text' || el.type === 'number') ? 'change' : 'input';
            el.addEventListener(eventType, () => { 
                collectSuneungGradesFromForm(); // 실시간으로 userAllGrades.suneung 업데이트
            });
            if (el.type === 'number') {
                 el.addEventListener('input', () => {
                    collectSuneungGradesFromForm(); // 숫자 입력 시에도 실시간 업데이트
                });
            }
        }
    });

    console.log("Application initialized with real fetch API calls.");
});