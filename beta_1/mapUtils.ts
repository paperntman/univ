// 이 파일은 Leaflet 지도의 초기화, 마커 생성 및 업데이트, 마커 스타일링 등
// 지도와 관련된 유틸리티 함수들을 담당합니다.

// L (Leaflet)이 전역적으로 사용 가능하거나 'leaflet'에서 임포트 되었는지 확인합니다.
declare var L: any;

import { InitialUniversityData, FilteredUniversity, AdmissionTypeFilterKey, FilteredUniversityAdmissionResults } from './types';
import { INITIAL_MARKER_COLOR, INITIAL_MARKER_CLICK_MESSAGE } from './config'; // API_BASE_URL 제거
import { fetchInitialMapData } from './api'; // mockFetch 대신 fetchInitialMapData 임포트
import { showLoading } from './uiUtils';
import { openSidebar } from './sidebarUtils';
import { 
    map, setMap, // 지도 인스턴스 상태
    markersLayerGroup, setMarkersLayerGroup, // 마커 레이어 그룹 상태
    currentFilteredUniversities, // 현재 필터링된 대학 목록 상태
    selectedDepartment, // 선택된 학과 상태
    currentAdmissionTypeFilter // 현재 선택된 입시 전형 필터 상태
} from './state';

// 지도를 초기화하는 함수
export function initMap(mapDiv: HTMLElement) {
    if (mapDiv && !map) { // mapDiv가 존재하고, map 인스턴스가 아직 생성되지 않았을 경우에만 실행
        const leafletMap = L.map(mapDiv).setView([36.5, 127.5], 7); // 대한민국 중심 좌표 및 초기 줌 레벨 설정
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // OpenStreetMap 타일 레이어 사용
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(leafletMap);
        
        const newMarkersLayerGroup = L.layerGroup().addTo(leafletMap); // 마커들을 담을 레이어 그룹 생성 및 지도에 추가
        setMarkersLayerGroup(newMarkersLayerGroup); // 생성된 마커 레이어 그룹을 전역 상태에 저장
        setMap(leafletMap); // 생성된 지도 인스턴스를 전역 상태에 저장
    }
}

// 초기 대학 마커들을 로드하는 함수
export async function loadInitialMarkers() {
    if (!map || !markersLayerGroup) return; // 지도나 마커 레이어 그룹이 없으면 실행 중단
    // showLoading(true); // fetchInitialMapData 내부에서 처리

    try {
        // 초기 대학 데이터를 API로부터 가져옴
        const initialUniversities = await fetchInitialMapData();
        markersLayerGroup.clearLayers(); // 기존 마커 모두 제거
        if (!initialUniversities || initialUniversities.length === 0) {
            console.warn("No initial university data received."); // 데이터가 없으면 경고 출력
            // fetchInitialMapData 내부에서 alert 처리 가능성
            return;
        }

        // 각 대학 데이터에 대해 마커 생성
        initialUniversities.forEach(uni => {
            const markerHtml = createMarkerIconSVG(INITIAL_MARKER_COLOR); // 기본 색상으로 마커 SVG 생성
            const icon = L.divIcon({ // SVG를 사용한 커스텀 아이콘 생성
                html: markerHtml, 
                className: 'custom-marker-icon', 
                iconSize: [30, 40], // 아이콘 크기
                iconAnchor: [15, 40], // 아이콘 기준점 (하단 중앙)
                popupAnchor: [0, -40] // 팝업 기준점
            });
            const marker = L.marker([uni.location.latitude, uni.location.longitude], { icon }) // 마커 생성
                .bindTooltip(uni.universityName); // 마우스 오버 시 대학명 툴팁 표시
            
            // 초기 마커 클릭 시 안내 메시지 표시
            marker.on('click', () => {
                alert(INITIAL_MARKER_CLICK_MESSAGE);
            });
            markersLayerGroup.addLayer(marker); // 마커를 레이어 그룹에 추가
        });

        // 모든 마커가 보이도록 지도 범위 조정
        if (initialUniversities.length > 0) {
            const bounds = L.latLngBounds(initialUniversities.map(u => [u.location.latitude, u.location.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] }); // 약간의 여백을 두고 범위 맞춤
        }
    } catch (error) {
        console.error("Error in loadInitialMarkers after API call:", error);
        // alert("초기 대학 마커를 불러오는 데 실패했습니다."); // fetchInitialMapData에서 이미 처리했을 수 있음
    } finally {
        // showLoading(false); // fetchInitialMapData 내부에서 처리
    }
}

// 마커 아이콘 SVG 문자열을 생성하는 함수
export function createMarkerIconSVG(color: string): string {
    const svgWidth = 30; 
    const svgHeight = 40;
    // 물방울 모양 경로 데이터
    const path = `M${svgWidth/2},${svgHeight} L0,${svgHeight*0.3} Q${svgWidth/2},-${svgHeight*0.1} ${svgWidth},${svgHeight*0.3} Z`;
    return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg"><path d="${path}" fill="${color}" stroke="#FFF" stroke-width="1.5"/></svg>`;
}

