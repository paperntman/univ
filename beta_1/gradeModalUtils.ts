// 이 파일은 성적 입력 모달과 관련된 모든 기능을 담당합니다.
// 모달 DOM 요소 초기화, 모달 열기/닫기, 탭 전환 로직,
// 내신 및 수능 성적 입력 폼 렌더링, 사용자 입력 데이터 수집,
// 계산된 수능 점수(표준점수, 백분위, 등급) 표시 업데이트,
// 성적 데이터를 파일로 저장하거나 파일에서 불러오는 기능 등을 포함합니다.

import {
    UserAllGrades, UserNaesinSubject, ApiSubjectInfo, SuneungExamCutInfoFromAPI, UserSuneungGrades, ExamGradeCutMappingItem, UserSuneungSubjectDetailScore, UserSuneungSubjectExplorerScore,
    UserNaesinGrades, UserNaesinYearData
} from './types';
import { 
    userAllGrades, setUserAllGrades, 
    curriculumAreasFromApi, // 교과 영역 목록
    naesinAllRawSubjectsFromApi, // 모든 내신 과목 원시 목록
    suneungExplorerSubjectsFromApi, suneungKoreanOptionsFromApi, suneungMathOptionsFromApi, 
    currentSuneungExamCutInfo, 
    updateUserSuneungGrades, 
    initializeUserAllGrades as initializeGlobalUserAllGrades 
} from './state';
import { fetchSuneungExamCutInfo as apiFetchSuneungExamCutInfo, fetchSubjectsForCurriculumApi } from './api';
import { NAESIN_ACHIEVEMENT_LEVELS_STATIC } from './config';

// SheetJS 전역 변수 선언
declare var XLSX: any;

// --- DOM 요소 변수 선언 ---
let gradeInputModal: HTMLDivElement | null = null; 
let modalTabsElements: NodeListOf<Element> | null = null; 
let modalTabContentsElements: NodeListOf<Element> | null = null; 
let naesinSubjectRowTemplate: HTMLTemplateElement | null = null; 
let naesinGradeFormDivs: { [key: string]: HTMLDivElement | null } = {};

// 수능 관련 DOM 요소
let suneungExamSelector: HTMLSelectElement | null = null; 
let suneungKoreanChoice: HTMLSelectElement | null = null; 
let suneungKoreanRaw: HTMLInputElement | null = null; 
let suneungKoreanCalculatedDiv: HTMLDivElement | null = null; 
let suneungMathChoice: HTMLSelectElement | null = null; 
let suneungMathRaw: HTMLInputElement | null = null; 
let suneungMathCalculatedDiv: HTMLDivElement | null = null; 
let suneungEnglishRaw: HTMLInputElement | null = null; 
let suneungEnglishCalculatedDiv: HTMLDivElement | null = null; 
let suneungHistoryRaw: HTMLInputElement | null = null; 
let suneungHistoryCalculatedDiv: HTMLDivElement | null = null; 
let suneungExplorer1Subject: HTMLSelectElement | null = null; 
let suneungExplorer1Raw: HTMLInputElement | null = null; 
let suneungExplorer1CalculatedDiv: HTMLDivElement | null = null; 
let suneungExplorer2Subject: HTMLSelectElement | null = null; 
let suneungExplorer2Raw: HTMLInputElement | null = null; 
let suneungExplorer2CalculatedDiv: HTMLDivElement | null = null; 

