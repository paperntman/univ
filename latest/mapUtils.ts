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
    currentAdmissionTypeFilter, // 현재 선택된 입시 전형 필터 상태
    currentScoreDifferenceTolerance // 점수 차이 허용 오차
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
// (동일 대학-학과-전형 유형의 여러 세부 전형이 있을 경우, 성적을 평균내어 마커 색상에 반영)
export function getMarkerColorAndTooltipInfo(
    universityData: FilteredUniversity[],
    admissionType: AdmissionTypeFilterKey
): { color: string; tooltipText: string } {
    let color = INITIAL_MARKER_COLOR;
    let tooltipText = '';
    let r, g, b;

    if (universityData.length === 0) {
        return { color, tooltipText: '정보 없음' };
    }
    // 대학명, 학과명은 동일하다고 가정
    const base = universityData[0];
    tooltipText = `<b>${base.universityName}</b><br>${base.departmentName}`;

    if (admissionType === '경쟁률') {
        const rates = universityData.map(u => u.overallCompetitionRate).filter(v => v !== undefined) as number[];
        if (rates.length > 0) {
            const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
            const minRate = 1, maxRate = 30;
            const whiteColor = { r: 255, g: 255, b: 255 };
            const purpleColor = { r: 102, g: 51, b: 153 };
            const ratio = Math.min(1, Math.max(0, (avgRate - minRate) / (maxRate - minRate)));
            r = Math.round(whiteColor.r * (1 - ratio) + purpleColor.r * ratio);
            g = Math.round(whiteColor.g * (1 - ratio) + purpleColor.g * ratio);
            b = Math.round(whiteColor.b * (1 - ratio) + purpleColor.b * ratio);
            color = `rgb(${r}, ${g}, ${b})`;
            tooltipText += `<br>전체 경쟁률(평균): ${avgRate.toFixed(1)} : 1`;
        } else {
            tooltipText += '<br>경쟁률 정보 없음';
        }
        universityData.forEach(u => {
            if (u.admissionType) {
                tooltipText += `<br>• ${u.admissionType}: ${u.overallCompetitionRate ? u.overallCompetitionRate + ' : 1' : '정보 없음'}`;
            }
        });
    } else {
        // 성적 기반 필터(수능/교과/종합):
        const typeKey = typeKeyForMarkerLookup[admissionType];
        // 사용자 점수와 작년 점수 차이 목록
        let diffs: number[] = [];
        let userScores: number[] = [];
        let lastYearScores: number[] = [];
        universityData.forEach(u => {
            const result = u.admissionTypeResults[typeKey as keyof FilteredUniversityAdmissionResults];
            if (result && result.userCalculatedScore !== undefined && result.lastYearAvgConvertedScore !== undefined) {
                const diff = result.userCalculatedScore - result.lastYearAvgConvertedScore;
                diffs.push(diff);
                userScores.push(result.userCalculatedScore);
                lastYearScores.push(result.lastYearAvgConvertedScore);
            }
        });
        if (diffs.length === 0) {
        // 비교할 성적 데이터가 없으면 초기 회색 마커와 "정보 없음" 툴팁 반환
        tooltipText += `<br>작년 입시 결과 정보 없음`;
        return {
            color: INITIAL_MARKER_COLOR, // config.ts에 정의된 회색
            tooltipText
        };
    }
        // 평균 diff로 색상 결정
        let avgDiff = 0;
        if (diffs.length > 0) {
            avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        }

        //TODO DELETE
              
        // 빨강-초록-파랑 그라데이션
        // 빨강: diff >= 1
        // 빨강~초록: 0.3 < diff < 1
        // 초록: -0.3 <= diff <= 0.3
        // 초록~파랑: -1 < diff < -0.3
        // 파랑: diff <= -1
        let red = [255, 80, 80];
        let green = [80, 200, 120];
        let blue = [60, 120, 255];
        let r, g, b;

        if (avgDiff >= 1) {
            [r, g, b] = red;
        } else if (avgDiff > 0.3) {
            // [수정됨] 초록색(green)에서 빨간색(red)으로 변하도록 수정
            const t = (avgDiff - 0.3) / (1 - 0.3);
            r = Math.round(green[0] * (1 - t) + red[0] * t); // green과 red 위치 변경
            g = Math.round(green[1] * (1 - t) + red[1] * t);
            b = Math.round(green[2] * (1 - t) + red[2] * t);
        } else if (avgDiff >= -0.3) {
            [r, g, b] = green;
        } else if (avgDiff > -1) {
            // [수정됨] 파란색(blue)에서 초록색(green)으로 변하도록 수정
            // 1. 올바른 정규화 (min: -1, max: -0.3)
            const t = (avgDiff - (-1)) / (-0.3 - (-1)); // (value - min) / (max - min)
            // 2. 올바른 보간법 (t=0일때 blue, t=1일때 green)
            r = Math.round(blue[0] * (1 - t) + green[0] * t); // blue와 green 위치 및 순서
            g = Math.round(blue[1] * (1 - t) + green[1] * t);
            b = Math.round(blue[2] * (1 - t) + green[2] * t);
        } else {
            [r, g, b] = blue;
        }
        color = `rgb(${r}, ${g}, ${b})`;

         // =================================================================
        // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 디버깅 정보 추가 시작 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
        // =================================================================

        // 사용자 점수(여러 세부전형이 동일하다면 하나만, 다르면 평균)
        let userScoreText = '';
        if (userScores.length > 0) {
            const uniq = Array.from(new Set(userScores.map(x => x.toFixed(2))));
            if (uniq.length === 1) {
                userScoreText = uniq[0];
            } else {
                userScoreText = (userScores.reduce((a, b) => a + b, 0) / userScores.length).toFixed(2);
            }
        } else {
            userScoreText = '정보 없음';
        }
        tooltipText += `<br><b>나의 점수:</b> ${userScoreText}`;
        // 세부전형별 점수 모두 나열
        universityData.forEach(u => {
            const result = u.admissionTypeResults[typeKey as keyof FilteredUniversityAdmissionResults];
            if (u.detailAdmissionType && result && result.lastYearAvgConvertedScore !== undefined) {
                tooltipText += `<br>• ${u.detailAdmissionType} - 작년 점수: ${result.lastYearAvgConvertedScore}`;
            }
        });

        // 구분선 및 디버그 정보 추가
        tooltipText += `<br><hr style='margin: 5px 0; border-top: 1px dashed #aaa;'>`;
        tooltipText += `<div style='font-size: 0.8em; color: #555;'>`;
        tooltipText += `<b>[Debug Info]</b>`;
        tooltipText += `<br><b>평균 점수 차 (avgDiff):</b> ${avgDiff.toFixed(3)}`;
        tooltipText += `<br><b>계산된 차이 목록 (diffs):</b> [${diffs.map(d => d.toFixed(2)).join(', ')}]`;
        tooltipText += `</div>`;
        
        // =================================================================
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 디버깅 정보 추가 끝 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        // =================================================================
    }
    return { color, tooltipText };
}

