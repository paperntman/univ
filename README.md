# 대학 입시 정보 시각화 서비스 API 문서

이 문서는 대학 입시 정보 시각화 프론트엔드 애플리케이션이 호출하는 백엔드 API의 명세를 기술합니다.

## 1. 초기 지도 데이터 로드

지도에 표시될 대학들의 기본 정보를 가져옵니다.

-   **Endpoint:** `GET /map/initial-data`
-   **Description:** 애플리케이션 로드 시 호출되어 지도에 표시할 대학들의 이름과 위치 정보를 가져옵니다.
-   **Request Body:** 없음
-   **Response Body:** `InitialUniversityData[]`
    ```json
    [
      {
        "universityId": "UNI001",
        "universityName": "서울대학교",
        "location": {
          "latitude": 37.4590,
          "longitude": 126.9500
        }
      },
      {
        "universityId": "UNI002",
        "universityName": "고려대학교",
        "location": {
          "latitude": 37.5895,
          "longitude": 127.0323
        }
      }
      // ... more universities
    ]
    ```
    -   `universityId` (string): 대학 고유 ID
    -   `universityName` (string): 대학명
    -   `location` (object): 위도, 경도 정보
        -   `latitude` (number): 위도
        -   `longitude` (number): 경도

## 2. 과목 및 분류 목록 조회

내신 및 수능 과목 관련 다양한 목록을 조회합니다. (예: 교과구분종류, 특정 교과에 속하는 과목 등)

-   **Endpoint:** `GET /api/subjects`
-   **Description:** `type` 쿼리 파라미터를 통해 다양한 종류의 과목 목록이나 분류 체계를 가져옵니다. 추가적인 필터링을 위해 다른 쿼리 파라미터가 사용될 수 있습니다.
-   **Query Parameters:**
    -   `type` (string, required): 조회할 목록의 종류를 지정합니다. 프론트엔드에서 사용되는 값들은 다음과 같습니다:
        -   `naesin_curriculum_classifications`: 내신 교과구분종류 목록
        -   `naesin_curriculums_for_classification`: 특정 교과구분종류에 속하는 교과(교육과정 영역) 목록 (추가 파라미터 `classificationCode` 필요)
        -   `naesin_subjects_for_curriculum`: 특정 교과(교육과정 영역)에 속하는 과목 목록 (추가 파라미터 `curriculumCode` 필요)
        -   `naesin_subjects_all`: 모든 내신 과목의 원시 목록
        -   `suneung_국어`: 수능 국어 선택과목 목록
        -   `suneung_수학`: 수능 수학 선택과목 목록
        -   `suneung_탐구`: 수능 탐구 과목 목록
    -   `classificationCode` (string, optional): `type`이 `naesin_curriculums_for_classification`일 때 사용되는 교과구분종류 코드.
    -   `curriculumCode` (string, optional): `type`이 `naesin_subjects_for_curriculum`일 때 사용되는 교과(교육과정 영역) 코드.
-   **Request Body:** 없음
-   **Response Body:** `ApiSubjectInfo[]`
    ```json
    [
      {
        "subjectCode": "CLASS_A",
        "subjectName": "인문계열 일반선택",
        "parentCode": null // 최상위 분류의 경우 null 또는 없음
      },
      {
        "subjectCode": "CURRI_A01",
        "subjectName": "국어",
        "parentCode": "CLASS_A" // 이 교과가 속한 교과구분종류 코드
      },
      {
        "subjectCode": "SUBJ_KOR001",
        "subjectName": "문학",
        "parentCode": "CURRI_A01" // 이 과목이 속한 교과 코드
      }
      // ... more subject info items
    ]
    ```
    -   `subjectCode` (string): 항목의 고유 코드 (예: 교과구분종류 코드, 교과 코드, 과목 코드)
    -   `subjectName` (string): 항목의 이름 (예: 교과구분종류명, 교과명, 과목명)
    -   `parentCode` (string, optional): 상위 항목의 코드 (계층 구조 표현 시 사용)

## 3. 대학 정보 필터링

사용자 성적 및 필터 조건에 따라 대학 목록을 필터링하여 반환합니다.