export function initializeGradeModalDOM(elements: {
    gradeInputModal: HTMLDivElement,
    modalTabsElements: NodeListOf<Element>,
    modalTabContentsElements: NodeListOf<Element>,
    naesinSubjectRowTemplate: HTMLTemplateElement,
    naesinGradeFormDivs: { [key: string]: HTMLDivElement | null },
    suneungExamSelector: HTMLSelectElement,
    suneungKoreanChoice: HTMLSelectElement, suneungKoreanRaw: HTMLInputElement, suneungKoreanCalculatedDiv: HTMLDivElement,
    suneungMathChoice: HTMLSelectElement, suneungMathRaw: HTMLInputElement, suneungMathCalculatedDiv: HTMLDivElement,
    suneungEnglishRaw: HTMLInputElement, suneungEnglishCalculatedDiv: HTMLDivElement,
    suneungHistoryRaw: HTMLInputElement, suneungHistoryCalculatedDiv: HTMLDivElement,
    suneungExplorer1Subject: HTMLSelectElement, suneungExplorer1Raw: HTMLInputElement, suneungExplorer1CalculatedDiv: HTMLDivElement,
    suneungExplorer2Subject: HTMLSelectElement, suneungExplorer2Raw: HTMLInputElement, suneungExplorer2CalculatedDiv: HTMLDivElement,
}) {
    gradeInputModal = elements.gradeInputModal;
    modalTabsElements = elements.modalTabsElements;
    modalTabContentsElements = elements.modalTabContentsElements;
    naesinSubjectRowTemplate = elements.naesinSubjectRowTemplate;
    naesinGradeFormDivs = elements.naesinGradeFormDivs;

    suneungExamSelector = elements.suneungExamSelector;
    suneungKoreanChoice = elements.suneungKoreanChoice;
    suneungKoreanRaw = elements.suneungKoreanRaw;
    suneungKoreanCalculatedDiv = elements.suneungKoreanCalculatedDiv;
    suneungMathChoice = elements.suneungMathChoice;
    suneungMathRaw = elements.suneungMathRaw;
    suneungMathCalculatedDiv = elements.suneungMathCalculatedDiv;
    suneungEnglishRaw = elements.suneungEnglishRaw;
    suneungEnglishCalculatedDiv = elements.suneungEnglishCalculatedDiv;
    suneungHistoryRaw = elements.suneungHistoryRaw;
    suneungHistoryCalculatedDiv = elements.suneungHistoryCalculatedDiv;
    suneungExplorer1Subject = elements.suneungExplorer1Subject;
    suneungExplorer1Raw = elements.suneungExplorer1Raw;
    suneungExplorer1CalculatedDiv = elements.suneungExplorer1CalculatedDiv;
    suneungExplorer2Subject = elements.suneungExplorer2Subject;
    suneungExplorer2Raw = elements.suneungExplorer2Raw;
    suneungExplorer2CalculatedDiv = elements.suneungExplorer2CalculatedDiv;
}

export function openGradeModal() {
    if (!gradeInputModal) return;
    populateSuneungSubjectDropdowns(); 
    renderNaesinGradesFromState(); 
    renderSuneungGradesFromState(); 
    gradeInputModal.classList.remove('hidden'); 
    const firstTab = gradeInputModal.querySelector('.tab-button');
    if (firstTab && !firstTab.classList.contains('active')) {
        (firstTab as HTMLElement).click();
    }
}

export function closeGradeModal() {
    if (gradeInputModal) gradeInputModal.classList.add('hidden'); 
}

export function handleGradeModalTabClick(event: MouseEvent) {
    if (!modalTabsElements || !modalTabContentsElements) return;
    const clickedTab = event.target as HTMLElement;
    if (!clickedTab.classList.contains('tab-button')) return; 

    modalTabsElements.forEach(tab => tab.classList.remove('active'));
    modalTabContentsElements.forEach(content => content.classList.remove('active'));

    clickedTab.classList.add('active');
    const tabId = clickedTab.dataset.tab;
    if (tabId) {
        const activeContent = document.getElementById(tabId);
        if (activeContent) activeContent.classList.add('active');
    }
}

function populateSelectWithOptions(
    selectElement: HTMLSelectElement | null, 
    optionsArray: (ApiSubjectInfo | string)[], 
    placeholder: string, 
    valueField: keyof ApiSubjectInfo | 'self' = 'subjectCode', // 'self' for string array
    nameField: keyof ApiSubjectInfo | 'self' = 'subjectName', // 'self' for string array
    clearFirst: boolean = true
) {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    if(clearFirst) selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    
    optionsArray.forEach(item => {
        const option = document.createElement('option');
        if (typeof item === 'string') {
            option.value = item;
            option.textContent = item;
        } else {
            option.value = item[valueField] as string || "";
            option.textContent = item[nameField] as string || "";
            // Store all data fields from ApiSubjectInfo for potential use
            Object.keys(item).forEach(key => {
                 const itemKey = key as keyof ApiSubjectInfo;
                 if (item[itemKey] !== undefined && item[itemKey] !== null) {
                    option.dataset[itemKey] = String(item[itemKey]);
                 }
            });
        }
        selectElement.appendChild(option);
    });

    if (currentValue && Array.from(selectElement.options).some(opt => opt.value === currentValue)) {
        selectElement.value = currentValue;
    }
}

export function populateSuneungSubjectDropdowns() {
    populateSelectWithOptions(suneungKoreanChoice, suneungKoreanOptionsFromApi, "국어 선택", 'subjectName', 'subjectName');
    populateSelectWithOptions(suneungMathChoice, suneungMathOptionsFromApi, "수학 선택", 'subjectName', 'subjectName');
    populateSelectWithOptions(suneungExplorer1Subject, suneungExplorerSubjectsFromApi, "탐구1 과목 선택", 'subjectName', 'subjectName');
    populateSelectWithOptions(suneungExplorer2Subject, suneungExplorerSubjectsFromApi, "탐구2 과목 선택", 'subjectName', 'subjectName');
}

