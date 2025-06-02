
// 이 파일은 애플리케이션의 일반적인 UI 상호작용과 관련된 유틸리티 함수들을 담당합니다.
// 로딩 오버레이 표시/숨김, 학과 검색 입력창의 자동 완성(추천 목록) 기능 등을 포함합니다.

import { setSelectedDepartment } from './state';
import { DEPARTMENT_CATEGORIES, DepartmentCategory } from './config';

// --- DOM 요소 변수 선언 ---
let loadingOverlay: HTMLDivElement | null = null; // 로딩 중 표시되는 전체 화면 오버레이

// 새로운 학과 선택 모달 관련 DOM 요소
let departmentSelectModal: HTMLDivElement | null = null;
let majorCategorySelect: HTMLSelectElement | null = null;
let mediumCategorySelect: HTMLSelectElement | null = null;
let minorCategorySelect: HTMLSelectElement | null = null;
let applyDepartmentSelectionButton: HTMLButtonElement | null = null;
let closeDepartmentModalButton: HTMLButtonElement | null = null;
let openDepartmentSearchModalButton: HTMLButtonElement | null = null;


// UI 유틸리티 관련 DOM 요소들을 초기화하는 함수
export function initializeUiUtilsDOM(elements: {
    loadingOverlay: HTMLDivElement,
    // 학과 검색 모달 관련 요소들
    departmentSelectModal: HTMLDivElement,
    majorCategorySelect: HTMLSelectElement,
    mediumCategorySelect: HTMLSelectElement,
    minorCategorySelect: HTMLSelectElement,
    applyDepartmentSelectionButton: HTMLButtonElement,
    closeDepartmentModalButton: HTMLButtonElement,
    openDepartmentSearchModalButton: HTMLButtonElement
}) {
    loadingOverlay = elements.loadingOverlay;

    departmentSelectModal = elements.departmentSelectModal;
    majorCategorySelect = elements.majorCategorySelect;
    mediumCategorySelect = elements.mediumCategorySelect;
    minorCategorySelect = elements.minorCategorySelect;
    applyDepartmentSelectionButton = elements.applyDepartmentSelectionButton;
    closeDepartmentModalButton = elements.closeDepartmentModalButton;
    openDepartmentSearchModalButton = elements.openDepartmentSearchModalButton;

    if (openDepartmentSearchModalButton) {
        openDepartmentSearchModalButton.addEventListener('click', openDepartmentSelectModal);
    }
    if (closeDepartmentModalButton) {
        closeDepartmentModalButton.addEventListener('click', closeDepartmentSelectModal);
    }
    if (majorCategorySelect) {
        majorCategorySelect.addEventListener('change', handleMajorCategoryChange);
    }
    if (mediumCategorySelect) {
        mediumCategorySelect.addEventListener('change', handleMediumCategoryChange);
    }
    if (applyDepartmentSelectionButton) {
        applyDepartmentSelectionButton.addEventListener('click', applyDepartmentSelection);
    }
}


// 로딩 오버레이를 표시하거나 숨기는 함수
export function showLoading(isLoading: boolean) {
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none'; // flex로 중앙 정렬, none으로 숨김
        document.body.setAttribute('aria-busy', isLoading.toString());
    }
}

// --- 새로운 학과 선택 모달 로직 ---

function populateDropdown(selectElement: HTMLSelectElement, items: string[], placeholder: string) {
    selectElement.innerHTML = `<option value="">-- ${placeholder} --</option>`;
    const uniqueItems = [...new Set(items)].sort(); // 중복 제거 및 정렬
    uniqueItems.forEach(item => {
        if (item) { // 빈 문자열이 아닌 경우에만 추가
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        }
    });
    selectElement.disabled = false;
}

function resetAndDisableDropdown(selectElement: HTMLSelectElement, placeholder: string) {
    selectElement.innerHTML = `<option value="">-- ${placeholder} --</option>`;
    selectElement.disabled = true;
}

export function openDepartmentSelectModal() {
    if (!departmentSelectModal || !majorCategorySelect || !mediumCategorySelect || !minorCategorySelect) return;

    const majorCategories = DEPARTMENT_CATEGORIES.map(cat => cat.majorName);
    populateDropdown(majorCategorySelect, majorCategories, "대분류 선택");
    resetAndDisableDropdown(mediumCategorySelect, "중분류 선택");
    resetAndDisableDropdown(minorCategorySelect, "소분류 선택");
    
    departmentSelectModal.classList.remove('hidden');
}