-   **Endpoint:** `POST /api/universities/filter`
-   **Description:** 사용자가 입력한 내신/수능 성적과 선택한 학과, 입시 전형, 점수차 허용치 등의 필터 조건을 기반으로 적합한 대학 및 학과 정보를 반환합니다.
-   **Request Body:**
    ```json
    {
      "userGrades": {
        "naesin": { // ApiNaesinGrades: 키는 "학년-학기" (예: "1-1", "3-1")
          "1-1": [
            {
              "curriculumClassificationCode": "CLASS_A",
              "curriculumClassificationName": "일반교과",
              "curriculumAreaCode": "AREA_01",
              "curriculumAreaName": "국어",
              "subjectCode": "KOR001",
              "subjectName": "문학",
              "grade": 2,
              "credits": 3,
              "rawScore": 88,
              "subjectMean": 75.5,
              "stdDev": 10.2,
              "studentCount": 250,
              "achievementLevel": "B",
              "distributionA": 15.0,
              "distributionB": 30.0,
              "distributionC": 35.0
            }
            // ... more subjects for this semester
          ]
          // ... more semesters
        },
        "suneung": { // ApiSuneungGradesPayload
          "examIdentifierForCutInfo": "202411_csat", // 예: "2024년 11월 수능"
          "subjects": {
            "korean": { "selectedOption": "언어와 매체", "rawScore": 92 },
            "math": { "selectedOption": "미적분", "rawScore": 88 },
            "english": { "rawScore": 95 }, // 영어는 등급제이므로 원점수만
            "history": { "rawScore": 45 }, // 한국사도 등급제
            "explorer1": { "subjectName": "생활과 윤리", "rawScore": 47 },
            "explorer2": { "subjectName": "사회·문화", "rawScore": 48 }
          }
        }
      },
      "filterCriteria": {
        "departmentKeywords": "A01002", // 학과 코드 (예: 대분류+중분류+소분류 코드 조합)
        "admissionType": "수능", // '경쟁률', '수능', '종합', '교과' 중 하나
        "scoreDifferenceTolerance": 10 // 점수차 허용치 (대학별 환산점수 기준)
      }
    }
    ```
    -   `userGrades.naesin` (object): 사용자의 내신 성적. 각 키는 "학년-학기" (예: "1-1", "2-2")이며, 값은 해당 학기 `ApiNaesinSubjectPayload` 객체 배열입니다.
        -   `ApiNaesinSubjectPayload` 필드 설명은 `types.ts` 참조 (id 제외한 `UserNaesinSubject`의 모든 필드)
    -   `userGrades.suneung` (object): 사용자의 수능 성적 (`ApiSuneungGradesPayload`).
        -   `examIdentifierForCutInfo` (string): 등급컷 조회에 사용될 시험 식별자 (예: "202411_csat", "202506_mock").
        -   `subjects` (object): 과목별 `ApiSuneungSubjectPayload` 객체.
            -   `rawScore` (number | null): 원점수
            -   `selectedOption` (string | null, optional): 국어, 수학의 선택과목명
            -   `subjectName` (string | null, optional): 탐구 과목명
    -   `filterCriteria` (object): 필터링 조건.
        -   `departmentKeywords` (string | null): 선택된 학과의 코드 (예: 대분류A + 중분류01 + 소분류002 -> "A01002"). "N.C.E" 코드를 포함할 수 있음.
        -   `admissionType` (string): `'경쟁률' | '수능' | '종합' | '교과'` 중 하나.
        -   `scoreDifferenceTolerance` (number, optional): 대학별 환산 점수 기준 점수차 허용 범위.
-   **Response Body:** `FilteredUniversity[]`
    ```json
    [
      {
        "universityId": "UNI001",
        "universityName": "서울대학교",
        "location": { "latitude": 37.4590, "longitude": 126.9500 },
        "departmentName": "컴퓨터공학부", // 실제 학과명
        "admissionTypeResults": {
          "suneung": { // '수능' 전형 결과
            "userCalculatedScore": 750.5,
            "lastYearAvgConvertedScore": 745.0,
            "lastYear70CutConvertedScore": 740.0,
            "suneungMinSatisfied": true // (수능 전형에서는 보통 해당 없으나, 구조 일관성)
          },
          "gyogwa": { // '교과' 전형 결과
            "userCalculatedScore": 98.2,
            "lastYearAvgConvertedScore": 97.5,
            "lastYear70CutConvertedScore": 97.0,
            "suneungMinSatisfied": true
          },
          "jonghap": { // '종합' 전형 결과
            "qualitativeEvaluation": "서류평가 적합, 면접 대상", // 예시
            "suneungMinSatisfied": false // 예시
          }
        },
        "overallCompetitionRate": 12.5 // '경쟁률' 필터 시 사용
      }
      // ... more filtered universities
    ]
    ```
    -   `universityId`, `universityName`, `location`: 대학 기본 정보 (위 `InitialUniversityData` 참조).
    -   `departmentName` (string): 필터링된 학과의 실제 이름.
    -   `admissionTypeResults` (object): 각 주요 전형(`suneung`, `gyogwa`, `jonghap`)별 결과.
        -   `userCalculatedScore` (number, optional): 사용자의 해당 전형 대학별 환산 점수.
        -   `lastYearAvgConvertedScore` (number, optional): 작년 합격자 평균 대학별 환산 점수.
        -   `lastYear70CutConvertedScore` (number, optional): 작년 합격자 70%컷 대학별 환산 점수.
        -   `suneungMinSatisfied` (boolean, optional): 수능 최저학력기준 충족 여부 (주로 수시 전형에서 유의미).
        -   `qualitativeEvaluation` (string, optional): 학생부종합전형의 정성평가 결과 요약.
    -   `overallCompetitionRate` (number, optional): 해당 학과의 전체 경쟁률 (주로 `admissionType: '경쟁률'` 필터 시 사용).

