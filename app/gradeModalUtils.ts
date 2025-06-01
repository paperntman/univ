// 이 파일은 성적 입력 모달과 관련된 모든 기능을 담당합니다.
// 모달 DOM 요소 초기화, 모달 열기/닫기, 탭 전환 로직,
// 내신 및 수능 성적 입력 폼 렌더링, 사용자 입력 데이터 수집,
// 계산된 수능 점수(표준점수, 백분위, 등급) 표시 업데이트,
// 성적 데이터를 파일로 저장하거나 파일에서 불러오는 기능 등을 포함합니다.

import {
    UserAllGrades, UserNaesinSubject, ApiSubjectInfo, SuneungExamCutInfoFromAPI, UserSuneungGrades, ExamGradeCutSubjectData, ExamGradeCutMappingItem, UserSuneungSubjectDetailScore, UserSuneungSubjectExplorerScore
} from './types';
import { 
    userAllGrades, setUserAllGrades, // 사용자 전체 성적 상태 및 세터
    naesinSubjectsFromApi, suneungExplorerSubjectsFromApi, suneungKoreanOptionsFromApi, suneungMathOptionsFromApi, // API에서 가져온 과목 목록 상태
    currentSuneungExamCutInfo, // 현재 수능 등급컷 정보 상태
    updateUserSuneungGrades, // 수능 성적 업데이트 함수
    initializeUserAllGrades as initializeGlobalUserAllGrades // 전역 사용자 성적 초기화 함수
} from './state';
import { fetchSuneungExamCutInfo as apiFetchSuneungExamCutInfo } from './api'; // api.ts의 fetchSuneungExamCutInfo 임포트 (이름 충돌 방지)

// --- DOM 요소 변수 선언 ---
let gradeInputModal: HTMLDivElement | null = null; // 성적 입력 모달 전체
let modalTabsElements: NodeListOf<Element> | null = null; // 모달 탭 버튼 목록
let modalTabContentsElements: NodeListOf<Element> | null = null; // 모달 탭 콘텐츠 목록
let naesinSubjectRowTemplate: HTMLTemplateElement | null = null; // 내신 과목 행 템플릿
let naesinGradeFormDivs: { [key: string]: HTMLDivElement | null } = {}; // 내신 학년-학기별 과목 입력 영역 div (예: y1s1, y1s2 등)

// 수능 관련 DOM 요소
let suneungExamSelector: HTMLSelectElement | null = null; // 기준 시험 선택 select
let suneungKoreanChoice: HTMLSelectElement | null = null; // 국어 선택과목 select
let suneungKoreanRaw: HTMLInputElement | null = null; // 국어 원점수 input
let suneungKoreanCalculatedDiv: HTMLDivElement | null = null; // 국어 계산 결과 표시 div
let suneungMathChoice: HTMLSelectElement | null = null; // 수학 선택과목 select
let suneungMathRaw: HTMLInputElement | null = null; // 수학 원점수 input
let suneungMathCalculatedDiv: HTMLDivElement | null = null; // 수학 계산 결과 표시 div
let suneungEnglishRaw: HTMLInputElement | null = null; // 영어 원점수 input
let suneungEnglishCalculatedDiv: HTMLDivElement | null = null; // 영어 계산 결과 표시 div
let suneungHistoryRaw: HTMLInputElement | null = null; // 한국사 원점수 input
let suneungHistoryCalculatedDiv: HTMLDivElement | null = null; // 한국사 계산 결과 표시 div
let suneungExplorer1Subject: HTMLSelectElement | null = null; // 탐구1 과목 선택 select
let suneungExplorer1Raw: HTMLInputElement | null = null; // 탐구1 원점수 input
let suneungExplorer1CalculatedDiv: HTMLDivElement | null = null; // 탐구1 계산 결과 표시 div
let suneungExplorer2Subject: HTMLSelectElement | null = null; // 탐구2 과목 선택 select
let suneungExplorer2Raw: HTMLInputElement | null = null; // 탐구2 원점수 input
let suneungExplorer2CalculatedDiv: HTMLDivElement | null = null; // 탐구2 계산 결과 표시 div

