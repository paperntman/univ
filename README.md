# 대학 입시 정보 서비스 API 명세

## 1. 초기 지도 데이터 로딩

### `GET /map/initial-data`

초기 지도에 표시될 대학 마커들의 기본 정보를 가져옵니다.

-   **Method:** `GET`
-   **Request Parameters:** 없음
-   **Request Body:** 없음
-   **Response Body:** `InitialUniversityData[]` (JSON Array)

    ```json
    [
      {
        "universityId": "string", // 대학 고유 ID
        "universityName": "string", // 대학명
        "location": {
          "latitude": "number",   // 위도
          "longitude": "number"   // 경도
        }
      }
      // ... more universities
    ]
    ```

    -   `InitialUniversityData`는 `UniversityBase` 타입과 동일합니다.

## 2. 학과 검색 자동 완성

### `GET /api/departments/suggest`

사용자가 입력하는 학과명에 따라 추천 학과 목록을 제공합니다.

-   **Method:** `GET`
-   **Request Parameters:**
    -   `query` (string, URL-encoded): 사용자가 입력한 검색어
-   **Request Body:** 없음
-   **Response Body:** `DepartmentSuggestion[]` (JSON Array)

    ```json
    [
      {
        "departmentName": "string", // 추천 학과명
        "keywords": ["string"]      // 관련 키워드 목록
      }
      // ... more suggestions
    ]
    ```

## 3. 과목 목록 조회

### `GET /api/subjects`

내신 과목 또는 수능 선택 과목 등의 목록을 조회합니다.

-   **Method:** `GET`
-   **Request Parameters:**
    -   `type` (string): 조회할 과목의 종류. 다음 값 중 하나:
        -   `"naesin"`: 내신 과목 목록
        -   `"suneung_국어"`: 수능 국어 선택 과목 목록
        -   `"suneung_수학"`: 수능 수학 선택 과목 목록
        -   `"suneung_탐구"`: 수능 탐구 과목 목록
-   **Request Body:** 없음
-   **Response Body:** `ApiSubjectInfo[]` (JSON Array)

    ```json
    [
      {
        "subjectCode": "string", // 과목 코드
        "subjectName": "string"  // 과목명
      }
      // ... more subjects
    ]
    ```

## 4. 수능 시험 등급컷 정보 조회

### `GET /api/exam-grade-cuts`

특정 수능 시험(또는 모의고사)의 과목별 등급컷 정보를 조회합니다.

-   **Method:** `GET`
-   **Request Parameters:**
    -   `year` (string, e.g., "2024"): 시험 연도
    -   `month` (string, e.g., "11", "09", "06"): 시험 월
-   **Request Body:** 없음
-   **Response Body:** `SuneungExamCutInfoFromAPI` (JSON Object)

    ```json
    {
      "examName": "string", // 시험명 (예: "2024년 11월 수능")
      "subjects": { // 과목별 등급컷 데이터
        "국어": {
          "언어와 매체": [ // 선택 과목명
            { "rawScoreMin": 90, "rawScoreMax": 100, "standardScore": 135, "percentile": 98, "grade": 1 },
            // ... more cut lines for this option
          ],
          "화법과 작문": [ /* ... */ ]
        },
        "수학": {
          "미적분": [ /* ... */ ],
          "기하": [ /* ... */ ],
          "확률과 통계": [ /* ... */ ]
        },
        "영어": [ // 선택 과목 없는 경우 (절대 평가)
          { "rawScoreMin": 90, "grade": 1 },
          { "rawScoreMin": 80, "rawScoreMax": 89, "grade": 2 }
          // ... more cut lines
        ],
        "한국사": [ /* ... */ ],
        "생활과 윤리": [ // 탐구 과목 (과목명이 키)
           { "rawScoreMin": 45, "standardScore": 70, "percentile": 96, "grade": 1 },
           // ... more cut lines
        ]
        // ... other explorer subjects
      }
    }
    ```
    -   `ExamGradeCutMappingItem`: `{ rawScoreMin?: number, rawScoreMax?: number, standardScore?: number, percentile?: number, grade: number }`
        -   `rawScoreMin`은 해당 등급/점수를 받기 위한 최소 원점수 (이상).
        -   `rawScoreMax`는 해당 등급/점수를 받기 위한 최대 원점수 (이하). 둘 다 생략될 수 있거나 하나만 존재할 수 있음.
        -   `standardScore`, `percentile`은 선택적으로 제공될 수 있습니다.

## 5. 대학 필터링

### `POST /api/universities/filter`

사용자의 성적 정보와 필터 조건을 바탕으로 지원 가능한 대학 및 학과 목록을 필터링하여 반환합니다.

-   **Method:** `POST`
-   **Headers:**
    -   `Content-Type: application/json`
