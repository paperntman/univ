// 이 파일은 애플리케이션의 주요 설정을 정의합니다.
// API 기본 URL, 초기 마커 색상, 정적 데이터 목록 (예: 수능 탐구 과목) 등을 포함합니다.
// 이 값을 변경하면 애플리케이션 전체 동작에 영향을 줄 수 있습니다.

export const API_BASE_URL = '/api'; // 백엔드 API의 기본 URL (현재는 목업 API 경로로 사용)
export const INITIAL_MARKER_COLOR = '#cccccc'; // 필터 적용 전 초기 마커 색상 (회색)
export const INITIAL_MARKER_CLICK_MESSAGE = "학과와 성적을 입력하고 필터를 적용하여 상세 정보를 확인하세요."; // 초기 마커 클릭 시 표시될 메시지

// 수능 탐구 과목 목록 (정적 데이터) - ApiSubjectInfo 타입과 일치
// API에서 동적으로 가져오기 전 또는 실패 시 사용될 수 있습니다.
// 이 목록은 이제 '과목' 목록 중 탐구 영역에 해당합니다. '교과' 목록은 별도로 API에서 가져옵니다.
export const SUNEUNG_EXPLORER_SUBJECTS_STATIC: {subjectCode: string, subjectName: string}[] = [
    { subjectCode: "SA01", subjectName: "생활과 윤리" },
    { subjectCode: "SA02", subjectName: "윤리와 사상" },
    { subjectCode: "SA03", subjectName: "한국지리" },
    { subjectCode: "SA04", subjectName: "세계지리" },
    { subjectCode: "SA05", subjectName: "동아시아사" },
    { subjectCode: "SA06", subjectName: "세계사" },
    { subjectCode: "SA07", subjectName: "경제" },
    { subjectCode: "SA08", subjectName: "정치와 법" },
    { subjectCode: "SA09", subjectName: "사회·문화" },
    { subjectCode: "SC01", subjectName: "물리학Ⅰ" },
    { subjectCode: "SC02", subjectName: "화학Ⅰ" },
    { subjectCode: "SC03", subjectName: "생명과학Ⅰ" },
    { subjectCode: "SC04", subjectName: "지구과학Ⅰ" },
    { subjectCode: "SC05", subjectName: "물리학Ⅱ" },
    { subjectCode: "SC06", subjectName: "화학Ⅱ" },
    { subjectCode: "SC07", subjectName: "생명과학Ⅱ" },
    { subjectCode: "SC08", subjectName: "지구과학Ⅱ" },
];

// 수능 국어 선택과목 옵션 (정적 데이터)
export const SUNEUNG_KOREAN_OPTIONS_STATIC: {subjectCode: string, subjectName: string}[] = [
    { subjectCode: "KOR_OPT_HWAPJAK", subjectName: "화법과 작문"},
    { subjectCode: "KOR_OPT_EONMAE", subjectName: "언어와 매체"},
];

// 수능 수학 선택과목 옵션 (정적 데이터)
export const SUNEUNG_MATH_OPTIONS_STATIC: {subjectCode: string, subjectName: string}[] = [
    { subjectCode: "MAT_OPT_HWAKTONG", subjectName: "확률과 통계"},
    { subjectCode: "MAT_OPT_MIJEOK", subjectName: "미적분"},
    { subjectCode: "MAT_OPT_GIHA", subjectName: "기하"},
];

// 내신 성취도 레벨 목록 (정적 데이터)
export const NAESIN_ACHIEVEMENT_LEVELS_STATIC: string[] = ['A', 'B', 'C', 'D', 'E', 'P', 'F', 'I', 'PASS', 'FAIL'];