export function addNaesinSubjectRow(year: 1 | 2 | 3, semester: 1 | 2) {
    const containerKey = `y${year}s${semester}` as keyof typeof naesinGradeFormDivs;
    const container = naesinGradeFormDivs[containerKey];
    if (!container || !naesinSubjectRowTemplate) return;

    const newSubjectId = `s${Date.now()}${Math.random().toString(16).slice(2)}`;
    const newSubject: UserNaesinSubject = { 
        id: newSubjectId, 
        curriculumAreaCode: null, curriculumAreaName: "",
        subjectCode: null, subjectName: "", 
        grade: null, credits: null, 
        rawScore: null, subjectMean: null, stdDev: null,
        studentCount: null, achievementLevel: null,
        distributionA: null, distributionB: null, distributionC: null,
    };
    
    const yearKey = `year${year}` as keyof UserAllGrades['naesin'];
    const semesterKey = `semester${semester}` as keyof UserAllGrades['naesin']['year1'];
    
    userAllGrades.naesin[yearKey][semesterKey].subjects.push(newSubject);
    renderNaesinSemester(year, semester);
}

export function removeNaesinSubjectRow(year: 1 | 2 | 3, semester: 1 | 2, subjectId: string) {
    const yearKey = `year${year}` as keyof UserAllGrades['naesin'];
    const semesterKey = `semester${semester}` as keyof UserAllGrades['naesin']['year1'];
    
    const subjects = userAllGrades.naesin[yearKey][semesterKey].subjects;
    userAllGrades.naesin[yearKey][semesterKey].subjects = subjects.filter(s => s.id !== subjectId);
    renderNaesinSemester(year, semester);
}