export function closeDepartmentSelectModal() {
    if (departmentSelectModal) {
        departmentSelectModal.classList.add('hidden');
    }
}

function handleMajorCategoryChange() {
    if (!majorCategorySelect || !mediumCategorySelect || !minorCategorySelect) return;
    const selectedMajorName = majorCategorySelect.value;

    if (selectedMajorName) {
        const mediumCategories = DEPARTMENT_CATEGORIES
            .filter(cat => cat.majorName === selectedMajorName)
            .map(cat => cat.mediumName);
        populateDropdown(mediumCategorySelect, mediumCategories, "중분류 선택");
    } else {
        resetAndDisableDropdown(mediumCategorySelect, "중분류 선택");
    }
    resetAndDisableDropdown(minorCategorySelect, "소분류 선택");
}

function handleMediumCategoryChange() {
    if (!majorCategorySelect || !mediumCategorySelect || !minorCategorySelect) return;
    const selectedMajorName = majorCategorySelect.value;
    const selectedMediumName = mediumCategorySelect.value;

    if (selectedMajorName && selectedMediumName) {
        const minorCategories = DEPARTMENT_CATEGORIES
            .filter(cat => cat.majorName === selectedMajorName && cat.mediumName === selectedMediumName)
            .map(cat => cat.minorName);
        populateDropdown(minorCategorySelect, minorCategories, "소분류 선택");
    } else {
        resetAndDisableDropdown(minorCategorySelect, "소분류 선택");
    }
}

function applyDepartmentSelection() {
    if (!majorCategorySelect || !mediumCategorySelect || !minorCategorySelect) return;

    const selectedMajorName = majorCategorySelect.value;
    const selectedMediumName = mediumCategorySelect.value;
    const selectedMinorName = minorCategorySelect.value;

    let finalDisplayName: string | null = null;
    let finalCode: string | null = null;
    let determinedCategory: DepartmentCategory | undefined = undefined;

    // Priority: Minor > Medium > Major, ensuring parent categories are also selected.
    if (selectedMinorName && selectedMinorName !== "" && 
        selectedMediumName && selectedMediumName !== "" && 
        selectedMajorName && selectedMajorName !== "") {
        determinedCategory = DEPARTMENT_CATEGORIES.find(cat => 
            cat.majorName === selectedMajorName && 
            cat.mediumName === selectedMediumName && 
            cat.minorName === selectedMinorName
        );
        if (determinedCategory) {
            finalDisplayName = determinedCategory.minorName;
        }
    } else if (selectedMediumName && selectedMediumName !== "" && 
               selectedMajorName && selectedMajorName !== "") {
        // User selected Major and Medium, but not Minor (or Minor was placeholder)
        // Look for the N.C.E. entry for this medium category, representing the medium category itself.
        determinedCategory = DEPARTMENT_CATEGORIES.find(cat => 
            cat.majorName === selectedMajorName && 
            cat.mediumName === selectedMediumName &&
            cat.minorName === "N.C.E" 
        );
        if (determinedCategory) {
            finalDisplayName = determinedCategory.mediumName; // Display the medium name itself
        }
    } else if (selectedMajorName && selectedMajorName !== "") {
        // User selected Major only
        // Look for the N.C.E. medium and N.C.E. minor for this major.
        determinedCategory = DEPARTMENT_CATEGORIES.find(cat => 
            cat.majorName === selectedMajorName &&
            cat.mediumName === "N.C.E" && 
            cat.minorName === "N.C.E"
        );
        if (determinedCategory) {
            finalDisplayName = determinedCategory.majorName; // Display the major name itself
        }
    }

    if (determinedCategory && finalDisplayName) {
        finalCode = determinedCategory.majorCode + determinedCategory.mediumCode + determinedCategory.minorCode;
        setSelectedDepartment(finalCode);
    } else {
        setSelectedDepartment(null);
        const attemptedSelection = selectedMinorName || selectedMediumName || selectedMajorName;
        if (attemptedSelection && attemptedSelection !== "") {
             alert(`선택된 '${attemptedSelection}'에 대한 정확한 학과 코드를 찾을 수 없습니다. 모든 분류(대/중/소)를 순서대로 선택했는지 확인해주세요.`);
        } else {
            alert("학과가 선택되지 않았습니다. 먼저 대분류를 선택해주세요.");
        }
    }
    closeDepartmentSelectModal();
}

// 디바운스 함수 (필요시 다른 곳에서 사용 가능)
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => resolve(func(...args)), waitFor);
        });
}