// 성적 입력 모달 관련 DOM 요소들을 초기화하는 함수
export function initializeGradeModalDOM(elements: {
    gradeInputModal: HTMLDivElement,
    modalTabsElements: NodeListOf<Element>,
    modalTabContentsElements: NodeListOf<Element>,
    naesinSubjectRowTemplate: HTMLTemplateElement,
    naesinGradeFormDivs: { [key: string]: HTMLDivElement | null }, // y3s2는 null일 수 있음
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

// 성적 입력 모달을 여는 함수
export function openGradeModal() {
    if (!gradeInputModal) return;
    populateSuneungSubjectDropdowns(); // 수능 과목 드롭다운 채우기
    renderNaesinGradesFromState(); // 현재 상태의 내신 성적을 폼에 렌더링
    renderSuneungGradesFromState(); // 현재 상태의 수능 성적을 폼에 렌더링
    gradeInputModal.classList.remove('hidden'); // 모달 보이기
    // 첫 번째 탭이 활성화되어 있지 않으면 클릭하여 활성화
    const firstTab = gradeInputModal.querySelector('.tab-button');
    if (firstTab && !firstTab.classList.contains('active')) {
        (firstTab as HTMLElement).click();
    }
}

// 성적 입력 모달을 닫는 함수
export function closeGradeModal() {
    if (gradeInputModal) gradeInputModal.classList.add('hidden'); // 모달 숨기기
}

// 모달 내 탭(내신/수능) 클릭 처리 함수
export function handleGradeModalTabClick(event: MouseEvent) {
    if (!modalTabsElements || !modalTabContentsElements) return;
    const clickedTab = event.target as HTMLElement;
    if (!clickedTab.classList.contains('tab-button')) return; // 탭 버튼이 아니면 무시

    // 모든 탭과 콘텐츠에서 'active' 클래스 제거
    modalTabsElements.forEach(tab => tab.classList.remove('active'));
    modalTabContentsElements.forEach(content => content.classList.remove('active'));

    // 클릭된 탭과 해당 콘텐츠에 'active' 클래스 추가
    clickedTab.classList.add('active');
    const tabId = clickedTab.dataset.tab;
    if (tabId) {
        const activeContent = document.getElementById(tabId);
        if (activeContent) activeContent.classList.add('active');
    }
}

// Select 요소에 옵션들을 채우는 함수
function populateSelectWithOptions(
    selectElement: HTMLSelectElement | null, 
    optionsArray: ApiSubjectInfo[], 
    placeholder: string, // 기본 플레이스홀더 텍스트
    useCodeAsValue: boolean = false // option의 value로 subjectCode를 사용할지 여부
) {
    if (!selectElement) return;
    // 이미 채워져 있고 플레이스홀더가 일치하면 다시 채우지 않음 (데이터 변경 시 강제 업데이트 필요)
    if (selectElement.options.length > 1 && selectElement.dataset.populated === 'true' && selectElement.options[0].text === placeholder) return;

    const currentValue = selectElement.value; // 현재 선택된 값 보존 시도
    selectElement.innerHTML = `<option value="">${placeholder}</option>`; // 기존 옵션 초기화 후 플레이스홀더 추가
    optionsArray.forEach(subject => {
        const option = document.createElement('option');
        option.value = useCodeAsValue ? subject.subjectCode : subject.subjectName; // 값 설정
        option.textContent = subject.subjectName; // 표시될 텍스트
        option.dataset.subjectCode = subject.subjectCode; // 데이터 속성에 과목 코드 저장
        option.dataset.subjectName = subject.subjectName; // 데이터 속성에 과목명 저장
        selectElement.appendChild(option);
    });
    // 이전 선택값이 새 옵션 목록에 있으면 복원
    if (currentValue && Array.from(selectElement.options).some(opt => opt.value === currentValue)) {
        selectElement.value = currentValue;
    }
    selectElement.dataset.populated = 'true'; // 채워졌음을 표시
}

// 수능 관련 드롭다운 메뉴들(선택과목, 탐구과목)을 API에서 가져온 목록으로 채우는 함수
export function populateSuneungSubjectDropdowns() {
    populateSelectWithOptions(suneungKoreanChoice, suneungKoreanOptionsFromApi, "국어 선택", false); // 국어 선택 (값: 과목명)
    populateSelectWithOptions(suneungMathChoice, suneungMathOptionsFromApi, "수학 선택", false);   // 수학 선택 (값: 과목명)
    populateSelectWithOptions(suneungExplorer1Subject, suneungExplorerSubjectsFromApi, "탐구1 과목 선택", false); // 탐구1 (값: 과목명)
    populateSelectWithOptions(suneungExplorer2Subject, suneungExplorerSubjectsFromApi, "탐구2 과목 선택", false); // 탐구2 (값: 과목명)
}

// 특정 학년-학기에 내신 과목 입력 행을 추가하는 함수
export function addNaesinSubjectRow(year: 1 | 2 | 3, semester: 1 | 2) {
    const containerKey = `y${year}s${semester}` as keyof typeof naesinGradeFormDivs;
    const container = naesinGradeFormDivs[containerKey];
    if (!container || !naesinSubjectRowTemplate) return; // 해당 컨테이너나 템플릿 없으면 중단

    // 새 과목 데이터 생성 (고유 ID 포함)
    const newSubjectId = `s${Date.now()}${Math.random().toString(16).slice(2)}`;
    const newSubject: UserNaesinSubject = { id: newSubjectId, subjectCode: null, subjectName: "", grade: null, credits: null, rawScore: null, subjectMean: null, stdDev: null };
    
    const yearKey = `year${year}` as keyof UserAllGrades['naesin'];
    const semesterKey = `semester${semester}` as keyof UserAllGrades['naesin']['year1'];
    
    // 전역 상태에 새 과목 추가
    userAllGrades.naesin[yearKey][semesterKey].subjects.push(newSubject);
    // 해당 학기 UI 다시 렌더링
    renderNaesinSemester(year, semester);
}

// 특정 학년-학기에서 내신 과목 입력 행을 제거하는 함수
export function removeNaesinSubjectRow(year: 1 | 2 | 3, semester: 1 | 2, subjectId: string) {
    const yearKey = `year${year}` as keyof UserAllGrades['naesin'];
    const semesterKey = `semester${semester}` as keyof UserAllGrades['naesin']['year1'];
    
    const subjects = userAllGrades.naesin[yearKey][semesterKey].subjects;
    // 전역 상태에서 해당 과목 제거
    userAllGrades.naesin[yearKey][semesterKey].subjects = subjects.filter(s => s.id !== subjectId);
    // 해당 학기 UI 다시 렌더링
    renderNaesinSemester(year, semester);
}

// 특정 학년-학기의 내신 과목 목록을 UI에 렌더링하는 함수
export function renderNaesinSemester(year: 1 | 2 | 3, semester: 1 | 2) {
    const containerKey = `y${year}s${semester}` as keyof typeof naesinGradeFormDivs;
    const container = naesinGradeFormDivs[containerKey];
    // 3학년 2학기 컨테이너는 없을 수 있으므로, 없으면 함수 종료
    if (!container || !naesinSubjectRowTemplate) return; 
    container.innerHTML = ''; // 기존 내용 비우기

    const yearKey = `year${year}` as keyof UserAllGrades['naesin'];
    const semesterKey = `semester${semester}` as keyof UserAllGrades['naesin']['year1'];
    const subjects = userAllGrades.naesin[yearKey][semesterKey].subjects;

    // 각 과목에 대해 행 생성
    subjects.forEach(subject => {
        const clone = naesinSubjectRowTemplate.content.cloneNode(true) as DocumentFragment;
        const rowDiv = clone.querySelector('.naesin-subject-row') as HTMLDivElement;
        rowDiv.dataset.subjectId = subject.id; // 과목 ID 저장

        // 과목명 선택 select 설정
        const nameSelect = rowDiv.querySelector('.naesin-subject-name') as HTMLSelectElement;
        populateSelectWithOptions(nameSelect, naesinSubjectsFromApi, "과목 선택", true); // value로 subjectCode 사용
        nameSelect.value = subject.subjectCode || ""; // 현재 과목의 subjectCode로 선택
        nameSelect.addEventListener('change', (e) => { // 변경 시 상태 업데이트
            const selectedOption = (e.target as HTMLSelectElement).selectedOptions[0];
            subject.subjectCode = selectedOption.value; // subjectCode 업데이트
            subject.subjectName = selectedOption.dataset.subjectName || selectedOption.textContent || ""; // subjectName 업데이트
        });

        // 등급 input 설정
        const gradeInput = rowDiv.querySelector('.naesin-subject-grade') as HTMLInputElement;
        gradeInput.value = subject.grade?.toString() || '';
        gradeInput.addEventListener('input', (e) => { subject.grade = parseInt((e.target as HTMLInputElement).value) || null; });
        
        // 이수단위 input 설정
        const creditsInput = rowDiv.querySelector('.naesin-subject-credits') as HTMLInputElement;
        creditsInput.value = subject.credits?.toString() || '';
        creditsInput.addEventListener('input', (e) => { subject.credits = parseInt((e.target as HTMLInputElement).value) || null; });

        // 세부 성적(원점수, 평균, 표준편차) 토글 버튼 및 입력 필드 설정
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

        // 과목 삭제 버튼 설정
        const removeButton = rowDiv.querySelector('.remove-subject-button') as HTMLButtonElement;
        removeButton.addEventListener('click', () => removeNaesinSubjectRow(year, semester, subject.id));
        
        container.appendChild(rowDiv); // 완성된 행을 컨테이너에 추가
    });
}

// 전역 상태(userAllGrades.naesin)의 내신 성적을 모달 폼에 렌더링하는 함수
export function renderNaesinGradesFromState() {
    // 1학년, 2학년은 1, 2학기 모두 렌더링
    ([1,2] as const).forEach(year => {
        ([1,2] as const).forEach(semester => {
            renderNaesinSemester(year, semester);
        });
    });
    // 3학년은 1학기만 렌더링 (3학년 2학기는 UI에서 제외됨)
    renderNaesinSemester(3, 1);
}

// 전역 상태(userAllGrades.suneung)의 수능 성적을 모달 폼에 렌더링하는 함수
export function renderSuneungGradesFromState() {
    const s = userAllGrades.suneung;
    // 필수 DOM 요소 없으면 중단
    if(!suneungExamSelector || !suneungKoreanChoice || !suneungKoreanRaw || !suneungMathChoice || !suneungMathRaw || !suneungEnglishRaw || !suneungHistoryRaw || !suneungExplorer1Subject || !suneungExplorer1Raw || !suneungExplorer2Subject || !suneungExplorer2Raw) return;

    // 상태 값으로 각 입력 필드 값 설정
    suneungExamSelector.value = s.examIdentifierForCutInfo; // 기준 시험
    if (s.subjects.korean) { suneungKoreanChoice.value = s.subjects.korean.selectedOption || ''; suneungKoreanRaw.value = s.subjects.korean.rawScore?.toString() || ''; }
    if (s.subjects.math) { suneungMathChoice.value = s.subjects.math.selectedOption || ''; suneungMathRaw.value = s.subjects.math.rawScore?.toString() || ''; }
    if (s.subjects.english) { suneungEnglishRaw.value = s.subjects.english.rawScore?.toString() || ''; }
    if (s.subjects.history) { suneungHistoryRaw.value = s.subjects.history.rawScore?.toString() || ''; }
    if (s.subjects.explorer1) { suneungExplorer1Subject.value = s.subjects.explorer1.subjectName || ''; suneungExplorer1Raw.value = s.subjects.explorer1.rawScore?.toString() || ''; }
    if (s.subjects.explorer2) { suneungExplorer2Subject.value = s.subjects.explorer2.subjectName || ''; suneungExplorer2Raw.value = s.subjects.explorer2.rawScore?.toString() || ''; }
    
    // 모든 수능 과목의 계산된 점수(표준/백분위/등급) 표시 업데이트
    updateAllSuneungCalculatedDisplays();
}

// 수능 성적 입력 폼에서 현재 값을 수집하여 전역 상태(userAllGrades.suneung)에 업데이트하는 함수
export function collectSuneungGradesFromForm() {
    // 필수 DOM 요소 없으면 중단
    if(!suneungExamSelector || !suneungKoreanChoice || !suneungKoreanRaw || !suneungMathChoice || !suneungMathRaw || !suneungEnglishRaw || !suneungHistoryRaw || !suneungExplorer1Subject || !suneungExplorer1Raw || !suneungExplorer2Subject || !suneungExplorer2Raw) return;

    // 기준 시험 정보 파싱
    const examId = suneungExamSelector.value;
    const [yearMonthStr, typeStr] = examId.split('_');
    const year = parseInt(yearMonthStr.substring(0, 4));
    const month = parseInt(yearMonthStr.substring(4, 6));

    const currentSuneungState = userAllGrades.suneung; // 현재 수능 상태 가져오기 (점수 외 정보 보존 위함)

    // 폼 값으로 새 수능 성적 객체 생성
    const newSuneungGrades: UserSuneungGrades = {
        examYear: year,
        examMonth: month,
        examIdentifierForCutInfo: examId,
        subjects: { // 각 과목 정보는 이전 상태를 기본으로 하고 폼 값으로 덮어씀
            korean: {
                ...(currentSuneungState.subjects.korean), // 기존 표준/백분위/등급 유지
                selectedOption: suneungKoreanChoice.value,
                rawScore: parseFloat(suneungKoreanRaw.value) || null // 빈 값이면 null
            },
            math: {
                ...(currentSuneungState.subjects.math),
                selectedOption: suneungMathChoice.value,
                rawScore: parseFloat(suneungMathRaw.value) || null
            },
            english: {
                ...(currentSuneungState.subjects.english),
                rawScore: parseFloat(suneungEnglishRaw.value) || null
            },
            history: {
                ...(currentSuneungState.subjects.history),
                rawScore: parseFloat(suneungHistoryRaw.value) || null
            },
            explorer1: {
                ...(currentSuneungState.subjects.explorer1),
                subjectCode: suneungExplorer1Subject.selectedOptions[0]?.dataset.subjectCode || null, // select의 dataset에서 과목 코드 가져오기
                subjectName: suneungExplorer1Subject.value, // select의 value (과목명)
                rawScore: parseFloat(suneungExplorer1Raw.value) || null
            },
            explorer2: {
                ...(currentSuneungState.subjects.explorer2),
                subjectCode: suneungExplorer2Subject.selectedOptions[0]?.dataset.subjectCode || null,
                subjectName: suneungExplorer2Subject.value,
                rawScore: parseFloat(suneungExplorer2Raw.value) || null
            }
        }
    };
    updateUserSuneungGrades(newSuneungGrades); // 전역 상태 업데이트
    updateAllSuneungCalculatedDisplays(); // 계산된 점수 표시 업데이트
}

// 원점수와 등급컷 데이터를 기반으로 표준점수, 백분위, 등급을 찾는 함수
function getScoreFromCutData(rawScore: number, cutData: ExamGradeCutMappingItem[]): Partial<UserSuneungSubjectDetailScore> {
    let foundMatch: Partial<UserSuneungSubjectDetailScore> = { grade: 9 }; // 기본값: 9등급
    for (const item of cutData) { // 등급컷 배열 순회
        // rawScoreMin이 정의되어 있고, 현재 원점수가 해당 값 이상인 경우
        if (item.rawScoreMin !== undefined && rawScore >= item.rawScoreMin) {
            // rawScoreMax가 없거나(최소점만 있는 경우) 또는 원점수가 rawScoreMax 이하인 경우 일치
            if (item.rawScoreMax === undefined || rawScore <= item.rawScoreMax) {
                foundMatch = {
                    standardScore: item.standardScore,
                    percentile: item.percentile,
                    grade: item.grade
                };
                break; // 가장 먼저 맞는 구간을 찾으면 종료 (등급컷은 보통 높은 점수부터 정렬됨)
            }
        // rawScoreMin이 없고 rawScoreMax만 있는 경우 (덜 일반적)
        } else if (item.rawScoreMin === undefined && item.rawScoreMax !== undefined && rawScore <= item.rawScoreMax) {
             foundMatch = { standardScore: item.standardScore, percentile: item.percentile, grade: item.grade };
             break;
        // rawScoreMin, rawScoreMax 모두 없고 등급만 명시된 경우 (절대평가 과목의 마지막 등급 등)
        } else if (item.rawScoreMin === undefined && item.rawScoreMax === undefined) { 
             foundMatch = { grade: item.grade }; 
        }
    }
    // 절대평가 과목(영어, 한국사)은 등급컷 데이터에 표준점수/백분위가 없을 수 있음
    // 이 경우, 목업으로 채우거나 undefined로 둠. API 명세는 영어/한국사에 'grade'만 포함.
    if (foundMatch.standardScore === undefined) foundMatch.standardScore = rawScore; // 제공 안되면 원점수를 표준점수로 간주 (목업)
    if (foundMatch.percentile === undefined && foundMatch.grade) { // 제공 안되면 등급 기반으로 백분위 추정 (목업)
         foundMatch.percentile = Math.max(0, Math.min(100, 100 - (foundMatch.grade * 11 - 5) + Math.floor(Math.random()*3) ));
    }
    return foundMatch;
}

// 특정 수능 과목의 계산된 점수(표준/백분위/등급)를 UI에 업데이트하는 함수
export function updateSuneungCalculatedDisplay(
    subjectKey: keyof UserSuneungGrades['subjects'], // 'korean', 'math' 등 과목 키
    divElement: HTMLDivElement | null // 결과를 표시할 div 요소
) {
    if (!divElement) return; // div 없으면 중단
    const suneungState = userAllGrades.suneung; // 현재 수능 상태
    const subjectData = suneungState.subjects[subjectKey] as UserSuneungSubjectDetailScore | UserSuneungSubjectExplorerScore | undefined; // 해당 과목 데이터

    // 과목 데이터, 원점수, 등급컷 정보 중 하나라도 없으면 계산 불가 메시지 표시
    if (!subjectData || subjectData.rawScore === null || subjectData.rawScore === undefined || !currentSuneungExamCutInfo || !currentSuneungExamCutInfo.subjects) {
        divElement.innerHTML = '원점수 입력 또는 등급컷 정보 필요'; return;
    }

    let calculated: Partial<UserSuneungSubjectDetailScore> = { grade: 9, standardScore: 0, percentile: 0 }; // 계산 결과 초기화
    const rawScore = subjectData.rawScore; // 현재 원점수
    const examCutSubjects = currentSuneungExamCutInfo.subjects; // 현재 등급컷 정보

    let subjectNameForCuts: string | undefined; // 등급컷에서 찾을 과목명
    let selectedOptionForCuts: string | undefined; // 등급컷에서 찾을 선택과목명 (국어, 수학용)

    // 과목 키에 따라 등급컷에서 사용할 과목명/선택과목명 설정
    switch(subjectKey) {
        case 'korean': subjectNameForCuts = "국어"; selectedOptionForCuts = subjectData.selectedOption; break;
        case 'math': subjectNameForCuts = "수학"; selectedOptionForCuts = subjectData.selectedOption; break;
        case 'english': subjectNameForCuts = "영어"; break;
        case 'history': subjectNameForCuts = "한국사"; break;
        case 'explorer1': case 'explorer2': // 탐구 과목
            subjectNameForCuts = (subjectData as UserSuneungSubjectExplorerScore).subjectName; // 탐구는 과목명 자체가 키가 됨
            break;
    }
    
    // 설정된 과목명으로 등급컷 정보 조회
    if (subjectNameForCuts && examCutSubjects[subjectNameForCuts]) {
        const cutInfoForSubject = examCutSubjects[subjectNameForCuts];
        if (Array.isArray(cutInfoForSubject)) { // 절대평가 또는 탐구 과목 (등급컷이 배열 형태)
            calculated = getScoreFromCutData(rawScore, cutInfoForSubject);
        // 국어/수학처럼 선택과목이 있고, 해당 선택과목의 등급컷이 배열 형태인 경우
        } else if (selectedOptionForCuts && cutInfoForSubject[selectedOptionForCuts] && Array.isArray(cutInfoForSubject[selectedOptionForCuts])) { 
            calculated = getScoreFromCutData(rawScore, cutInfoForSubject[selectedOptionForCuts] as ExamGradeCutMappingItem[]);
        } else if (!selectedOptionForCuts && Array.isArray(Object.values(cutInfoForSubject)[0])) {
            // 탐구 과목 등이 과목명 하위에 바로 배열이 아닌 객체로 한번 더 감싸진 경우 (목업 데이터 구조에 따라 필요할 수 있음)
            // 현재 목업 데이터는 탐구를 배열로 바로 제공하므로, 이 부분은 예외 처리 또는 경고용.
             console.warn(`No specific option for ${subjectNameForCuts}, or cut data structure mismatch. Using generic approach or first available.`);
        }
    }
    
    // 계산된 값을 과목 데이터에 업데이트 (상태 객체 직접 수정)
    subjectData.standardScore = calculated.standardScore ?? subjectData.standardScore; // null/undefined면 기존 값 유지
    subjectData.percentile = calculated.percentile ?? subjectData.percentile;
    subjectData.grade = calculated.grade ?? subjectData.grade;

    // UI에 결과 표시
    divElement.innerHTML = `계산: 표준 ${subjectData.standardScore ?? 'N/A'}, 백분위 ${subjectData.percentile ?? 'N/A'}%, 등급 ${subjectData.grade ?? 'N/A'}`;
}

// 모든 수능 과목의 계산된 점수 표시를 업데이트하는 함수
export function updateAllSuneungCalculatedDisplays() {
    if (!userAllGrades.suneung) return; // 수능 성적 없으면 중단
    updateSuneungCalculatedDisplay('korean', suneungKoreanCalculatedDiv);
    updateSuneungCalculatedDisplay('math', suneungMathCalculatedDiv);
    updateSuneungCalculatedDisplay('english', suneungEnglishCalculatedDiv);
    updateSuneungCalculatedDisplay('history', suneungHistoryCalculatedDiv);
    updateSuneungCalculatedDisplay('explorer1', suneungExplorer1CalculatedDiv);
    updateSuneungCalculatedDisplay('explorer2', suneungExplorer2CalculatedDiv);
}

// 수능 기준 시험 선택이 변경되었을 때 호출되는 함수 (index.tsx에서 직접 로직 처리)
// export async function handleSuneungExamSelectionChange() {
//     if (!suneungExamSelector) return;
//     // api.ts의 fetchSuneungExamCutInfo를 호출 (이름 충돌 피하기 위해 apiFetchSuneungExamCutInfo 사용)
//     await apiFetchSuneungExamCutInfo(suneungExamSelector.value); 
//     collectSuneungGradesFromForm(); // 현재 폼 값으로 수능 성적 다시 수집 (계산된 점수 업데이트 위함)
// }
// 위 함수는 index.tsx 로 이전됨.

// 현재 입력된 모든 성적(내신, 수능)을 JSON 파일로 저장하는 함수
export function saveGradesToFile() {
    collectSuneungGradesFromForm(); // 저장 전 최신 수능 성적 수집
    try {
        const dataStr = JSON.stringify(userAllGrades, null, 2); // 전체 성적 데이터를 JSON 문자열로 변환 (들여쓰기 2칸)
        const blob = new Blob([dataStr], { type: "application/json" }); // Blob 객체 생성
        const url = URL.createObjectURL(blob); // Blob URL 생성
        const a = document.createElement('a'); // 다운로드용 임시 a 태그 생성
        a.href = url;
        a.download = `university_admission_grades_${new Date().toISOString().slice(0,10)}.json`; // 파일명 설정 (날짜 포함)
        document.body.appendChild(a);
        a.click(); // 클릭하여 다운로드 실행
        document.body.removeChild(a); // 임시 a 태그 제거
        URL.revokeObjectURL(url); // Blob URL 해제
        alert("성적이 파일로 저장되었습니다.");
    } catch (error) {
        console.error("Error saving grades to file:", error);
        alert("성적 저장 중 오류가 발생했습니다.");
    }
}

// JSON 파일에서 성적을 불러와 애플리케이션 상태에 적용하는 함수
export function loadGradesFromFile(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0]; // 선택된 파일
    if (!file) return;

    const reader = new FileReader(); // FileReader 생성
    reader.onload = async (e) => { // 파일 읽기 완료 시 (async로 변경)
        try {
            const jsonText = e.target?.result as string; // 파일 내용 (JSON 문자열)
            const parsedGrades = JSON.parse(jsonText) as UserAllGrades; // JSON 파싱

            // 불러온 데이터 유효성 검사 (필수 필드 확인)
            if (parsedGrades.naesin && parsedGrades.suneung && parsedGrades.suneung.examIdentifierForCutInfo) {
                
                const defaultUserGrades = initializeGlobalUserAllGrades(); // 기본 성적 구조 가져오기 (누락된 필드 채우기 위함)
                const loadedNaesin = parsedGrades.naesin;
                const mergedNaesin = defaultUserGrades.naesin; // 병합될 내신 성적 (기본 구조 사용)

                // 내신 성적 병합: 불러온 데이터로 기본 구조 덮어쓰기
                for (const yearKey of ['year1', 'year2', 'year3'] as const) {
                    for (const semKey of ['semester1', 'semester2'] as const) {
                        // 3학년 2학기는 항상 빈 과목 목록으로 처리 (UI에서 사용 안 함)
                        if (yearKey === 'year3' && semKey === 'semester2') {
                            mergedNaesin[yearKey][semKey].subjects = [];
                            continue; 
                        }
                        
                        // 해당 학년-학기 과목 데이터가 있으면 병합
                        if (loadedNaesin[yearKey]?.[semKey]?.subjects) {
                            mergedNaesin[yearKey][semKey].subjects = loadedNaesin[yearKey][semKey].subjects.map((sub: any) => ({
                                // 각 과목의 모든 필드를 기본값과 함께 안전하게 매핑
                                id: sub.id || `loaded${Date.now()}${Math.random()}`, // ID 없으면 새로 생성
                                subjectCode: sub.subjectCode || null,
                                subjectName: sub.subjectName || "",
                                grade: sub.grade === undefined ? null : sub.grade,
                                credits: sub.credits === undefined ? null : sub.credits,
                                rawScore: sub.rawScore === undefined ? null : sub.rawScore,
                                subjectMean: sub.subjectMean === undefined ? null : sub.subjectMean,
                                stdDev: sub.stdDev === undefined ? null : sub.stdDev,
                            }));
                        }
                    }
                }

                // 수능 성적 병합: 불러온 데이터로 기본 구조 덮어쓰기
                const loadedSuneung = parsedGrades.suneung;
                const mergedSuneung: UserSuneungGrades = {
                    ...defaultUserGrades.suneung, // 기본 수능 구조
                    examYear: loadedSuneung.examYear || defaultUserGrades.suneung.examYear,
                    examMonth: loadedSuneung.examMonth || defaultUserGrades.suneung.examMonth,
                    examIdentifierForCutInfo: loadedSuneung.examIdentifierForCutInfo, // 필수값
                    subjects: { // 각 과목별로 기본값과 불러온 값 병합
                        korean: {...defaultUserGrades.suneung.subjects.korean, ...loadedSuneung.subjects?.korean},
                        math: {...defaultUserGrades.suneung.subjects.math, ...loadedSuneung.subjects?.math},
                        english: {...defaultUserGrades.suneung.subjects.english, ...loadedSuneung.subjects?.english},
                        history: {...defaultUserGrades.suneung.subjects.history, ...loadedSuneung.subjects?.history},
                        explorer1: {...defaultUserGrades.suneung.subjects.explorer1, ...loadedSuneung.subjects?.explorer1},
                        explorer2: {...defaultUserGrades.suneung.subjects.explorer2, ...loadedSuneung.subjects?.explorer2},
                    }
                };
                
                // 최종적으로 병합된 성적 데이터
                const finalGrades: UserAllGrades = {
                    naesin: mergedNaesin,
                    suneung: mergedSuneung
                };

                setUserAllGrades(finalGrades); // 전역 상태 업데이트
                renderNaesinGradesFromState(); // 내신 폼 다시 렌더링
                renderSuneungGradesFromState(); // 수능 폼 다시 렌더링
                
                // 불러온 수능 시험 기준으로 등급컷 다시 가져오기
                if(suneungExamSelector && userAllGrades.suneung.examIdentifierForCutInfo) {
                     suneungExamSelector.value = userAllGrades.suneung.examIdentifierForCutInfo; 
                     // index.tsx의 이벤트 핸들러가 처리하도록 변경되었으므로 직접 호출 대신 UI 업데이트 후
                     // suneungExamSelector.dispatchEvent(new Event('change')); 와 같은 방식도 가능하나,
                     // 여기서는 apiFetchSuneungExamCutInfo를 직접 호출하는 것이 더 명확할 수 있음.
                     // 하지만, 상태를 먼저 다 설정하고, 그 다음에 UI를 통해 업데이트하는 것이 일관적일 수 있음.
                     // 지금은 index.tsx의 이벤트 핸들러가 처리하도록 두는 것이 가장 간단.
                     // 또는 여기서 직접 fetchSuneungExamCutInfo 호출:
                     await apiFetchSuneungExamCutInfo(suneungExamSelector.value);
                     collectSuneungGradesFromForm(); // 등급컷 로드 후 점수 재계산
                }
                alert("성적을 파일에서 불러왔습니다.");
            } else { // 유효하지 않은 파일 형식
                alert("불러온 파일이 유효한 성적 데이터 형식이 아닙니다. (필수 항목 누락)");
            }
        } catch (err) { // JSON 파싱 또는 적용 중 오류
            console.error("Error parsing JSON from file or applying grades:", err);
            alert("성적 파일을 읽거나 적용하는 중 오류가 발생했습니다.");
        } finally {
            fileInput.value = ''; // 파일 입력 초기화 (동일 파일 다시 선택 가능하도록)
        }
    };
    reader.readAsText(file); // 파일 내용을 텍스트로 읽기 시작
}