// 필터링된 대학 정보에 따라 마커 색상 및 툴팁 정보를 결정하는 헬퍼 함수용 룩업 테이블
// (한글 입시 전형명 -> FilteredUniversityAdmissionResults의 영문 키)
const typeKeyForMarkerLookup: { [key in AdmissionTypeFilterKey]?: keyof FilteredUniversityAdmissionResults } = {
    '수능': 'suneung',
    '교과': 'gyogwa',
    '종합': 'jonghap'
    // '경쟁률'은 여기서 직접 사용되지 않고, overallCompetitionRate를 통해 처리됨
};

// 대학 데이터와 현재 입시 전형 필터에 따라 마커 색상 및 툴팁 내용을 결정하는 함수
export function getMarkerColorAndTooltipInfo(
    universityData: FilteredUniversity,
    admissionType: AdmissionTypeFilterKey // 전역 상태의 currentAdmissionTypeFilter 값
): { color: string; tooltipText: string } {
    let r, g, b; // RGB 색상값
    let color = INITIAL_MARKER_COLOR; // 기본 마커 색상 (회색)
    let tooltipText = `${universityData.universityName}<br>${universityData.departmentName}`; // 기본 툴팁 텍스트
    
    // 1. '경쟁률' 필터일 경우
    if (admissionType === '경쟁률' && universityData.overallCompetitionRate !== undefined) {
        const rate = universityData.overallCompetitionRate;
        const minRate = 1; const maxRate = 30; // 경쟁률 범위 (색상 계산용)
        // 경쟁률에 따라 흰색(낮음) ~ 보라색(높음)으로 색상 보간
        const whiteColor = { r: 255, g: 255, b: 255 }; 
        const purpleColor = { r: 102, g: 51, b: 153 }; // (예시: 어두운 보라색)

        const ratio = Math.min(1, Math.max(0, (rate - minRate) / (maxRate - minRate))); // 0~1 사이의 비율로 정규화
        r = Math.round(whiteColor.r * (1 - ratio) + purpleColor.r * ratio);
        g = Math.round(whiteColor.g * (1 - ratio) + purpleColor.g * ratio);
        b = Math.round(whiteColor.b * (1 - ratio) + purpleColor.b * ratio);
        color = `rgb(${r}, ${g}, ${b})`;
        tooltipText += `<br>전체 경쟁률: ${rate.toFixed(1)} : 1`;

    // 2. '경쟁률' 이외의 전형 필터일 경우 (수능, 교과, 종합)
    } else if (admissionType !== '경쟁률') {
        const typeKey = typeKeyForMarkerLookup[admissionType]; // 현재 필터에 맞는 영문 키 가져오기
        const resultForType = typeKey ? universityData.admissionTypeResults[typeKey] : undefined; // 해당 전형의 결과 데이터

        // 해당 전형의 사용자 계산 점수와 작년 평균 점수가 모두 있을 경우 색상 계산
        if (resultForType && resultForType.userCalculatedScore !== undefined && resultForType.lastYearAvgConvertedScore !== undefined) {
            const userScore = resultForType.userCalculatedScore;
            const avgScore = resultForType.lastYearAvgConvertedScore;
            const deviation = userScore - avgScore; // 나의 점수 - 작년 평균 점수

            // 점수 차이에 따른 색상 기준 (예시)
            const SIGNIFICANT_DIFF_POSITIVE = 20; // 매우 긍정적 차이 (초록색)
            const SIGNIFICANT_DIFF_NEGATIVE = -20; // 매우 부정적 차이 (빨간색)

            // 목표 색상들
            const greenTarget = { r: 76, g: 175, b: 80 }; // 초록색 (매우 유리)
            const blueTarget = { r: 3, g: 169, b: 244 };   // 파란색 (유리)
            const yellowTarget = { r: 255, g: 193, b: 7 }; // 노란색 (약간 불리)
            const redTarget = { r: 211, g: 47, b: 47 };    // 빨간색 (매우 불리)

            // 점수 차이에 따라 색상 결정
            if (deviation >= SIGNIFICANT_DIFF_POSITIVE) { ({ r, g, b } = greenTarget); } // 매우 유리
            else if (deviation > 0) { // 유리 (파란색 ~ 초록색 사이)
                const ratio = deviation / SIGNIFICANT_DIFF_POSITIVE;
                r = Math.round(blueTarget.r * (1 - ratio) + greenTarget.r * ratio);
                g = Math.round(blueTarget.g * (1 - ratio) + greenTarget.g * ratio);
                b = Math.round(blueTarget.b * (1 - ratio) + greenTarget.b * ratio);
            } else if (deviation > SIGNIFICANT_DIFF_NEGATIVE) { // 약간 불리 (노란색 ~ 파란색 사이)
                 const ratio = (deviation - SIGNIFICANT_DIFF_NEGATIVE) / Math.abs(SIGNIFICANT_DIFF_NEGATIVE);
                r = Math.round(yellowTarget.r * (1 - ratio) + blueTarget.r * ratio);
                g = Math.round(yellowTarget.g * (1 - ratio) + blueTarget.g * ratio);
                b = Math.round(yellowTarget.b * (1 - ratio) + blueTarget.b * ratio);
            } else { ({ r, g, b } = redTarget); } // 매우 불리
            
            color = `rgb(${r}, ${g}, ${b})`;
            tooltipText += `<br>${admissionType} 전형: 나의 ${userScore.toFixed(1)} / 작년 ${avgScore.toFixed(1)} (차: ${deviation.toFixed(1)})`;
            
            // 수능 최저학력기준 충족 여부 (수시 전형에서 주로 의미 있음)
            if (resultForType.suneungMinSatisfied !== undefined && admissionType !== '수능') {
                 tooltipText += `<br>수능최저: ${resultForType.suneungMinSatisfied ? "충족" : "미충족"}`;
            }
        // '종합' 전형이고 점수 정보는 없지만 정성평가 결과가 있을 경우
        } else if (admissionType === '종합' && resultForType?.qualitativeEvaluation) {
            color = `rgb(150, 150, 150)`; // 정성평가는 중립적인 회색 계열로 표시 (예시)
            tooltipText += `<br>${admissionType} 전형: ${resultForType.qualitativeEvaluation}`;
             if (resultForType.suneungMinSatisfied !== undefined) {
                 tooltipText += `<br>수능최저: ${resultForType.suneungMinSatisfied ? "충족" : "미충족"}`;
            }
        } else { // 해당 전형 정보가 없을 경우
             tooltipText += `<br>${admissionType} 전형: 정보 없음`;
        }
    }
    return { color, tooltipText };
}