export async function renderNaesinSemester(year: 1 | 2 | 3, semester: 1 | 2) {
    const containerKey = `y${year}s${semester}` as keyof typeof naesinGradeFormDivs;
    const container = naesinGradeFormDivs[containerKey];
    if (!container || !naesinSubjectRowTemplate) return; 
    container.innerHTML = ''; 

    const yearKey = `year${year}` as keyof UserAllGrades['naesin'];
    const semesterKey = `semester${semester}` as keyof UserAllGrades['naesin']['year1'];
    const subjectsInState = userAllGrades.naesin[yearKey][semesterKey].subjects;

    for (const subject of subjectsInState) {
        const clone = naesinSubjectRowTemplate.content.cloneNode(true) as DocumentFragment;
        const rowDiv = clone.querySelector('.naesin-subject-row') as HTMLDivElement;
        rowDiv.dataset.subjectId = subject.id;

        // 교과 드롭다운
        const curriculumSelect = rowDiv.querySelector('.naesin-subject-curriculum') as HTMLSelectElement;
        populateSelectWithOptions(curriculumSelect, curriculumAreasFromApi, "교과 선택", 'subjectCode', 'subjectName');
        curriculumSelect.value = subject.curriculumAreaCode || "";

        // 과목 드롭다운 (교과 선택 시 동적 로드)
        const nameSelect = rowDiv.querySelector('.naesin-subject-name') as HTMLSelectElement;
        nameSelect.innerHTML = '<option value="">과목 선택</option>'; // 초기화

        if (subject.curriculumAreaCode) { // 이미 교과가 선택된 경우, 과목 목록 로드
            const subjectsForCurriculum = await fetchSubjectsForCurriculumApi(subject.curriculumAreaCode);
            populateSelectWithOptions(nameSelect, subjectsForCurriculum, "과목 선택", 'subjectCode', 'subjectName', false);
            nameSelect.value = subject.subjectCode || "";
        }
        
        curriculumSelect.addEventListener('change', async (e) => {
            const selectedCurriculumCode = (e.target as HTMLSelectElement).value;
            const selectedOption = (e.target as HTMLSelectElement).selectedOptions[0];
            subject.curriculumAreaCode = selectedCurriculumCode;
            subject.curriculumAreaName = selectedOption.dataset.subjectName || selectedOption.textContent || "";
            subject.subjectCode = null; // 교과 변경 시 과목 초기화
            subject.subjectName = "";

            nameSelect.innerHTML = '<option value="">과목 로딩 중...</option>';
            if (selectedCurriculumCode) {
                const subjectsForCurriculum = await fetchSubjectsForCurriculumApi(selectedCurriculumCode);
                populateSelectWithOptions(nameSelect, subjectsForCurriculum, "과목 선택", 'subjectCode', 'subjectName');
            } else {
                nameSelect.innerHTML = '<option value="">과목 선택</option>';
            }
        });

        nameSelect.addEventListener('change', (e) => {
            const selectedOption = (e.target as HTMLSelectElement).selectedOptions[0];
            subject.subjectCode = selectedOption.value;
            subject.subjectName = selectedOption.dataset.subjectName || selectedOption.textContent || "";
        });

        // 기존 필드들
        const creditsInput = rowDiv.querySelector('.naesin-subject-credits') as HTMLInputElement;
        creditsInput.value = subject.credits?.toString() || '';
        creditsInput.addEventListener('input', (e) => { subject.credits = parseInt((e.target as HTMLInputElement).value) || null; });

        const gradeInput = rowDiv.querySelector('.naesin-subject-grade') as HTMLInputElement;
        gradeInput.value = subject.grade?.toString() || '';
        gradeInput.addEventListener('input', (e) => { subject.grade = parseInt((e.target as HTMLInputElement).value) || null; });

        const detailsDiv = rowDiv.querySelector('.naesin-subject-details') as HTMLDivElement;
        const toggleButton = rowDiv.querySelector('.toggle-details-button') as HTMLButtonElement;
        toggleButton.addEventListener('click', () => detailsDiv.classList.toggle('hidden'));

        const rawScoreInput = rowDiv.querySelector('.naesin-subject-rawScore') as HTMLInputElement;
        rawScoreInput.value = subject.rawScore?.toString() || '';
        rawScoreInput.addEventListener('input', (e) => { subject.rawScore = parseFloat((e.target as HTMLInputElement).value) || null; });
        
        const subjectMeanInput = rowDiv.querySelector('.naesin-subject-subjectMean') as HTMLInputElement;
        subjectMeanInput.value = subject.subjectMean?.toString() || '';
        subjectMeanInput.addEventListener('input', (e) => { subject.subjectMean = parseFloat((e.target as HTMLInputElement).value) || null; });

        const stdDevInput = rowDiv.querySelector('.naesin-subject-stdDev') as HTMLInputElement;
        stdDevInput.value = subject.stdDev?.toString() || '';
        stdDevInput.addEventListener('input', (e) => { subject.stdDev = parseFloat((e.target as HTMLInputElement).value) || null; });

        // 신규 필드들
        const studentCountInput = rowDiv.querySelector('.naesin-subject-studentCount') as HTMLInputElement;
        studentCountInput.value = subject.studentCount?.toString() || '';
        studentCountInput.addEventListener('input', (e) => { subject.studentCount = parseInt((e.target as HTMLInputElement).value) || null; });

        const achievementLevelSelect = rowDiv.querySelector('.naesin-subject-achievementLevel') as HTMLSelectElement;
        populateSelectWithOptions(achievementLevelSelect, NAESIN_ACHIEVEMENT_LEVELS_STATIC, "성취도 선택", 'self', 'self');
        achievementLevelSelect.value = subject.achievementLevel || "";
        achievementLevelSelect.addEventListener('change', (e) => { subject.achievementLevel = (e.target as HTMLSelectElement).value || null; });
        
        const distAInput = rowDiv.querySelector('.naesin-subject-distributionA') as HTMLInputElement;
        distAInput.value = subject.distributionA?.toString() || '';
        distAInput.addEventListener('input', (e) => { subject.distributionA = parseFloat((e.target as HTMLInputElement).value) || null; });
        
        const distBInput = rowDiv.querySelector('.naesin-subject-distributionB') as HTMLInputElement;
        distBInput.value = subject.distributionB?.toString() || '';
        distBInput.addEventListener('input', (e) => { subject.distributionB = parseFloat((e.target as HTMLInputElement).value) || null; });

        const distCInput = rowDiv.querySelector('.naesin-subject-distributionC') as HTMLInputElement;
        distCInput.value = subject.distributionC?.toString() || '';
        distCInput.addEventListener('input', (e) => { subject.distributionC = parseFloat((e.target as HTMLInputElement).value) || null; });

        const removeButton = rowDiv.querySelector('.remove-subject-button') as HTMLButtonElement;
        removeButton.addEventListener('click', () => removeNaesinSubjectRow(year, semester, subject.id));
        
        container.appendChild(rowDiv);
    }
}

export function renderNaesinGradesFromState() {
    ([1,2] as const).forEach(year => {
        ([1,2] as const).forEach(semester => {
            renderNaesinSemester(year, semester);
        });
    });
    renderNaesinSemester(3, 1);
}

export function renderSuneungGradesFromState() {
    const s = userAllGrades.suneung;
    if(!suneungExamSelector || !suneungKoreanChoice || !suneungKoreanRaw || !suneungMathChoice || !suneungMathRaw || !suneungEnglishRaw || !suneungHistoryRaw || !suneungExplorer1Subject || !suneungExplorer1Raw || !suneungExplorer2Subject || !suneungExplorer2Raw) return;

    suneungExamSelector.value = s.examIdentifierForCutInfo;
    if (s.subjects.korean) { suneungKoreanChoice.value = s.subjects.korean.selectedOption || ''; suneungKoreanRaw.value = s.subjects.korean.rawScore?.toString() || ''; }
    if (s.subjects.math) { suneungMathChoice.value = s.subjects.math.selectedOption || ''; suneungMathRaw.value = s.subjects.math.rawScore?.toString() || ''; }
    if (s.subjects.english) { suneungEnglishRaw.value = s.subjects.english.rawScore?.toString() || ''; }
    if (s.subjects.history) { suneungHistoryRaw.value = s.subjects.history.rawScore?.toString() || ''; }
    if (s.subjects.explorer1) { suneungExplorer1Subject.value = s.subjects.explorer1.subjectName || ''; suneungExplorer1Raw.value = s.subjects.explorer1.rawScore?.toString() || ''; }
    if (s.subjects.explorer2) { suneungExplorer2Subject.value = s.subjects.explorer2.subjectName || ''; suneungExplorer2Raw.value = s.subjects.explorer2.rawScore?.toString() || ''; }
    
    updateAllSuneungCalculatedDisplays();
}