## 4. 대학 상세 정보 (사이드바용)

특정 대학의 특정 학과에 대한 상세 정보를 사이드바에 표시하기 위해 가져옵니다.

-   **Endpoint:** `GET /api/universities/{universityId}/sidebar-details`
-   **Description:** 사용자가 지도에서 특정 대학 마커를 클릭했을 때, 해당 대학 및 학과의 상세 정보를 사이드바에 표시하기 위해 호출됩니다.
-   **Path Parameters:**
    -   `universityId` (string, required): 상세 정보를 조회할 대학의 고유 ID.
-   **Query Parameters:**
    -   `departmentName` (string, required): 상세 정보를 조회할 학과의 이름 (인코딩된 문자열). (API 내부적으로는 이 이름을 departmentCode와 매칭하거나 직접 사용할 수 있습니다.)
    -   `admissionTypeFilter` (string, required): 현재 적용된 입시 전형 필터 (`'경쟁률' | '수능' | '종합' | '교과'`). 사이드바 내용을 이 필터에 맞게 조정하기 위해 전달됩니다.
-   **Request Body:** 없음
-   **Response Body:** `UniversitySidebarDetails | null`
    ```json
    {
      "universityName": "서울대학교",
      "departmentName": "컴퓨터공학부",
      "logoUrl": "https://example.com/logos/snu_logo.png", // (optional)
      "sidebarSections": [
        {
          "sectionTitle": "수능 위주 전형 (2024 기준)",
          "isHighlighted": true, // 현재 필터와 가장 관련된 섹션
          "items": [
            { "label": "모집인원", "value": 50 },
            { "label": "나의 예상 점수", "value": "750.5 / 1000" },
            { "label": "작년 합격자 평균", "value": "745.0 / 1000" },
            { "label": "작년 70%컷", "value": "740.0 / 1000" },
            { "label": "수능 반영 비율", "value": "국33.3 수40 과26.7" }
          ],
          "notes": [
            "수능 점수는 대학별 환산 점수입니다.",
            "영어, 한국사는 등급별 가점/감점 방식입니다."
          ]
        },
        {
          "sectionTitle": "학생부교과 전형",
          "isHighlighted": false,
          "items": [
            // ... 교과 전형 관련 항목들
          ],
          "notes": []
        },
        {
          "sectionTitle": "대학 정보",
          "isHighlighted": false,
          "items": [
            { "label": "대학 입학처", "value": "https://admission.snu.ac.kr", "type": "link" },
            { "label": "학과 홈페이지", "value": "https://cse.snu.ac.kr", "type": "link" }
          ]
        }
      ]
    }
    ```
    -   `universityName` (string): 대학명.
    -   `departmentName` (string): 학과명.
    -   `logoUrl` (string, optional): 대학 로고 이미지 URL.
    -   `sidebarSections` (array): 사이드바에 표시될 정보 섹션들의 배열.
        -   `sectionTitle` (string): 섹션 제목 (예: "수능 위주 전형").
        -   `isHighlighted` (boolean): 현재 `admissionTypeFilter`와 가장 관련이 높아 강조 표시되어야 하는 섹션인지 여부.
        -   `items` (array): 해당 섹션에 표시될 정보 항목(`SidebarItem`)들의 배열.
            -   `label` (string): 정보 항목의 레이블 (예: "모집인원").
            -   `value` (string | number): 정보 항목의 값.
            -   `link` (string, optional): 값이 링크일 경우 해당 URL.
            -   `type` (string, optional): 항목의 타입 (예: `"link"`).
        -   `notes` (array of strings, optional): 섹션 하단에 표시될 추가 참고사항 목록.

---

**참고:**
-   `ApiNaesinSubjectPayload`, `ApiSuneungGradesPayload`, `FilteredUniversity`, `ApiSubjectInfo`, `InitialUniversityData`, `UniversitySidebarDetails` 등의 타입 정의는 프론트엔드 `types.ts` 파일에 명시된 구조를 따릅니다.
-   날짜, 점수 형식 등은 예시이며 실제 구현에 따라 달라질 수 있습니다.
-   오류 응답 형식은 이 문서에서 다루지 않았으나, 일반적인 HTTP 상태 코드(4xx, 5xx)와 함께 오류 메시지를 포함하는 JSON 응답을 고려할 수 있습니다.