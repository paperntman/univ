// 이 파일은 사이드바의 열기/닫기 기능, 사이드바 콘텐츠 렌더링 등
// 사이드바와 관련된 유틸리티 함수들을 담당합니다.

import { UniversitySidebarDetails, AdmissionTypeFilterKey, SidebarItem } from './types';
// import { API_BASE_URL } from './config'; // API_BASE_URL은 api.ts에서 사용
import { fetchUniversitySidebarDetailsApi } from './api'; // mockFetch 대신 fetchUniversitySidebarDetailsApi 임포트
import { showLoading } from './uiUtils';
import { 
    currentSidebarData, setCurrentSidebarData, // 현재 사이드바 데이터 상태
    lastOpenedUniversityId, setLastOpenedUniversityId, // 마지막으로 열었던 대학 ID 상태
    currentAdmissionTypeFilter, // 현재 선택된 입시 전형 필터 상태
    userAllGrades // 사용자 전체 성적 데이터 (현재는 목업 GET 요청에 직접 사용되지 않음)
} from './state';

// 사이드바 관련 DOM 요소들을 저장할 변수
let sidebarDiv: HTMLElement | null = null; // 사이드바 전체 div
let sidebarContentDiv: HTMLElement | null = null; // 사이드바 내용이 표시될 div
let closeSidebarButton: HTMLButtonElement | null = null; // 사이드바 닫기 버튼

// 사이드바 컨트롤(DOM 요소 및 이벤트 리스너)을 초기화하는 함수
export function initializeSidebarControls(
    sidebarElement: HTMLElement,
    sidebarContentElement: HTMLDivElement,
    closeButtonElement: HTMLButtonElement
) {
    sidebarDiv = sidebarElement;
    sidebarContentDiv = sidebarContentElement;
    closeSidebarButton = closeButtonElement;

    // 닫기 버튼에 이벤트 리스너 추가
    if (closeSidebarButton) {
        closeSidebarButton.addEventListener('click', closeSidebar);
    }
}

// 특정 대학의 상세 정보를 사이드바에 표시하는 함수
export async function openSidebar(universityId: string, departmentName: string) {
    if (!sidebarDiv) return; // 사이드바 div가 없으면 중단

    setLastOpenedUniversityId(universityId); // 마지막으로 연 대학 ID를 상태에 저장
    // showLoading(true); // fetchUniversitySidebarDetailsApi 내부에서 처리

    try {
        // API로부터 데이터 가져오기
        const fetchedData = await fetchUniversitySidebarDetailsApi(
            universityId, 
            departmentName, 
            currentAdmissionTypeFilter
            // userAllGrades // 필요시 전달 가능
        );

        if (fetchedData) { // null이 아닌 경우 (성공 또는 API 함수 내에서 처리된 오류로 null 반환)
            setCurrentSidebarData(fetchedData);
            renderSidebarContent();
            sidebarDiv.classList.remove('hidden');
            sidebarDiv.classList.add('visible');
            sidebarDiv.setAttribute('aria-hidden', 'false');
        } else {
            // fetchUniversitySidebarDetailsApi 내부에서 alert 처리되었을 것이므로 여기서는 추가 alert 자제
            // 또는, 여기서 포괄적인 메시지 표시 가능
            // alert("대학 상세 정보를 불러오지 못했습니다."); // API 함수에서 이미 처리했을 수 있음
            setCurrentSidebarData(null); // 데이터 초기화 확실히
            renderSidebarContent(); // 빈 내용으로 렌더링
        }
    } catch (error) { // fetchUniversitySidebarDetailsApi에서 throw된 에러는 여기서 잡히지 않을 수 있음
        console.error("Exception in openSidebar after API call:", error);
        // alert("대학 상세 정보를 불러오는 중 예외가 발생했습니다."); // API 함수에서 이미 처리했을 수 있음
        setCurrentSidebarData(null);
        renderSidebarContent();
    } finally {
        // showLoading(false); // fetchUniversitySidebarDetailsApi 내부에서 처리
    }
}

