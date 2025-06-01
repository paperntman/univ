# 대학 입시 정보 시각화 서비스 백엔드 API 업데이트 요청

## 변경 요약

기존 내신 성적 입력 방식에 '교과구분종류' 항목이 추가됨에 따라, 관련 API의 요청 및 응답 명세 변경이 필요합니다. 주요 변경 사항은 다음과 같습니다.

1.  **과목 목록 조회 API (`GET /api/subjects`)**:
    *   '교과구분종류' 목록을 조회하는 기능 추가
    *   선택된 '교과구분종류'에 따른 '교과' 목록을 조회하는 기능 추가
    *   기존 '교과' 선택에 따른 '과목' 목록 조회 기능 유지 (명칭 및 설명 명확화)
2.  **대학 필터링 API (`POST /api/universities/filter`)**:
    *   사용자 내신 성적 데이터(`userGrades.naesin`)에 '교과구분종류 코드' 및 '교과구분종류명' 필드 추가

## 1. 초기 대학 마커 데이터 로드 (변경 없음)

-   **Endpoint:** `GET /map/initial-data`
-   **Purpose:** 지도에 표시할 초기 대학 목록 및 위치 정보를 가져옵니다.
-   **Request Parameters:** 없음
-   **Request Body:** 없음
-   **Response Body:** `InitialUniversityData[]` (JSON Array)

    ```json
    [
      {
        "universityId": "string", // 대학 고유 ID
        "universityName": "string", // 대학명
        "location": {
          "latitude": "number", // 위도
          "longitude": "number" // 경도
        }
      }
      // ... more universities
    ]
    ```

## 2. 학과 검색 자동완성 제안 (변경 없음)

-   **Endpoint:** `GET /api/departments/suggest`
-   **Purpose:** 사용자가 입력한 검색어에 따라 학과명 자동완성 목록을 제공합니다.
-   **Request Parameters:**
    -   `query` (string): 사용자가 입력한 학과 검색어
-   **Request Body:** 없음
-   **Response Body:** `DepartmentSuggestion[]` (JSON Array)

    ```json
    [
      {
        "departmentName": "string", // 추천 학과명
        "keywords": ["string", "string"] // 관련 키워드 목록 (선택 사항)
      }
      // ... more suggestions
    ]
    ```

## 3. 과목 목록 조회 (업데이트됨)

-   **Endpoint:** `GET /api/subjects`
-   **Purpose:** 특정 유형에 따른 '교과구분종류', '교과', '과목' 또는 수능 선택과목 목록을 가져옵니다.
-   **Request Parameters:**
    -   `type` (string): 조회할 목록 유형. 다음 값 중 하나:
        -   `"naesin_curriculum_classifications"`: (신규) 내신 '교과구분종류' 목록 (예: 일반 교과, 진로 선택 교과 등).
        -   `"naesin_curriculums_for_classification"`: (신규) 특정 '교과구분종류'에 속하는 '교과' 목록. 이 경우 `classificationCode` 파라미터가 추가로 필요합니다.
        -   `"naesin_subjects_for_curriculum"`: 특정 '교과'에 속하는 '과목' 목록. 이 경우 `curriculumCode` 파라미터가 추가로 필요합니다.
        -   `"naesin_subjects_all"`: (기존 유지) 모든 내신 '과목'의 전체 목록 (UI 필터링용 또는 초기 데이터 로드용).
        -   `"suneung_국어"`: (기존 유지) 수능 국어 선택 과목 목록.
        -   `"suneung_수학"`: (기존 유지) 수능 수학 선택 과목 목록.
        -   `"suneung_탐구"`: (기존 유지) 수능 탐구 과목 목록.
    -   `classificationCode` (string, Optional): `type`이 `"naesin_curriculums_for_classification"`일 때 필수. 조회할 교과구분종류의 코드.
    -   `curriculumCode` (string, Optional): `type`이 `"naesin_subjects_for_curriculum"`일 때 필수. 조회할 교과의 코드.
