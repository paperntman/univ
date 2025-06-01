// 이 파일은 애플리케이션의 일반적인 UI 상호작용과 관련된 유틸리티 함수들을 담당합니다.
// 로딩 오버레이 표시/숨김, 학과 검색 입력창의 자동 완성(추천 목록) 기능 등을 포함합니다.

import { DepartmentSuggestion } from './types';
import { fetchDepartmentSuggestionsApi } from './api'; // mockFetch 대신 fetchDepartmentSuggestionsApi 임포트
// import { API_BASE_URL } from './config'; // API_BASE_URL은 api.ts에서 사용
import { selectedDepartment, setSelectedDepartment, activeDepartmentSuggestionIndex, setActiveDepartmentSuggestionIndex } from './state';

// --- DOM 요소 변수 선언 ---
let loadingOverlay: HTMLDivElement | null = null; // 로딩 중 표시되는 전체 화면 오버레이
let departmentSearchInput: HTMLInputElement | null = null; // 학과 검색 입력창
let departmentSuggestionsDiv: HTMLDivElement | null = null; // 학과 검색 추천 목록이 표시될 div

// UI 유틸리티 관련 DOM 요소들을 초기화하는 함수
export function initializeUiUtilsDOM(elements: {
    loadingOverlay: HTMLDivElement,
    departmentSearchInput: HTMLInputElement,
    departmentSuggestionsDiv: HTMLDivElement
}) {
    loadingOverlay = elements.loadingOverlay;
    departmentSearchInput = elements.departmentSearchInput;
    departmentSuggestionsDiv = elements.departmentSuggestionsDiv;

    // 학과 검색 입력창에 이벤트 리스너 추가
    if (departmentSearchInput) {
        departmentSearchInput.addEventListener('input', debouncedFetchDepartmentSuggestions); // 입력 시 추천 목록 가져오기 (디바운스 적용)
        departmentSearchInput.addEventListener('keydown', handleDepartmentSearchKeyDown); // 키보드 입력 처리 (화살표, 엔터 등)
    }
    // 전역 클릭 리스너: 검색창 외부 클릭 시 추천 목록 숨김
    document.addEventListener('click', (event) => {
        if (!departmentSearchInput || !departmentSuggestionsDiv) return;
        // 클릭된 대상이 검색창 또는 추천 목록 내부가 아니면
        const isClickInsideSearch = departmentSearchInput.contains(event.target as Node) || departmentSuggestionsDiv.contains(event.target as Node);
        if (!isClickInsideSearch) {
            hideDepartmentSuggestions(); // 추천 목록 숨기기
        }
    });
}

// 디바운스 함수: 지정된 시간(waitFor) 동안 추가 호출이 없으면 마지막 호출만 실행
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeout) {
                clearTimeout(timeout); // 이전 타이머 취소
            }
            // 새 타이머 설정
            timeout = setTimeout(() => resolve(func(...args)), waitFor);
        });
}

// 로딩 오버레이를 표시하거나 숨기는 함수
export function showLoading(isLoading: boolean) {
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none'; // flex로 중앙 정렬, none으로 숨김
        // 접근성: 스크린 리더에게 로딩 상태 알림
        document.body.setAttribute('aria-busy', isLoading.toString());
    }
}

// 학과 검색 추천 목록을 API로부터 가져오는 함수
async function fetchDepartmentSuggestions(eventOrQuery: Event | string) {
    if (!departmentSearchInput || !departmentSuggestionsDiv) return;
    
    const query = typeof eventOrQuery === 'string' 
        ? eventOrQuery 
        : (eventOrQuery.target as HTMLInputElement).value;

    if (query.length < 1) {
        renderDepartmentSuggestions([]);
        return;
    }
    
    showLoading(true); // 추천 목록 가져올 때 로딩 표시
    try {
        // API 호출하여 추천 목록 가져오기
        const suggestions = await fetchDepartmentSuggestionsApi(query);
        renderDepartmentSuggestions(suggestions); // 가져온 추천 목록 렌더링
    } catch (error) {
        console.error("Error fetching department suggestions:", error);
        renderDepartmentSuggestions([]); // 에러 발생 시 빈 목록 렌더링
        alert("학과 추천 목록을 가져오는 중 오류가 발생했습니다.");
    } finally {
        showLoading(false); // 로딩 숨김
    }
}
// fetchDepartmentSuggestions 함수에 디바운스 적용 (250ms 지연)
const debouncedFetchDepartmentSuggestions = debounce(fetchDepartmentSuggestions, 250);