export function collectSuneungGradesFromForm() {
    if(!suneungExamSelector || !suneungKoreanChoice || !suneungKoreanRaw || !suneungMathChoice || !suneungMathRaw || !suneungEnglishRaw || !suneungHistoryRaw || !suneungExplorer1Subject || !suneungExplorer1Raw || !suneungExplorer2Subject || !suneungExplorer2Raw) return;

    const examId = suneungExamSelector.value;
    const [yearMonthStr, ] = examId.split('_');
    const year = parseInt(yearMonthStr.substring(0, 4));
    const month = parseInt(yearMonthStr.substring(4, 6));
    const currentSuneungState = userAllGrades.suneung;

    const newSuneungGrades: UserSuneungGrades = {
        examYear: year, examMonth: month, examIdentifierForCutInfo: examId,
        subjects: { 
            korean: {...(currentSuneungState.subjects.korean), selectedOption: suneungKoreanChoice.value, rawScore: parseFloat(suneungKoreanRaw.value) || null },
            math: {...(currentSuneungState.subjects.math), selectedOption: suneungMathChoice.value, rawScore: parseFloat(suneungMathRaw.value) || null },
            english: {...(currentSuneungState.subjects.english), rawScore: parseFloat(suneungEnglishRaw.value) || null },
            history: {...(currentSuneungState.subjects.history), rawScore: parseFloat(suneungHistoryRaw.value) || null },
            explorer1: {...(currentSuneungState.subjects.explorer1), subjectCode: suneungExplorer1Subject.selectedOptions[0]?.dataset.subjectCode || null, subjectName: suneungExplorer1Subject.value, rawScore: parseFloat(suneungExplorer1Raw.value) || null },
            explorer2: {...(currentSuneungState.subjects.explorer2), subjectCode: suneungExplorer2Subject.selectedOptions[0]?.dataset.subjectCode || null, subjectName: suneungExplorer2Subject.value, rawScore: parseFloat(suneungExplorer2Raw.value) || null }
        }
    };
    updateUserSuneungGrades(newSuneungGrades); 
    updateAllSuneungCalculatedDisplays(); 
}

function getScoreFromCutData(rawScore: number, cutData: ExamGradeCutMappingItem[]): Partial<UserSuneungSubjectDetailScore> {
    let foundMatch: Partial<UserSuneungSubjectDetailScore> = { grade: 9 }; 
    for (const item of cutData) { 
        if (item.rawScoreMin !== undefined && rawScore >= item.rawScoreMin) {
            if (item.rawScoreMax === undefined || rawScore <= item.rawScoreMax) {
                foundMatch = { standardScore: item.standardScore, percentile: item.percentile, grade: item.grade };
                break; 
            }
        } else if (item.rawScoreMin === undefined && item.rawScoreMax !== undefined && rawScore <= item.rawScoreMax) {
             foundMatch = { standardScore: item.standardScore, percentile: item.percentile, grade: item.grade };
             break;
        } else if (item.rawScoreMin === undefined && item.rawScoreMax === undefined) { 
             foundMatch = { grade: item.grade }; 
        }
    }
    if (foundMatch.standardScore === undefined) foundMatch.standardScore = rawScore; 
    if (foundMatch.percentile === undefined && foundMatch.grade) { 
         foundMatch.percentile = Math.max(0, Math.min(100, 100 - (foundMatch.grade * 11 - 5) + Math.floor(Math.random()*3) ));
    }
    return foundMatch;
}