// 사이드바를 닫는 함수
export function closeSidebar() {
    if (!sidebarDiv) return; // 사이드바 div가 없으면 중단
    sidebarDiv.classList.remove('visible'); // 사이드바 보임 클래스 제거
    sidebarDiv.classList.add('hidden'); // 사이드바 숨김 클래스 추가
    sidebarDiv.setAttribute('aria-hidden', 'true'); // 접근성을 위해 aria-hidden 속성 업데이트
    setCurrentSidebarData(null); // 사이드바 데이터 초기화
    setLastOpenedUniversityId(null); // 마지막으로 연 대학 ID 초기화
}

// 현재 사이드바 데이터(currentSidebarData)를 기반으로 사이드바 내용을 HTML로 렌더링하는 함수
export function renderSidebarContent() {
    if (!sidebarContentDiv) return; // 내용 표시 div 없으면 중단

    if (!currentSidebarData) { // 표시할 데이터가 없으면
        sidebarContentDiv.innerHTML = '<p>표시할 정보가 없습니다.</p>';
        return;
    }
    
    // 사이드바 HTML 구성
    let html = `
        <h3 id="sidebar-title">${currentSidebarData.universityName} - ${currentSidebarData.departmentName}</h3>
        ${currentSidebarData.logoUrl ? `<img src="${currentSidebarData.logoUrl}" alt="${currentSidebarData.universityName} 로고" style="max-width:100px; margin: 0 auto 15px; display: block;">` : ''}
    `;

    // 섹션들을 isHighlighted 기준으로 정렬 (강조된 섹션이 위로 오도록)
    const sortedSections = [...currentSidebarData.sidebarSections].sort((a, b) => {
        if (a.isHighlighted && !b.isHighlighted) return -1; // a가 강조되고 b는 아니면 a를 앞으로
        if (!a.isHighlighted && b.isHighlighted) return 1;  // b가 강조되고 a는 아니면 b를 앞으로
        return 0; // 그 외에는 순서 유지
    });

    // 각 섹션 렌더링
    sortedSections.forEach(section => {
        const sectionId = `section-title-${section.sectionTitle.replace(/\s+/g, '-').toLowerCase()}`; // 접근성을 위한 ID 생성
        html += `<div class="sidebar-section ${section.isHighlighted ? 'highlighted' : ''}" role="region" aria-labelledby="${sectionId}">
                    <h4 id="${sectionId}">${section.sectionTitle}</h4>`;
        // 섹션 내 각 항목 렌더링
        section.items.forEach((item: SidebarItem) => { // item 타입을 명시적으로 지정
            let valueDisplay = String(item.value); // 기본 값 표시
            
            // 링크 처리: item.link가 있거나, item.type이 "link"이면 item.value를 URL로 사용
            const url = item.link || (item.type === "link" ? String(item.value) : undefined);

            if (url) {
                // 링크 텍스트 결정: item.type이 "link"일 때 특정 레이블이면 "바로가기", 아니면 item.value 사용.
                // 그 외의 경우 item.value를 텍스트로 사용.
                const linkText = item.type === "link" 
                    ? (item.label === "대학 입학처" || item.label === "학과 홈페이지" ? "바로가기" : item.value) 
                    : item.value;
                valueDisplay = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText} <span class="external-link-indicator" aria-label="(새 창 열림)">↗</span></a>`;
            }

            html += `<div class="item">
                        <span class="label">${item.label}:</span>
                        <span class="value">${valueDisplay}</span>
                    </div>`;
        });
        // 참고 노트 렌더링
        if (section.notes && section.notes.length > 0) {
            html += '<ul class="notes">';
            section.notes.forEach(note => { html += `<li>${note}</li>`; });
            html += '</ul>';
        }
        html += `</div>`;
    });
    sidebarContentDiv.innerHTML = html; // 완성된 HTML을 사이드바 콘텐츠 div에 삽입
}
