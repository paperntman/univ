// 이 파일은 성적 입력 모달과 관련된 모든 기능을 담당합니다.
// 모달 DOM 요소 초기화, 모달 열기/닫기, 탭 전환 로직,
// 내신 및 수능 성적 입력 폼 렌더링, 사용자 입력 데이터 수집,
// 계산된 수능 점수(표준점수, 백분위, 등급) 표시 업데이트,
// 성적 데이터를 파일로 저장하거나 파일에서 불러오는 기능 등을 포함합니다.

import {
    UserAllGrades, UserNaesinSubject, ApiSubjectInfo, UserSuneungGrades, ExamGradeCutMappingItem, UserSuneungSubjectDetailScore, UserSuneungSubjectExplorerScore,
    UserNaesinGrades, UserNaesinYearData
} from './types';
import {
    userAllGrades, setUserAllGrades,
    curriculumClassificationsFromApi, // 교과구분종류 목록
    naesinAllRawSubjectsFromApi, // 모든 내신 과목 원시 목록
    suneungExplorerSubjectsFromApi, suneungKoreanOptionsFromApi, suneungMathOptionsFromApi,
    // currentSuneungExamCutInfo, // Removed
    updateUserSuneungGrades,
    initializeUserAllGrades as initializeGlobalUserAllGrades
} from './state';
import {
    // fetchSuneungExamCutInfo as apiFetchSuneungExamCutInfo, // Removed
    fetchCurriculumsForClassificationApi,
    fetchSubjectsForCurriculumApi
} from './api';
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
// let suneungKoreanCalculatedDiv: HTMLDivElement | null = null; // Removed
let suneungMathChoice: HTMLSelectElement | null = null;
let suneungMathRaw: HTMLInputElement | null = null;
// let suneungMathCalculatedDiv: HTMLDivElement | null = null; // Removed
let suneungEnglishRaw: HTMLInputElement | null = null;
// let suneungEnglishCalculatedDiv: HTMLDivElement | null = null; // Removed
let suneungHistoryRaw: HTMLInputElement | null = null;
// let suneungHistoryCalculatedDiv: HTMLDivElement | null = null; // Removed
let suneungExplorer1Subject: HTMLSelectElement | null = null;
let suneungExplorer1Raw: HTMLInputElement | null = null;
// let suneungExplorer1CalculatedDiv: HTMLDivElement | null = null; // Removed
let suneungExplorer2Subject: HTMLSelectElement | null = null;
let suneungExplorer2Raw: HTMLInputElement | null = null;
// let suneungExplorer2CalculatedDiv: HTMLDivElement | null = null; // Removed

export function initializeGradeModalDOM(elements: {
    gradeInputModal: HTMLDivElement,
    modalTabsElements: NodeListOf<Element>,
    modalTabContentsElements: NodeListOf<Element>,
    naesinSubjectRowTemplate: HTMLTemplateElement,
    naesinGradeFormDivs: { [key: string]: HTMLDivElement | null },
    suneungExamSelector: HTMLSelectElement,
    suneungKoreanChoice: HTMLSelectElement, suneungKoreanRaw: HTMLInputElement,
    suneungMathChoice: HTMLSelectElement, suneungMathRaw: HTMLInputElement,
    suneungEnglishRaw: HTMLInputElement,
    suneungHistoryRaw: HTMLInputElement,
    suneungExplorer1Subject: HTMLSelectElement, suneungExplorer1Raw: HTMLInputElement,
    suneungExplorer2Subject: HTMLSelectElement, suneungExplorer2Raw: HTMLInputElement,
}) {
    gradeInputModal = elements.gradeInputModal;
    modalTabsElements = elements.modalTabsElements;
    modalTabContentsElements = elements.modalTabContentsElements;
    naesinSubjectRowTemplate = elements.naesinSubjectRowTemplate;
    naesinGradeFormDivs = elements.naesinGradeFormDivs;

    suneungExamSelector = elements.suneungExamSelector;
    suneungKoreanChoice = elements.suneungKoreanChoice;
    suneungKoreanRaw = elements.suneungKoreanRaw;
    // suneungKoreanCalculatedDiv = elements.suneungKoreanCalculatedDiv; // Removed
    suneungMathChoice = elements.suneungMathChoice;
    suneungMathRaw = elements.suneungMathRaw;
    // suneungMathCalculatedDiv = elements.suneungMathCalculatedDiv; // Removed
    suneungEnglishRaw = elements.suneungEnglishRaw;
    // suneungEnglishCalculatedDiv = elements.suneungEnglishCalculatedDiv; // Removed
    suneungHistoryRaw = elements.suneungHistoryRaw;
    // suneungHistoryCalculatedDiv = elements.suneungHistoryCalculatedDiv; // Removed
    suneungExplorer1Subject = elements.suneungExplorer1Subject;
    suneungExplorer1Raw = elements.suneungExplorer1Raw;
    // suneungExplorer1CalculatedDiv = elements.suneungExplorer1CalculatedDiv; // Removed
    suneungExplorer2Subject = elements.suneungExplorer2Subject;
    suneungExplorer2Raw = elements.suneungExplorer2Raw;
    // suneungExplorer2CalculatedDiv = elements.suneungExplorer2CalculatedDiv; // Removed
}