export function updateSuneungCalculatedDisplay( subjectKey: keyof UserSuneungGrades['subjects'], divElement: HTMLDivElement | null ) {
    if (!divElement) return; 
    const suneungState = userAllGrades.suneung; 
    const subjectData = suneungState.subjects[subjectKey] as UserSuneungSubjectDetailScore | UserSuneungSubjectExplorerScore | undefined; 

    if (!subjectData || subjectData.rawScore === null || subjectData.rawScore === undefined || !currentSuneungExamCutInfo || !currentSuneungExamCutInfo.subjects) {
        divElement.innerHTML = '원점수 입력 또는 등급컷 정보 필요'; return;
    }

    let calculated: Partial<UserSuneungSubjectDetailScore> = { grade: 9, standardScore: 0, percentile: 0 }; 
    const rawScore = subjectData.rawScore; 
    const examCutSubjects = currentSuneungExamCutInfo.subjects; 

    let subjectNameForCuts: string | undefined; 
    let selectedOptionForCuts: string | undefined; 

    switch(subjectKey) {
        case 'korean': subjectNameForCuts = "국어"; selectedOptionForCuts = subjectData.selectedOption; break;
        case 'math': subjectNameForCuts = "수학"; selectedOptionForCuts = subjectData.selectedOption; break;
        case 'english': subjectNameForCuts = "영어"; break;
        case 'history': subjectNameForCuts = "한국사"; break;
        case 'explorer1': case 'explorer2': 
            subjectNameForCuts = (subjectData as UserSuneungSubjectExplorerScore).subjectName; 
            break;
    }
    
    if (subjectNameForCuts && examCutSubjects[subjectNameForCuts]) {
        const cutInfoForSubject = examCutSubjects[subjectNameForCuts];
        if (Array.isArray(cutInfoForSubject)) { 
            calculated = getScoreFromCutData(rawScore, cutInfoForSubject);
        } else if (selectedOptionForCuts && cutInfoForSubject[selectedOptionForCuts] && Array.isArray(cutInfoForSubject[selectedOptionForCuts])) { 
            calculated = getScoreFromCutData(rawScore, cutInfoForSubject[selectedOptionForCuts] as ExamGradeCutMappingItem[]);
        } else if (!selectedOptionForCuts && Array.isArray(Object.values(cutInfoForSubject)[0])) {
             console.warn(`No specific option for ${subjectNameForCuts}, or cut data structure mismatch. Using generic approach or first available.`);
        }
    }
    
    subjectData.standardScore = calculated.standardScore ?? subjectData.standardScore; 
    subjectData.percentile = calculated.percentile ?? subjectData.percentile;
    subjectData.grade = calculated.grade ?? subjectData.grade;

    divElement.innerHTML = `계산: 표준 ${subjectData.standardScore ?? 'N/A'}, 백분위 ${subjectData.percentile ?? 'N/A'}%, 등급 ${subjectData.grade ?? 'N/A'}`;
}

export function updateAllSuneungCalculatedDisplays() {
    if (!userAllGrades.suneung) return; 
    updateSuneungCalculatedDisplay('korean', suneungKoreanCalculatedDiv);
    updateSuneungCalculatedDisplay('math', suneungMathCalculatedDiv);
    updateSuneungCalculatedDisplay('english', suneungEnglishCalculatedDiv);
    updateSuneungCalculatedDisplay('history', suneungHistoryCalculatedDiv);
    updateSuneungCalculatedDisplay('explorer1', suneungExplorer1CalculatedDiv);
    updateSuneungCalculatedDisplay('explorer2', suneungExplorer2CalculatedDiv);
}