-   **Request Body:** (JSON Object)

    ```json
    {
      "userGrades": {
        "naesin": { // ApiNaesinGrades: 키는 "학년-학기" (예: "1-1", "3-1")
          "1-1": [
            {
              // "id"는 클라이언트 UI용이므로 API는 무시 가능
              "subjectCode": "string", // 과목 코드 (없으면 "N/A" 또는 유사값 가능)
              "subjectName": "string", // 과목명
              "grade": "number | null",       // 등급
              "credits": "number | null",     // 이수단위
              "rawScore": "number | null",    // 원점수 (선택)
              "subjectMean": "number | null", // 과목 평균 (선택)
              "stdDev": "number | null"       // 표준편차 (선택)
            }
            // ... more subjects for this semester
          ],
          // ... other semesters (3학년 2학기는 포함되지 않음)
        },
        "suneung": { // UserSuneungGrades
          "examYear": "number | null",    // 응시 연도
          "examMonth": "number | null",   // 응시 월
          "examIdentifierForCutInfo": "string", // 등급컷 정보 요청 시 사용된 시험 식별자 (예: "202411_csat")
          "subjects": {
            "korean": { /* UserSuneungSubjectDetailScore */ },
            "math": { /* UserSuneungSubjectDetailScore */ },
            "english": { /* UserSuneungSubjectDetailScore */ },
            "history": { /* UserSuneungSubjectDetailScore */ },
            "explorer1": { /* UserSuneungSubjectExplorerScore */ },
            "explorer2": { /* UserSuneungSubjectExplorerScore */ }
          }
        }
      },
      "filterCriteria": {
        "departmentKeywords": "string", // 검색한 학과명 또는 키워드
        "admissionType": "string",      // 필터링할 입시 전형 ('경쟁률', '수능', '종합', '교과')
        "scoreDifferenceTolerance": "number | null" // 점수차 허용치 (대학별 환산점수 기준, 선택)
      }
    }
    ```
    -   `UserSuneungSubjectDetailScore`: `{ selectedOption?: string | null, rawScore: number | null, standardScore?: number | null, percentile?: number | null, grade?: number | null }`
        -   `standardScore`, `percentile`, `grade`는 클라이언트에서 계산 후 전송될 수 있거나, 백엔드가 `rawScore`와 `examIdentifierForCutInfo`를 참조하여 내부적으로 사용할 수 있습니다. 현재 클라이언트는 이 값들을 채워서 보냅니다.
    -   `UserSuneungSubjectExplorerScore`는 `UserSuneungSubjectDetailScore`를 확장하며 `subjectCode`와 `subjectName`을 추가로 가집니다.

-   **Response Body:** `FilteredUniversity[]` (JSON Array)

    ```json
    [
      {
        "universityId": "string",
        "universityName": "string",
        "location": { "latitude": "number", "longitude": "number" },
        "departmentName": "string", // 필터링된 (또는 요청된) 학과명
        "admissionTypeResults": { // 전형 유형별 결과
          "suneung": { /* AdmissionTypeSpecificResults (optional) */ },
          "gyogwa": { /* AdmissionTypeSpecificResults (optional) */ },
          "jonghap": { /* AdmissionTypeSpecificResults (optional) */ }
        },
        "overallCompetitionRate": "number | null" // 해당 학과의 작년도 전체 경쟁률 (선택)
      }
      // ... more filtered universities
    ]
    ```
    -   `AdmissionTypeSpecificResults`:
        ```json
        {
          "userCalculatedScore": "number | null",     // 사용자 예상 환산 점수
          "lastYearAvgConvertedScore": "number | null", // 작년 평균 합격자 환산 점수
          "lastYear70CutConvertedScore": "number | null", // 작년 70%컷 합격자 환산 점수
          "suneungMinSatisfied": "boolean | null",    // 수능 최저학력기준 충족 여부
          "qualitativeEvaluation": "string | null"  // 정성평가 결과 (주로 종합 전형)
        }
        ```

## 6. 대학 상세 정보 (사이드바용)

### `GET /api/universities/{universityId}/sidebar-details`

특정 대학 및 학과에 대한 상세 정보를 사이드바에 표시하기 위해 조회합니다.

-   **Method:** `GET`
-   **Path Parameters:**
    -   `universityId` (string): 조회할 대학의 고유 ID
-   **Request Parameters (Query):**
    -   `departmentName` (string, URL-encoded): 조회할 학과명
    -   `admissionTypeFilter` (string, URL-encoded): 현재 적용된 입시 전형 필터 ('경쟁률', '수능', '종합', '교과')
    -   (선택적 확장 고려: `userGradesSnapshot` - 사용자의 성적 요약 정보를 보내 개인화된 결과를 받을 수 있도록 설계 가능)
-   **Request Body:** 없음
-   **Response Body:** `UniversitySidebarDetails` (JSON Object)

    ```json
    {
      "universityName": "string",
      "departmentName": "string",
      "logoUrl": "string | null", // 대학 로고 이미지 URL (선택)
      "sidebarSections": [
        {
          "sectionTitle": "string",     // 섹션 제목 (예: "수능 위주 전형")
          "isHighlighted": "boolean",   // 현재 필터 조건과 매칭되어 강조할지 여부
          "items": [
            {
              "label": "string",        // 정보 항목 레이블 (예: "나의 예상 점수")
              "value": "string | number", // 정보 항목 값
              "link": "string | null",    // 외부 링크 URL (선택)
              "type": "string | null"     // 항목 타입 (예: "link")
            }
            // ... more items in this section
          ],
          "notes": ["string"]       // 추가 참고사항 목록 (선택)
        }
        // ... more sections
      ]
    }
    ```

---