export function openGradeModal() {
    if (!gradeInputModal) return;
    populateSuneungSubjectDropdowns();
    renderNaesinGradesFromState();
    renderSuneungGradesFromState(); // This will now only render raw scores
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
    } else if (selectElement.options.length > 0 && !clearFirst && !currentValue) {
        // If not clearing first (meaning appending), and no current value, don't auto-select first.
    } else if (selectElement.options.length > 1 && clearFirst && placeholder && selectElement.options[0].value === "") {
        // Default to placeholder
    } else if (selectElement.options.length > 0 && !currentValue) {
        // selectElement.value = selectElement.options[0].value; // Do not auto-select first if not intended
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
        curriculumClassificationCode: null, curriculumClassificationName: "",
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

        const classificationSelect = rowDiv.querySelector('.naesin-subject-classification') as HTMLSelectElement;
        const curriculumSelect = rowDiv.querySelector('.naesin-subject-curriculum') as HTMLSelectElement;
        const nameSelect = rowDiv.querySelector('.naesin-subject-name') as HTMLSelectElement;

        populateSelectWithOptions(classificationSelect, curriculumClassificationsFromApi, "구분 선택", 'subjectCode', 'subjectName');
        classificationSelect.value = subject.curriculumClassificationCode || "";

        curriculumSelect.innerHTML = '<option value="">교과 선택</option>';
        if (subject.curriculumClassificationCode) {
            const curriculumsForClassification = await fetchCurriculumsForClassificationApi(subject.curriculumClassificationCode);
            populateSelectWithOptions(curriculumSelect, curriculumsForClassification, "교과 선택", 'subjectCode', 'subjectName', false);
            curriculumSelect.value = subject.curriculumAreaCode || "";
        }

        nameSelect.innerHTML = '<option value="">과목 선택</option>';
        if (subject.curriculumAreaCode) {
            const subjectsForCurriculum = await fetchSubjectsForCurriculumApi(subject.curriculumAreaCode);
            populateSelectWithOptions(nameSelect, subjectsForCurriculum, "과목 선택", 'subjectCode', 'subjectName', false);
            nameSelect.value = subject.subjectCode || "";
        }

        classificationSelect.addEventListener('change', async (e) => {
            const selectedClassificationCode = (e.target as HTMLSelectElement).value;
            const selectedOption = (e.target as HTMLSelectElement).selectedOptions[0];
            subject.curriculumClassificationCode = selectedClassificationCode;
            subject.curriculumClassificationName = selectedOption.dataset.subjectName || selectedOption.textContent || "";
            subject.curriculumAreaCode = null; subject.curriculumAreaName = "";
            subject.subjectCode = null; subject.subjectName = "";
            curriculumSelect.innerHTML = '<option value="">교과 로딩 중...</option>';
            nameSelect.innerHTML = '<option value="">과목 선택</option>';
            if (selectedClassificationCode) {
                const curriculums = await fetchCurriculumsForClassificationApi(selectedClassificationCode);
                populateSelectWithOptions(curriculumSelect, curriculums, "교과 선택");
            } else {
                curriculumSelect.innerHTML = '<option value="">교과 선택</option>';
            }
        });

        curriculumSelect.addEventListener('change', async (e) => {
            const selectedCurriculumCode = (e.target as HTMLSelectElement).value;
            const selectedOption = (e.target as HTMLSelectElement).selectedOptions[0];
            subject.curriculumAreaCode = selectedCurriculumCode;
            subject.curriculumAreaName = selectedOption.dataset.subjectName || selectedOption.textContent || "";
            subject.subjectCode = null; subject.subjectName = "";
            nameSelect.innerHTML = '<option value="">과목 로딩 중...</option>';
            if (selectedCurriculumCode) {
                const subjects = await fetchSubjectsForCurriculumApi(selectedCurriculumCode);
                populateSelectWithOptions(nameSelect, subjects, "과목 선택");
            } else {
                nameSelect.innerHTML = '<option value="">과목 선택</option>';
            }
        });

        nameSelect.addEventListener('change', (e) => {
            const selectedOption = (e.target as HTMLSelectElement).selectedOptions[0];
            subject.subjectCode = selectedOption.value;
            subject.subjectName = selectedOption.dataset.subjectName || selectedOption.textContent || "";
        });

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
    // Calculated score display is removed
}