// --- Suneung JSON Import/Export ---
export function saveSuneungGradesToJsonFile() {
    collectSuneungGradesFromForm(); // Ensure latest Suneung grades are in state
    try {
        const dataStr = JSON.stringify(userAllGrades.suneung, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `suneung_grades_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("수능 성적이 JSON 파일로 저장되었습니다.");
    } catch (error) {
        console.error("Error saving Suneung grades to JSON file:", error);
        alert("수능 성적 저장 중 오류가 발생했습니다.");
    }
}

export function loadSuneungGradesFromJsonFile(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const jsonText = e.target?.result as string;
            const parsedSuneungGrades = JSON.parse(jsonText) as UserSuneungGrades;

            if (parsedSuneungGrades.examIdentifierForCutInfo && parsedSuneungGrades.subjects) {
                const defaultSuneungGrades = initializeGlobalUserAllGrades().suneung;
                const mergedSuneung: UserSuneungGrades = {
                    ...defaultSuneungGrades, // Start with defaults
                    examYear: parsedSuneungGrades.examYear || defaultSuneungGrades.examYear,
                    examMonth: parsedSuneungGrades.examMonth || defaultSuneungGrades.examMonth,
                    examIdentifierForCutInfo: parsedSuneungGrades.examIdentifierForCutInfo,
                    subjects: { // Deep merge subjects
                        korean: {...defaultSuneungGrades.subjects.korean, ...parsedSuneungGrades.subjects?.korean},
                        math: {...defaultSuneungGrades.subjects.math, ...parsedSuneungGrades.subjects?.math},
                        english: {...defaultSuneungGrades.subjects.english, ...parsedSuneungGrades.subjects?.english},
                        history: {...defaultSuneungGrades.subjects.history, ...parsedSuneungGrades.subjects?.history},
                        explorer1: {...defaultSuneungGrades.subjects.explorer1, ...parsedSuneungGrades.subjects?.explorer1},
                        explorer2: {...defaultSuneungGrades.subjects.explorer2, ...parsedSuneungGrades.subjects?.explorer2},
                    }
                };
                
                // Update only the Suneung part of the global state
                const newAllGrades = {...userAllGrades, suneung: mergedSuneung };
                setUserAllGrades(newAllGrades);
                
                renderSuneungGradesFromState();
                
                if(suneungExamSelector && userAllGrades.suneung.examIdentifierForCutInfo) {
                     suneungExamSelector.value = userAllGrades.suneung.examIdentifierForCutInfo; 
                     await apiFetchSuneungExamCutInfo(suneungExamSelector.value);
                     collectSuneungGradesFromForm();
                }
                alert("수능 성적을 파일에서 불러왔습니다.");
            } else {
                alert("불러온 파일이 유효한 수능 성적 데이터 형식이 아닙니다.");
            }
        } catch (err) {
            console.error("Error parsing Suneung JSON or applying grades:", err);
            alert("수능 성적 파일을 읽거나 적용하는 중 오류가 발생했습니다.");
        } finally {
            fileInput.value = '';
        }
    };
    reader.readAsText(file);
}

// --- Naesin XLS Import/Export ---
export function saveNaesinGradesToXlsFile() {
    try {
        const naesinData = userAllGrades.naesin;
        const xlsData: any[] = [];
        const header = [
            "학년", "교과구분종류", "교과", "과목", 
            "1학기 단위수", "1학기 석차등급", "1학기 원점수", "1학기 평균점수", "1학기 표준편차", "1학기 수강자수", "1학기 성취도", "1학기 성취도별분포(A)", "1학기 성취도별분포(B)", "1학기 성취도별분포(C)",
            "2학기 단위수", "2학기 석차등급", "2학기 원점수", "2학기 평균점수", "2학기 표준편차", "2학기 수강자수", "2학기 성취도", "2학기 성취도별분포(A)", "2학기 성취도별분포(B)", "2학기 성취도별분포(C)"
        ];

        // Group subjects by year, curriculumAreaName, and subjectName to combine semesters
        const groupedSubjects: Record<string, { year: number, curriculumAreaName?: string, subjectName: string, s1?: UserNaesinSubject, s2?: UserNaesinSubject }> = {};

        for (const year of [1, 2, 3] as const) {
            const yearKey = `year${year}` as keyof UserNaesinGrades;
            for (const semester of [1, 2] as const) {
                if (year === 3 && semester === 2) continue; // Skip 3rd year, 2nd semester

                const semesterKey = `semester${semester}` as keyof UserNaesinYearData;
                naesinData[yearKey][semesterKey].subjects.forEach(subject => {
                    const groupKey = `${year}-${subject.curriculumAreaName}-${subject.subjectName}`;
                    if (!groupedSubjects[groupKey]) {
                        groupedSubjects[groupKey] = { year, curriculumAreaName: subject.curriculumAreaName, subjectName: subject.subjectName };
                    }
                    if (semester === 1) groupedSubjects[groupKey].s1 = subject;
                    if (semester === 2) groupedSubjects[groupKey].s2 = subject;
                });
            }
        }
        
        Object.values(groupedSubjects).forEach(group => {
            const s1 = group.s1;
            const s2 = group.s2;
            xlsData.push({
                "학년": group.year,
                "교과구분종류": group.curriculumAreaName || "",
                "교과": group.curriculumAreaName || "",
                "과목": group.subjectName,
                "1학기 단위수": s1?.credits ?? "",
                "1학기 석차등급": s1?.grade ?? "",
                "1학기 원점수": s1?.rawScore ?? "",
                "1학기 평균점수": s1?.subjectMean ?? "",
                "1학기 표준편차": s1?.stdDev ?? "",
                "1학기 수강자수": s1?.studentCount ?? "",
                "1학기 성취도": s1?.achievementLevel ?? "",
                "1학기 성취도별분포(A)": s1?.distributionA ?? "",
                "1학기 성취도별분포(B)": s1?.distributionB ?? "",
                "1학기 성취도별분포(C)": s1?.distributionC ?? "",
                "2학기 단위수": (group.year === 3) ? "" : (s2?.credits ?? ""), // 3학년 2학기 공백
                "2학기 석차등급": (group.year === 3) ? "" : (s2?.grade ?? ""),
                "2학기 원점수": (group.year === 3) ? "" : (s2?.rawScore ?? ""),
                "2학기 평균점수": (group.year === 3) ? "" : (s2?.subjectMean ?? ""),
                "2학기 표준편차": (group.year === 3) ? "" : (s2?.stdDev ?? ""),
                "2학기 수강자수": (group.year === 3) ? "" : (s2?.studentCount ?? ""),
                "2학기 성취도": (group.year === 3) ? "" : (s2?.achievementLevel ?? ""),
                "2학기 성취도별분포(A)": (group.year === 3) ? "" : (s2?.distributionA ?? ""),
                "2학기 성취도별분포(B)": (group.year === 3) ? "" : (s2?.distributionB ?? ""),
                "2학기 성취도별분포(C)": (group.year === 3) ? "" : (s2?.distributionC ?? ""),
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(xlsData, { header: header, skipHeader: false });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "내신성적");
        XLSX.writeFile(workbook, `내신성적_${new Date().toISOString().slice(0,10)}.xlsx`);
        alert("내신 성적이 XLS 파일로 저장되었습니다.");

    } catch (error) {
        console.error("Error saving Naesin grades to XLS file:", error);
        alert("내신 성적 XLS 저장 중 오류가 발생했습니다.");
    }
}

export function loadNaesinGradesFromXlsFile(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]; // header:1 for array of arrays

            if (jsonData.length < 2) { // Header + at least one data row
                alert("XLS 파일에 유효한 데이터가 없습니다.");
                return;
            }
            
            const headers = jsonData[0].map(h => String(h).trim());
            // Expected headers for validation (can be more robust)
            const expectedHeaders = ["학년", "교과", "과목"]; 
            if (!expectedHeaders.every(eh => headers.includes(eh))) {
                alert("XLS 파일의 헤더가 올바르지 않습니다. (학년, 교과, 과목 등 필요)");
                return;
            }

            const newNaesinGrades = initializeGlobalUserAllGrades().naesin; // Start with a fresh structure

            for (let i = 1; i < jsonData.length; i++) {
                const rowArray = jsonData[i];
                const row: Record<string, any> = {};
                headers.forEach((header, index) => {
                    row[header] = rowArray[index];
                });

                const year = parseInt(row["학년"]);
                const curriculumName = String(row["교과구분종류"] || row["교과"] || "").trim();
                const subjectName = String(row["과목"] || "").trim();

                if (!year || !curriculumName || !subjectName) continue; // Skip rows with missing core info

                const curriculumArea = curriculumAreasFromApi.find(ca => ca.subjectName === curriculumName);
                const curriculumAreaCode = curriculumArea?.subjectCode || null;

                // Find subjectCode based on curriculumAreaCode and subjectName (from naesinAllRawSubjectsFromApi)
                // This assumes naesinAllRawSubjectsFromApi has parentCode for curriculum.
                // Or, an API call might be needed if not pre-fetched. For simplicity:
                const subjectInfo = naesinAllRawSubjectsFromApi.find(s => s.subjectName === subjectName && (s.parentCode === curriculumAreaCode || !curriculumAreaCode));
                const subjectCode = subjectInfo?.subjectCode || null;


                const processSemester = (semester: 1 | 2) => {
                    const prefix = `${semester}학기 `;
                    const credits = parseFloat(row[`${prefix}단위수`]);
                    if (isNaN(credits) || credits <=0) return null; // If no credits, assume no subject for this semester

                    return {
                        id: `xls${Date.now()}${Math.random().toString(16).slice(2)}`,
                        curriculumAreaCode: curriculumAreaCode,
                        curriculumAreaName: curriculumName,
                        subjectCode: subjectCode,
                        subjectName: subjectName,
                        credits: credits,
                        grade: parseFloat(row[`${prefix}석차등급`]) || null,
                        rawScore: parseFloat(row[`${prefix}원점수`]) || null,
                        subjectMean: parseFloat(row[`${prefix}평균점수`]) || null,
                        stdDev: parseFloat(row[`${prefix}표준편차`]) || null,
                        studentCount: parseInt(row[`${prefix}수강자수`]) || null,
                        achievementLevel: String(row[`${prefix}성취도`] || "").trim() || null,
                        distributionA: parseFloat(row[`${prefix}성취도별분포(A)`]) || null,
                        distributionB: parseFloat(row[`${prefix}성취도별분포(B)`]) || null,
                        distributionC: parseFloat(row[`${prefix}성취도별분포(C)`]) || null,
                    };
                };

                const yearKey = `year${year}` as keyof UserNaesinGrades;
                if (!newNaesinGrades[yearKey]) continue;

                const s1Subject = processSemester(1);
                if (s1Subject) newNaesinGrades[yearKey].semester1.subjects.push(s1Subject);

                if (year < 3) { // Only process semester 2 for year 1 and 2
                    const s2Subject = processSemester(2);
                    if (s2Subject) newNaesinGrades[yearKey].semester2.subjects.push(s2Subject);
                }
            }
            
            const newAllGrades = {...userAllGrades, naesin: newNaesinGrades };
            setUserAllGrades(newAllGrades);
            renderNaesinGradesFromState();
            alert("내신 성적을 XLS 파일에서 불러왔습니다.");

        } catch (err) {
            console.error("Error processing XLS file:", err);
            alert("내신 성적 XLS 파일을 읽거나 적용하는 중 오류가 발생했습니다.");
        } finally {
            fileInput.value = '';
        }
    };
    reader.readAsBinaryString(file);
}