// 필터링된 대학 목록을 기반으로 지도 위의 마커들을 업데이트하는 함수
export function updateMarkers() {
    if (!map || !markersLayerGroup) return; // 지도나 마커 레이어 그룹 없으면 중단
    markersLayerGroup.clearLayers(); // 기존 마커 모두 제거

    // 필터링된 대학 목록이 비어있을 경우
    if (currentFilteredUniversities.length === 0) {
        if(selectedDepartment) { // 학과가 선택된 상태에서 결과가 없으면 메시지 표시 (alert 또는 다른 UI 요소로)
            // map.setView([36.5, 127.5], 7); // 지도를 기본 뷰로 재설정 (선택사항)
            console.log("No universities match current filters."); // 콘솔에 메시지 출력
        }
        return;
    }

    // 필터링된 각 대학에 대해 마커 생성 및 추가
    currentFilteredUniversities.forEach(uni => {
        // 유효한 위치 정보가 없으면 해당 대학 마커는 건너뜀
        if (!uni.location || typeof uni.location.latitude !== 'number' || typeof uni.location.longitude !== 'number') {
            console.warn(`University ${uni.universityName} has invalid location data. Skipping marker.`);
            return;
        }

        // 마커 색상 및 툴팁 정보 가져오기
        const { color, tooltipText } = getMarkerColorAndTooltipInfo(uni, currentAdmissionTypeFilter);
        const markerHtml = createMarkerIconSVG(color); // 마커 SVG 생성
        const icon = L.divIcon({ // 커스텀 아이콘 설정
            html: markerHtml, 
            className: 'custom-marker-icon', 
            iconSize: [30, 40], 
            iconAnchor: [15, 40], // 아이콘 기준점 (하단 중앙)
            popupAnchor: [0, -40] // 팝업 기준점 (툴팁 위치 조정용)
        });
        
        const marker = L.marker([uni.location.latitude, uni.location.longitude], { icon }) // 마커 생성
            .bindTooltip(tooltipText, { direction: 'top', offset: L.point(0, -40) }); // 툴팁 설정 (마커 위쪽)

        // 마커 클릭 시 사이드바 열기
        marker.on('click', () => {
            openSidebar(uni.universityId, uni.departmentName);
        });
        markersLayerGroup.addLayer(marker); // 마커를 레이어 그룹에 추가
    });

    // 업데이트된 마커들이 모두 보이도록 지도 범위 조정
    if (currentFilteredUniversities.length > 0) {
        // 유효한 위치 데이터가 있는 대학들만 필터링하여 bounds 계산
        const validLocations = currentFilteredUniversities.filter(uni => uni.location && typeof uni.location.latitude === 'number');
        if (validLocations.length > 0) {
            const bounds = L.latLngBounds(validLocations.map(u => [u.location.latitude, u.location.longitude]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 }); // 약간의 여백, 최대 줌 레벨 제한
        } else { // 유효한 위치 데이터가 하나도 없으면 기본 뷰로
             map.setView([36.5, 127.5], 7);
        }
    } else { // 필터링된 대학이 하나도 없으면 (이 경우는 위에서 처리되지만, 방어적으로)
        map.setView([36.5, 127.5], 7); // 기본 뷰로
    }
}