export function collectSuneungGradesFromForm() {
    if(!suneungExamSelector || !suneungKoreanChoice || !suneungKoreanRaw || !suneungMathChoice || !suneungMathRaw || !suneungEnglishRaw || !suneungHistoryRaw || !suneungExplorer1Subject || !suneungExplorer1Raw || !suneungExplorer2Subject || !suneungExplorer2Raw) return;

    const examId = suneungExamSelector.value;
    const [yearMonthStr, ] = examId.split('_');
    const year = parseInt(yearMonthStr.substring(0, 4));
    const month = parseInt(yearMonthStr.substring(4, 6));

    const newSuneungGrades: UserSuneungGrades = {
        examYear: year, examMonth: month, examIdentifierForCutInfo: examId,
        subjects: {
            korean: { 
                selectedOption: suneungKoreanChoice.value, 
                rawScore: parseFloat(suneungKoreanRaw.value) || null,
                standardScore: null, percentile: null, grade: null // Explicitly null
            },
            math: { 
                selectedOption: suneungMathChoice.value, 
                rawScore: parseFloat(suneungMathRaw.value) || null,
                standardScore: null, percentile: null, grade: null // Explicitly null
            },
            english: { 
                rawScore: parseFloat(suneungEnglishRaw.value) || null,
                standardScore: null, percentile: null, grade: null // Explicitly null
            },
            history: { 
                rawScore: parseFloat(suneungHistoryRaw.value) || null,
                standardScore: null, percentile: null, grade: null // Explicitly null
            },
            explorer1: { 
                subjectCode: suneungExplorer1Subject.selectedOptions[0]?.dataset.subjectCode || null, 
                subjectName: suneungExplorer1Subject.value, 
                rawScore: parseFloat(suneungExplorer1Raw.value) || null,
                standardScore: null, percentile: null, grade: null // Explicitly null
            },
            explorer2: { 
                subjectCode: suneungExplorer2Subject.selectedOptions[0]?.dataset.subjectCode || null, 
                subjectName: suneungExplorer2Subject.value, 
                rawScore: parseFloat(suneungExplorer2Raw.value) || null,
                standardScore: null, percentile: null, grade: null // Explicitly null
            }
        }
    };
    updateUserSuneungGrades(newSuneungGrades);
    // No client-side calculation display update
}