// 가져온 학과 추천 목록을 HTML로 렌더링하는 함수
function renderDepartmentSuggestions(suggestions: DepartmentSuggestion[]) {
    if (!departmentSuggestionsDiv || !departmentSearchInput) return;
    departmentSuggestionsDiv.innerHTML = ''; // 기존 추천 목록 비우기
    setActiveDepartmentSuggestionIndex(-1); // 활성화된 추천 항목 인덱스 초기화

    if (suggestions.length > 0) { // 추천 항목이 있으면
        suggestions.forEach((suggestion, index) => {
            const div = document.createElement('div');
            div.textContent = suggestion.departmentName; // 학과명 표시
            div.setAttribute('role', 'option'); // 접근성: 옵션 역할
            div.setAttribute('id', `suggestion-${index}`); // 고유 ID 부여
            div.tabIndex = -1; // JS로 포커스 가능하게 하지만, 탭 순서에서는 제외
            // 추천 항목 클릭 시
            div.addEventListener('click', () => {
                departmentSearchInput!.value = suggestion.departmentName; // 입력창에 학과명 채우기
                setSelectedDepartment(suggestion.departmentName); // 전역 상태에 선택된 학과 저장
                hideDepartmentSuggestions(); // 추천 목록 숨기기
            });
            departmentSuggestionsDiv.appendChild(div);
        });
        departmentSuggestionsDiv.style.display = 'block'; // 추천 목록 보이기
    } else { // 추천 항목 없으면
        departmentSuggestionsDiv.style.display = 'none'; // 추천 목록 숨기기
    }
}

// 학과 추천 목록을 숨기는 함수
function hideDepartmentSuggestions() {
    if (departmentSuggestionsDiv) {
        departmentSuggestionsDiv.innerHTML = ''; // 내용 비우기
        departmentSuggestionsDiv.style.display = 'none'; // 숨기기
    }
    setActiveDepartmentSuggestionIndex(-1); // 활성화 인덱스 초기화
}

// 학과 검색 입력창에서 키보드 입력 처리 함수 (화살표 키, 엔터, ESC)
function handleDepartmentSearchKeyDown(e: KeyboardEvent) {
    if (!departmentSuggestionsDiv || !departmentSearchInput) return;
    const suggestions = departmentSuggestionsDiv.querySelectorAll<HTMLDivElement>('div[role="option"]');
    // 추천 항목이 없거나 Escape 키가 아니면 일반 입력으로 간주 (아래 case에서 처리 안 함)
    if (suggestions.length === 0 && e.key !== 'Escape') return;

    switch (e.key) {
        case 'ArrowDown': // 아래 화살표
            e.preventDefault(); // 기본 동작(커서 이동) 방지
            setActiveDepartmentSuggestionIndex(Math.min(activeDepartmentSuggestionIndex + 1, suggestions.length - 1)); // 다음 항목으로 이동
            updateSuggestionHighlight(suggestions); // 하이라이트 업데이트
            break;
        case 'ArrowUp': // 위 화살표
            e.preventDefault();
            setActiveDepartmentSuggestionIndex(Math.max(activeDepartmentSuggestionIndex - 1, 0)); // 이전 항목으로 이동
            updateSuggestionHighlight(suggestions);
            break;
        case 'Enter': // 엔터 키
            e.preventDefault();
            if (activeDepartmentSuggestionIndex > -1 && activeDepartmentSuggestionIndex < suggestions.length) {
                suggestions[activeDepartmentSuggestionIndex].click(); // 활성화된 추천 항목 선택 (클릭 이벤트 트리거)
            } else if (suggestions.length > 0 && departmentSearchInput.value.trim() !== '') {
                // 추천 항목 선택 없이 엔터 입력 시, 현재 입력된 텍스트를 선택으로 간주
                setSelectedDepartment(departmentSearchInput.value.trim());
                hideDepartmentSuggestions();
            } else if (departmentSearchInput.value.trim() !== '') {
                 // 추천 목록이 없어도 입력값이 있으면 선택 처리
                setSelectedDepartment(departmentSearchInput.value.trim());
                hideDepartmentSuggestions();
            }
            break;
        case 'Escape': // ESC 키
            hideDepartmentSuggestions(); // 추천 목록 숨기기
            break;
        default:
            // 다른 키 입력은 기본 동작 허용 (입력창에 텍스트 입력)
            return; 
    }
}

// 추천 목록에서 현재 활성화된 항목의 하이라이트를 업데이트하는 함수
function updateSuggestionHighlight(suggestions: NodeListOf<HTMLDivElement>) {
     if (!departmentSearchInput) return;
    suggestions.forEach((div, index) => {
        const isSelected = index === activeDepartmentSuggestionIndex; // 현재 인덱스와 활성화 인덱스 비교
        div.classList.toggle('selected', isSelected); // 'selected' 클래스 토글
        div.setAttribute('aria-selected', isSelected.toString()); // 접근성: 선택 상태 알림
        if (isSelected) {
            // departmentSearchInput.value = div.textContent || ""; // 옵션: 하이라이트 시 입력창 값 업데이트
            div.focus(); // 접근성: 활성화된 항목으로 포커스 이동
        }
    });
}