// 필터링된 대학 목록을 기반으로 지도 위의 마커들을 업데이트하는 함수
// updateMarkers 함수 내에서 대학-학과-전형 유형별로 그룹핑하여 마커 생성
export function updateMarkers() {
    if (!map || !markersLayerGroup) return;
    markersLayerGroup.clearLayers();

    if (currentFilteredUniversities.length === 0) {
        if(selectedDepartment) {
            console.log("No universities match current filters.");
        }
        return;
    }

    // 그룹핑 함수 (기존과 동일)
    function groupBy(arr: FilteredUniversity[], keyFn: (u: FilteredUniversity) => string) {
        const map = new Map<string, FilteredUniversity[]>();
        arr.forEach(u => {
            const key = keyFn(u);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(u);
        });
        return Array.from(map.values());
    }

    let groups: FilteredUniversity[][];
    const isCompetitionRateFilter = currentAdmissionTypeFilter === '경쟁률';

    // 그룹핑 로직 (기존과 동일)
    if (isCompetitionRateFilter) {
        groups = groupBy(currentFilteredUniversities, u => `${u.universityName}|${u.departmentName}`);
    } else {
        const typeKeyForMarkerLookup: { [key in AdmissionTypeFilterKey]?: keyof FilteredUniversityAdmissionResults } = {
            '수능': 'suneung', '교과': 'gyogwa', '종합': 'jonghap'
        };
        const typeKey = typeKeyForMarkerLookup[currentAdmissionTypeFilter];
        groups = groupBy(currentFilteredUniversities, u => `${u.universityName}|${u.departmentName}|${typeKey}`);
    }

    // 마커 생성 루프
    groups.forEach(group => {
        const base = group[0];
        if (!base.location || typeof base.location.latitude !== 'number' || typeof base.location.longitude !== 'number') {
            console.warn(`University ${base.universityName} has invalid location data. Skipping marker.`);
            return;
        }
        
        // 1. 색상과 툴팁 정보를 먼저 가져옴
        const { color, tooltipText } = getMarkerColorAndTooltipInfo(group, currentAdmissionTypeFilter);

        // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
        // 2. 새로운 필터링 조건 적용
        // 성적 기반 필터이고, 편차 범위가 8이 아니고, 마커 색상이 회색(정보 없음)이면, 이 마커를 건너뜀
        if (!isCompetitionRateFilter && currentScoreDifferenceTolerance !== 8 && color === INITIAL_MARKER_COLOR) {
            return; // 마커를 지도에 추가하지 않고 다음 그룹으로 넘어감
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // 3. 필터링을 통과한 마커만 지도에 추가
        const markerHtml = createMarkerIconSVG(color);
        const icon = L.divIcon({
            html: markerHtml,
            className: 'custom-marker-icon',
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
        });
        const marker = L.marker([base.location.latitude, base.location.longitude], { icon })
            .bindTooltip(tooltipText, { direction: 'top', offset: L.point(0, -40) });
        marker.on('click', () => {
            openSidebar(base.universityId, base.departmentName);
        });
        markersLayerGroup.addLayer(marker);
    });
    // 지도 범위 조정
    if (currentFilteredUniversities.length > 0) {
        const validLocations = currentFilteredUniversities.filter(uni => uni.location && typeof uni.location.latitude === 'number');
        if (validLocations.length > 0) {
            const bounds = L.latLngBounds(validLocations.map(u => [u.location.latitude, u.location.longitude]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
            map.setView([36.5, 127.5], 7);
        }
    } else {
        map.setView([36.5, 127.5], 7);
    }
}