// --- Suneung JSON Import/Export ---
export function saveSuneungGradesToJsonFile() {
    collectSuneungGradesFromForm(); // Ensure latest Suneung grades (raw scores only) are in state
    try {
        // Create a slim version of suneung grades for saving, only raw scores and identifiers
        const suneungToSave: Partial<UserSuneungGrades> = {
            examIdentifierForCutInfo: userAllGrades.suneung.examIdentifierForCutInfo,
            examYear: userAllGrades.suneung.examYear,
            examMonth: userAllGrades.suneung.examMonth,
            subjects: {}
        };
        (Object.keys(userAllGrades.suneung.subjects) as Array<keyof UserSuneungGrades['subjects']>).forEach(key => {
            const subj = userAllGrades.suneung.subjects[key];
            if (subj) {
                const base = { rawScore: subj.rawScore };
                if ('selectedOption' in subj && subj.selectedOption) (base as any).selectedOption = subj.selectedOption;
                if ('subjectName' in subj && subj.subjectName) (base as any).subjectName = subj.subjectName;
                if ('subjectCode' in subj && subj.subjectCode) (base as any).subjectCode = subj.subjectCode;
                suneungToSave.subjects![key] = base as any;
            }
        });


        const dataStr = JSON.stringify(suneungToSave, null, 2);
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
            // Type casting to a structure that might only contain raw scores
            const parsedSuneungFromFile = JSON.parse(jsonText) as Partial<UserSuneungGrades>;

            if (parsedSuneungFromFile.examIdentifierForCutInfo && parsedSuneungFromFile.subjects) {
                const defaultSuneungGrades = initializeGlobalUserAllGrades().suneung;
                
                const mergedSuneung: UserSuneungGrades = {
                    examYear: parsedSuneungFromFile.examYear || defaultSuneungGrades.examYear,
                    examMonth: parsedSuneungFromFile.examMonth || defaultSuneungGrades.examMonth,
                    examIdentifierForCutInfo: parsedSuneungFromFile.examIdentifierForCutInfo,
                    subjects: {
                        korean: {
                            ...defaultSuneungGrades.subjects.korean,
                            selectedOption: parsedSuneungFromFile.subjects.korean?.selectedOption || defaultSuneungGrades.subjects.korean?.selectedOption,
                            rawScore: parsedSuneungFromFile.subjects.korean?.rawScore !== undefined ? parsedSuneungFromFile.subjects.korean.rawScore : defaultSuneungGrades.subjects.korean?.rawScore,
                            standardScore: null, percentile: null, grade: null
                        },
                        math: {
                            ...defaultSuneungGrades.subjects.math,
                            selectedOption: parsedSuneungFromFile.subjects.math?.selectedOption || defaultSuneungGrades.subjects.math?.selectedOption,
                            rawScore: parsedSuneungFromFile.subjects.math?.rawScore !== undefined ? parsedSuneungFromFile.subjects.math.rawScore : defaultSuneungGrades.subjects.math?.rawScore,
                            standardScore: null, percentile: null, grade: null
                        },
                        english: {
                            ...defaultSuneungGrades.subjects.english,
                            rawScore: parsedSuneungFromFile.subjects.english?.rawScore !== undefined ? parsedSuneungFromFile.subjects.english.rawScore : defaultSuneungGrades.subjects.english?.rawScore,
                            standardScore: null, percentile: null, grade: null
                        },
                        history: {
                            ...defaultSuneungGrades.subjects.history,
                            rawScore: parsedSuneungFromFile.subjects.history?.rawScore !== undefined ? parsedSuneungFromFile.subjects.history.rawScore : defaultSuneungGrades.subjects.history?.rawScore,
                            standardScore: null, percentile: null, grade: null
                        },
                        explorer1: {
                            ...defaultSuneungGrades.subjects.explorer1,
                            subjectName: (parsedSuneungFromFile.subjects.explorer1 as UserSuneungSubjectExplorerScore)?.subjectName || defaultSuneungGrades.subjects.explorer1?.subjectName,
                            subjectCode: (parsedSuneungFromFile.subjects.explorer1 as UserSuneungSubjectExplorerScore)?.subjectCode || defaultSuneungGrades.subjects.explorer1?.subjectCode,
                            rawScore: parsedSuneungFromFile.subjects.explorer1?.rawScore !== undefined ? parsedSuneungFromFile.subjects.explorer1.rawScore : defaultSuneungGrades.subjects.explorer1?.rawScore,
                            standardScore: null, percentile: null, grade: null
                        },
                        explorer2: {
                            ...defaultSuneungGrades.subjects.explorer2,
                            subjectName: (parsedSuneungFromFile.subjects.explorer2 as UserSuneungSubjectExplorerScore)?.subjectName || defaultSuneungGrades.subjects.explorer2?.subjectName,
                            subjectCode: (parsedSuneungFromFile.subjects.explorer2 as UserSuneungSubjectExplorerScore)?.subjectCode || defaultSuneungGrades.subjects.explorer2?.subjectCode,
                            rawScore: parsedSuneungFromFile.subjects.explorer2?.rawScore !== undefined ? parsedSuneungFromFile.subjects.explorer2.rawScore : defaultSuneungGrades.subjects.explorer2?.rawScore,
                            standardScore: null, percentile: null, grade: null
                        },
                    }
                };

                const newAllGrades = {...userAllGrades, suneung: mergedSuneung };
                setUserAllGrades(newAllGrades);
                renderSuneungGradesFromState(); // This will set the suneungExamSelector.value

                if(suneungExamSelector && userAllGrades.suneung.examIdentifierForCutInfo) {
                     // Removed: await apiFetchSuneungExamCutInfo(suneungExamSelector.value);
                     collectSuneungGradesFromForm(); // To update state based on the (potentially newly set) examId from selector
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

        const groupedSubjects: Record<string, { year: number, curriculumClassificationName?: string, curriculumAreaName?: string, subjectName: string, s1?: UserNaesinSubject, s2?: UserNaesinSubject }> = {};

        for (const year of [1, 2, 3] as const) {
            const yearKey = `year${year}` as keyof UserNaesinGrades;
            for (const semester of [1, 2] as const) {
                if (year === 3 && semester === 2) continue; 

                const semesterKey = `semester${semester}` as keyof UserNaesinYearData;
                naesinData[yearKey][semesterKey].subjects.forEach(subject => {
                    const groupKey = `${year}-${subject.curriculumClassificationName}-${subject.curriculumAreaName}-${subject.subjectName}`;
                    if (!groupedSubjects[groupKey]) {
                        groupedSubjects[groupKey] = {
                            year,
                            curriculumClassificationName: subject.curriculumClassificationName,
                            curriculumAreaName: subject.curriculumAreaName,
                            subjectName: subject.subjectName
                        };
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
                "교과구분종류": group.curriculumClassificationName || "",
                "교과": group.curriculumAreaName || "",
                "과목": group.subjectName,
                "1학기 단위수": s1?.credits ?? "", "1학기 석차등급": s1?.grade ?? "", "1학기 원점수": s1?.rawScore ?? "", "1학기 평균점수": s1?.subjectMean ?? "", "1학기 표준편차": s1?.stdDev ?? "", "1학기 수강자수": s1?.studentCount ?? "", "1학기 성취도": s1?.achievementLevel ?? "", "1학기 성취도별분포(A)": s1?.distributionA ?? "", "1학기 성취도별분포(B)": s1?.distributionB ?? "", "1학기 성취도별분포(C)": s1?.distributionC ?? "",
                "2학기 단위수": (group.year === 3) ? "" : (s2?.credits ?? ""), "2학기 석차등급": (group.year === 3) ? "" : (s2?.grade ?? ""), "2학기 원점수": (group.year === 3) ? "" : (s2?.rawScore ?? ""), "2학기 평균점수": (group.year === 3) ? "" : (s2?.subjectMean ?? ""), "2학기 표준편차": (group.year === 3) ? "" : (s2?.stdDev ?? ""), "2학기 수강자수": (group.year === 3) ? "" : (s2?.studentCount ?? ""), "2학기 성취도": (group.year === 3) ? "" : (s2?.achievementLevel ?? ""), "2학기 성취도별분포(A)": (group.year === 3) ? "" : (s2?.distributionA ?? ""), "2학기 성취도별분포(B)": (group.year === 3) ? "" : (s2?.distributionB ?? ""), "2학기 성취도별분포(C)": (group.year === 3) ? "" : (s2?.distributionC ?? ""),
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

export async function loadNaesinGradesFromXlsFile(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (jsonData.length < 2) {
                alert("XLS 파일에 유효한 데이터가 없습니다."); return;
            }

            const headers = jsonData[0].map(h => String(h).trim());
            const expectedHeaders = ["학년", "교과구분종류", "교과", "과목"];
            if (!expectedHeaders.every(eh => headers.includes(eh))) {
                alert("XLS 파일의 헤더가 올바르지 않습니다. (학년, 교과구분종류, 교과, 과목 등 필요)"); return;
            }

            const newNaesinGrades = initializeGlobalUserAllGrades().naesin;

            for (let i = 1; i < jsonData.length; i++) {
                const rowArray = jsonData[i];
                const row: Record<string, any> = {};
                headers.forEach((header, index) => { row[header] = rowArray[index]; });

                const year = parseInt(row["학년"]);
                const classificationName = String(row["교과구분종류"] || "").trim();
                const curriculumName = String(row["교과"] || "").trim();
                const subjectName = String(row["과목"] || "").trim();

                if (!year || !classificationName || !curriculumName || !subjectName) continue;

                const classificationInfo = curriculumClassificationsFromApi.find(c => c.subjectName === classificationName);
                const classificationCode = classificationInfo?.subjectCode || null;
                let curriculumCode: string | null = null;
                if (classificationCode) {
                    const curriculumsForClassification = await fetchCurriculumsForClassificationApi(classificationCode);
                    const curriculumInfo = curriculumsForClassification.find(c => c.subjectName === curriculumName);
                    curriculumCode = curriculumInfo?.subjectCode || null;
                }
                let subjectCodeVal: string | null = null;
                if (curriculumCode) {
                    const subjectsForCurriculum = await fetchSubjectsForCurriculumApi(curriculumCode);
                    const subjectInfoFromFile = subjectsForCurriculum.find(s => s.subjectName === subjectName);
                    subjectCodeVal = subjectInfoFromFile?.subjectCode || null;
                }

                const processSemester = (semester: 1 | 2) => {
                    const prefix = `${semester}학기 `;
                    const credits = parseFloat(row[`${prefix}단위수`]);
                    if (isNaN(credits) || credits <=0) return null;
                    return {
                        id: `xls${Date.now()}${Math.random().toString(16).slice(2)}`,
                        curriculumClassificationCode: classificationCode, curriculumClassificationName: classificationName,
                        curriculumAreaCode: curriculumCode, curriculumAreaName: curriculumName,
                        subjectCode: subjectCodeVal, subjectName: subjectName,
                        credits: credits, grade: parseFloat(row[`${prefix}석차등급`]) || null,
                        rawScore: parseFloat(row[`${prefix}원점수`]) || null, subjectMean: parseFloat(row[`${prefix}평균점수`]) || null, stdDev: parseFloat(row[`${prefix}표준편차`]) || null,
                        studentCount: parseInt(row[`${prefix}수강자수`]) || null, achievementLevel: String(row[`${prefix}성취도`] || "").trim() || null,
                        distributionA: parseFloat(row[`${prefix}성취도별분포(A)`]) || null, distributionB: parseFloat(row[`${prefix}성취도별분포(B)`]) || null, distributionC: parseFloat(row[`${prefix}성취도별분포(C)`]) || null,
                    };
                };

                const yearKey = `year${year}` as keyof UserNaesinGrades;
                if (!newNaesinGrades[yearKey]) continue;
                const s1Subject = processSemester(1);
                if (s1Subject) newNaesinGrades[yearKey].semester1.subjects.push(s1Subject);
                if (year < 3) {
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