-   **Request Body:** 없음
-   **Response Body:** `ApiSubjectInfo[]` (JSON Array)

    ```json
    // 공통 ApiSubjectInfo 구조:
    // {
    //   "subjectCode": "string", // 코드 (교과구분종류 코드, 교과 코드, 과목 코드 등)
    //   "subjectName": "string", // 명칭 (교과구분종류명, 교과명, 과목명 등)
    //   "parentCode": "string | undefined" // 상위 코드 (예: 과목의 경우 교과 코드, 교과의 경우 교과구분종류 코드)
    // }

    // 예시: type="naesin_curriculum_classifications"
    [
      {
        "subjectCode": "CLASS_COMMON", // 교과구분종류 코드
        "subjectName": "일반 교과"      // 교과구분종류명
      },
      {
        "subjectCode": "CLASS_CAREER",
        "subjectName": "진로 선택 교과"
      }
      // ... more curriculum classifications
    ]

    // 예시: type="naesin_curriculums_for_classification", classificationCode="CLASS_COMMON"
    [
      {
        "subjectCode": "CURR_KOR",    // 교과 코드
        "subjectName": "국어",        // 교과명
        "parentCode": "CLASS_COMMON"  // 상위 교과구분종류 코드
      },
      {
        "subjectCode": "CURR_MATH",
        "subjectName": "수학",
        "parentCode": "CLASS_COMMON"
      }
      // ... more curriculums for the classification
    ]

    // 예시: type="naesin_subjects_for_curriculum", curriculumCode="CURR_MATH"
    [
      {
        "subjectCode": "MATH001",    // 과목 코드
        "subjectName": "수학Ⅰ",      // 과목명
        "parentCode": "CURR_MATH"  // 상위 교과 코드
      },
      {
        "subjectCode": "MATH002",
        "subjectName": "미적분",
        "parentCode": "CURR_MATH"
      }
      // ... more subjects for the curriculum
    ]
    ```

## 4. 수능 시험 등급컷 정보 조회 (변경 없음)

-   **Endpoint:** `GET /api/exam-grade-cuts`
-   **Purpose:** 특정 연도와 월에 해당하는 수능 (또는 모의평가)의 과목별 등급컷 정보를 가져옵니다.
-   **Request Parameters:**
    -   `year` (string): 시험 연도 (예: "2024")
    -   `month` (string): 시험 월 (예: "11" for CSAT, "06" for June mock exam)
-   **Request Body:** 없음
-   **Response Body:** `SuneungExamCutInfoFromAPI` (JSON Object) - 기존 명세와 동일

## 5. 대학 필터링 (업데이트됨)

-   **Endpoint:** `POST /api/universities/filter`
-   **Purpose:** 사용자 성적 및 필터 조건에 따라 대학 정보를 필터링하여 반환합니다.
-   **Request Body:** (JSON Object)

    ```json
    {
      "userGrades": {
        "naesin": { // ApiNaesinGrades: Record<string (e.g., "1-1", "3-1"), UserNaesinSubject[]>
          "1-1": [ // 학년-학기
            {
              // "id": "string", // UI 내부용 ID, 백엔드에서 무시 가능
              "curriculumClassificationCode": "string | null", // (신규) 교과구분종류 코드
              "curriculumClassificationName": "string | null", // (신규) 교과구분종류명
              "curriculumAreaCode": "string | null", // 교과 코드 (기존의 curriculumAreaCode, 예: "CURR_MATH")
              "curriculumAreaName": "string | null", // 교과명 (기존의 curriculumAreaName, 예: "수학")
              "subjectCode": "string | null",      // 과목 코드 (예: "MATH001")
              "subjectName": "string",             // 과목명 (예: "수학Ⅰ")
              "grade": "number | null",            // 등급
              "credits": "number | null",          // 이수단위
              "rawScore": "number | null",         // 원점수 (선택)
              "subjectMean": "number | null",      // 과목 평균 (선택)
              "stdDev": "number | null",           // 표준편차 (선택)
              "studentCount": "number | null",     // 수강자수
              "achievementLevel": "string | null", // 성취도 (예: 'A', 'P')
              "distributionA": "number | null",    // 성취도 A 분포 (%)
              "distributionB": "number | null",    // 성취도 B 분포 (%)
              "distributionC": "number | null"     // 성취도 C 분포 (%)
            }
            // ... more subjects for "1-1"
          ]
          // ... "1-2", "2-1", "2-2", "3-1" (3학년 2학기는 일반적으로 제외)
        },
        "suneung": { // UserSuneungGrades - 기존 명세와 동일
          // ...
        }
      },
      "filterCriteria": { // 기존 명세와 동일
        "departmentKeywords": "string | null",
        "admissionType": "string",
        "scoreDifferenceTolerance": "number"
      }
    }
    ```

-   **Response Body:** `FilteredUniversity[]` (JSON Array) - 기존 명세와 동일

## 6. 대학 상세 정보 (사이드바용) (변경 없음)

-   **Endpoint:** `GET /api/universities/{universityId}/sidebar-details`
-   **Purpose:** 특정 대학 및 학과에 대한 상세 정보를 사이드바에 표시하기 위해 가져옵니다.
-   **Request Parameters:** 기존 명세와 동일
-   **Request Body:** 없음
-   **Response Body:** `UniversitySidebarDetails` (JSON Object) - 기존 명세와 동일