# 대학 입시 정보 시각화 웹사이트 백엔드 개발 계획 (todo.md)

## 1. 프로젝트 개요 및 목표

*   **목표**: 대한민국 대학의 위치를 벡터 기반 지도에 마커로 표시하고, 사용자가 상세하게 입력한 내신 및 수능 성적을 기반으로 각 대학별/전형별로 산출된 환산 점수와 작년도 입시 결과를 비교하여 시각적으로 제공하는 SPA의 백엔드 API 서버 개발.
*   **주요 기술 스택**: Go (프로그래밍 언어), PostgreSQL (데이터베이스)
*   **대상 환경**: Raspberry Pi 4 (성능 및 리소스 제약 고려)
*   **핵심 기능**:
    1.  초기 지도 데이터 제공
    2.  사용자 상세 성적 기반 대학별/전형별 환산 점수 계산 및 필터링된 대학 정보 제공
    3.  학과 검색 자동완성 지원
    4.  성적 입력 UI 지원 데이터 제공 (과목 목록, 시험 등급컷)
    5.  대학/학과 상세 정보 제공 (사이드바용)
*   **프론트엔드와의 통신**: JSON 형식의 REST API

## 2. 프로젝트 파일 구조 (Go Backend)
```
university-admission-api/
├── cmd/
│   └── api/
│       └── main.go             # 애플리케이션 진입점 (HTTP 서버 시작, 의존성 주입)
├── internal/
│   ├── api/
│   │   ├── handlers/           # 각 엔드포인트별 HTTP 요청 처리 함수
│   │   │   ├── university_handler.go # 대학 기본 정보, 필터링된 대학 목록 처리
│   │   │   ├── department_handler.go # 학과 검색 제안 처리
│   │   │   ├── admission_info_handler.go # 과목 목록, 시험 등급컷 정보 처리
│   │   │   └── sidebar_handler.go    # 사이드바 상세 정보 처리
│   │   ├── router.go           # HTTP 라우터 설정 (예: Gin, Echo)
│   │   └── middleware/         # 공통 미들웨어 (로깅, CORS 등)
│   ├── config/
│   │   └── config.go           # 환경 변수, 설정 파일 로드 및 관리
│   ├── core/
│   │   └── calculator/         # 대학별 성적 산출 엔진
│   │       ├── engine.go       # 메인 계산 엔진 인터페이스 및 핵심 구현
│   │       ├── rule_provider.go # DB에서 계산 규칙을 가져오는 인터페이스 및 구현
│   │       ├── subject_mapper.go # 사용자 성적 과목과 DB 규칙 과목 매핑 로직
│   │       ├── suneung_calculator.go # 수능 점수 변환/계산 (표준점수, 백분위 등) - 프론트엔드와 역할 분담 명확히
│   │       └── types.go        # 계산 엔진 관련 타입 정의 (성적 구조, 규칙 구조 등)
│   ├── db/
│   │   ├── postgresql/         # PostgreSQL 특정 구현
│   │   │   ├── connection.go   # DB 연결 풀 설정 및 관리
│   │   │   ├── repository/     # 데이터베이스 CRUD 작업을 위한 Repository Pattern 구현
│   │   │   │   ├── university_repo.go
│   │   │   │   ├── department_repo.go
│   │   │   │   ├── admission_rule_repo.go # 전형 규칙, 산출 규칙 세트, 과목 반영 규칙 등 조회
│   │   │   │   ├── subject_master_repo.go
│   │   │   │   └── exam_grade_cut_repo.go
│   │   │   └── models.go       # DB 테이블과 매핑되는 Go 구조체 (ORM 미사용 시 수동 정의 또는 sqlx 등 활용)
│   ├── domain/                 # 애플리케이션의 핵심 도메인 모델 (엔티티, 값 객체)
│   │   ├── university.go
│   │   ├── department.go
│   │   ├── admission_rule.go   # 전형 규칙, 산출 규칙 세트, 과목 반영 규칙 등
│   │   ├── user_grades.go      # 사용자 상세 성적 데이터 구조 (프론트엔드 요청과 동일)
│   │   └── exam_info.go        # 시험 정보, 등급컷 정보
│   └── util/
│       ├── json_helper.go      # JSON 직렬화/역직렬화 유틸
│       ├── error_helper.go     # 공통 에러 처리 및 응답 형식 유틸
│       └── validator.go        # 입력값 유효성 검사 유틸
├── migrations/                 # 데이터베이스 마이그레이션 파일 (예: Goose)
│   ├── YYYYMMDDHHMMSS_create_initial_schema.sql
│   └── ... (추가 마이그레이션 파일들)
├── scripts/
│   ├── run_dev.sh              # 로컬 개발 서버 실행 스크립트
│   ├── build.sh                # 애플리케이션 빌드 스크립트
│   └── db_seed.go              # (선택적) 초기 데이터 입력용 Go 스크립트 또는 SQL 파일
├── .env.example                # 환경 변수 설정 예시
├── .gitignore
├── go.mod
├── go.sum
└── README.md
```
## 3. 데이터베이스 스키마 개요 (PostgreSQL)

*   **`universities`**: 대학 기본 정보 (ID, 이름, 위치, 로고 URL, 인재상, 비전 등)
*   **`departments`**: 학과/모집 단위 정보 (ID, 대학 ID, 학과명, 키워드, 소개 등)
*   **`admission_rules`**: 전형 규칙 (ID, 학과 ID, 모집년도, 전형유형, 모집인원, 작년 결과(평균/70컷 환산점수, 경쟁률), 산출규칙세트 ID, 사이드바용 추가정보 JSON 등)
*   **`calculation_rule_sets`**: 성적 산출 규칙 세트 (ID, 이름, 설명)
*   **`subject_reflection_rules`**: 과목 반영 규칙 (ID, 규칙세트 ID, 성적출처(내신/수능), 과목카테고리, 반영타입, 반영비율, 필수과목수, 선택방식, 추가파라미터 JSON 등)
*   **`bonus_malus_rules`**: 가산점/감점 규칙 (ID, 규칙세트 ID, 설명, 조건로직 JSON, 변경타입, 변경값, 적용순서 등)
*   **`min_required_suneung_grades`**: 수능 최저학력기준 (ID, 규칙세트 ID, 설명텍스트, 기준 JSON 등)
*   **`subjects_master`**: 과목 마스터 데이터 (코드, 이름, 타입(내신/수능옵션 등), 표시순서 등)
*   **`exam_grade_cut_info`**: 시험별 등급컷 정보 (ID, 시험년도/월/이름, 과목명, 선택옵션명, 등급컷데이터 JSON 등)

    *(각 테이블의 상세 컬럼 및 제약조건은 이전 대화의 "PostgreSQL 데이터베이스 개요" 참조)*

## 4. API 엔드포인트 및 통신 방식 (JSON)

### 4.1. `GET /map/initial-data`
    *   **목적**: 초기 지도에 표시할 대학 기본 정보 제공.
    *   **요청**: 없음
    *   **응답 (200 OK)**:
        ```json
        [
          { "universityId": "SNU001", "universityName": "서울대학교", "location": { "latitude": 37.4590, "longitude": 126.9519 } }
          // ...
        ]
        ```

### 4.2. `GET /api/subjects`
    *   **목적**: 성적 입력 UI 드롭다운용 과목 목록 제공.
    *   **요청 Query Parameters**: `type` (String, 필수: "naesin", "suneung_국어", "suneung_수학", "suneung_탐구")
    *   **응답 (200 OK)**: (예: `type=naesin`)
        ```json
        [
          { "subjectCode": "KOR001", "subjectName": "국어" }
          // ...
        ]
        ```

### 4.3. `GET /api/exam-grade-cuts`
    *   **목적**: 선택된 기준 시험의 등급컷 정보 또는 계산 계수 제공.
    *   **요청 Query Parameters**: `year` (Number, 필수), `month` (Number, 필수)
    *   **응답 (200 OK)**:
        ```json
        {
          "examName": "2024학년도 대학수학능력시험",
          "subjects": {
            "국어": { "언어와 매체": [ { "rawScoreMin": 90, "standardScore": 135, ... } ] /* ... */ }
            // ... (이전 대화의 상세 응답 예시 참조)
          }
        }
        ```

### 4.4. `GET /api/departments/suggest`
    *   **목적**: 학과 검색 자동완성 제안.
    *   **요청 Query Parameters**: `query` (String, 필수)
    *   **응답 (200 OK)**:
        ```json
        [
          { "departmentName": "컴퓨터공학과", "keywords": ["컴퓨터", "AI"] }
          // ...
        ]
        ```

### 4.5. `POST /universities/filter`
    *   **목적**: 사용자 상세 성적 및 필터 조건 기반, 대학별 환산 점수 포함 정보 조회.
    *   **요청 Body (JSON)**:
        ```json
        {
          "userGrades": {
            "naesin": { "1-1": [ { "subjectCode": "KOR001", "grade": 2, "credits": 4, ... } ], ... },
            "suneung": { "examYear": 2024, "subjects": { "국어": { "selectedOption": "언매", "rawScore": 92, ... }, ... } }
          },
          "filterCriteria": {
            "departmentKeywords": "컴퓨터",
            "admissionType": "수능",
            "scoreDifferenceTolerance": 5
          }
        }
        ```
    *   **응답 (200 OK)**:
        ```json
        [
          {
            "universityId": "SNU001", "universityName": "서울대학교", /*...*/ "departmentName": "컴퓨터공학부",
            "admissionTypeResults": {
              "suneung": { "userCalculatedScore": 135.78, "lastYearAvgConvertedScore": 132.50, ... },
              "gyogwa": { /*...*/ },
              "competitionRateData": { "rate": 15.3 }
            }
          }
          // ...
        ]
        ```

### 4.6. `GET /universities/{universityId}/sidebar-details`
    *   **목적**: 사이드바용 특정 대학/학과 상세 정보 조회.
    *   **요청 Path Parameters**: `universityId` (String)
    *   **요청 Query Parameters**: `departmentName` (String, 필수), `admissionTypeFilter` (String, 필수), `userGradesSnapshot` (String, 선택적, URL 인코딩된 JSON)
    *   **응답 (200 OK)**:
        ```json
        {
          "universityName": "서울대학교", "departmentName": "컴퓨터공학부", /*...*/
          "sidebarSections": [
            { "sectionTitle": "대학 소개", "isHighlighted": false, "items": [/*...*/] },
            { "sectionTitle": "작년도 수능 전형 결과", "isHighlighted": true, "items": [/*...*/] }
            // ... (이전 대화의 상세 응답 예시 참조)
          ]
        }
        ```

## 5. 개발 순서 및 단계별 목표

### 단계 0: 프로젝트 초기 설정
    *   [ ] Go 개발 환경 구성 (Go 설치, GOPATH/GOROOT 설정 등)
    *   [ ] PostgreSQL 설치 및 데이터베이스 생성
    *   [ ] 프로젝트 디렉토리 구조 생성
    *   [ ] `go.mod` 초기화 (`go mod init <module_path>`)
    *   [ ] 필요한 Go 패키지(라이브러리) 조사 및 초기 설치 (`go get`)
        *   웹 프레임워크 (예: Gin `github.com/gin-gonic/gin`)
        *   PostgreSQL 드라이버 (예: `github.com/lib/pq` 또는 `github.com/jackc/pgx/v5`)
        *   환경변수 관리 (예: `github.com/joho/godotenv`)
        *   데이터베이스 마이그레이션 도구 (예: Goose `github.com/pressly/goose/v3`)
    *   [O] `.gitignore` 파일 작성
    *   [ ] `README.md` 기본 내용 작성
    *   [ ] `.env.example` 파일 작성 및 `.env` 파일 생성 (DB 접속 정보 등)

### 단계 1: 데이터베이스 스키마 설계 및 마이그레이션
    *   [ ] `migrations/` 디렉토리 생성 및 마이그레이션 도구 설정
    *   [ ] `universities` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `departments` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `subjects_master` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `exam_grade_cut_info` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `calculation_rule_sets` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `subject_reflection_rules` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `bonus_malus_rules` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `min_required_suneung_grades` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] `admission_rules` 테이블 생성 마이그레이션 작성 및 실행
    *   [ ] 각 테이블 간 FK 제약조건 및 필요한 인덱스 설정
    *   [ ] **(데이터 입력)** 초기 Seed 데이터 SQL 또는 Go 스크립트 작성 및 실행 (일부 대학, 과목, 시험 정보 등)
        *   예: `scripts/db_seed.sql` 또는 `scripts/db_seed.go`

### 단계 2: 기본 API 서버 및 DB 연동 구현
    *   [ ] `internal/config/config.go`: 환경 변수에서 설정 값 로드 기능 구현
    *   [ ] `internal/db/postgresql/connection.go`: PostgreSQL 연결 풀 생성 및 관리 기능 구현
    *   [ ] `cmd/api/main.go`: 기본 HTTP 서버 설정 (선택한 웹 프레임워크 사용), DB 연결 초기화, Config 로드
    *   [ ] `internal/api/router.go`: 기본 라우터 설정 및 간단한 헬스 체크 엔드포인트 (`/health`) 구현
    *   [ ] `internal/util/error_helper.go`, `internal/util/json_helper.go`: 공통 유틸리티 함수 초안 작성

### 단계 3: 간단한 조회 API 구현 (흐름 점검용)
    *   **`GET /map/initial-data` API 구현**
        *   [ ] `internal/domain/university.go`: `University` 기본 구조체 정의
        *   [ ] `internal/db/postgresql/repository/university_repo.go`: `GetAllUniversitiesForMap` 함수 구현 (ID, 이름, 위치만 조회)
        *   [ ] `internal/api/handlers/university_handler.go`: `/map/initial-data` 요청 처리 핸들러 구현
        *   [ ] `internal/api/router.go`: 해당 핸들러 라우팅
        *   [ ] Postman 또는 curl 등으로 API 테스트
    *   **`GET /api/subjects` API 구현**
        *   [ ] `internal/domain/subject.go` (가칭): `SubjectMaster` 구조체 정의
        *   [ ] `internal/db/postgresql/repository/subject_master_repo.go`: `GetSubjectsByType` 함수 구현
        *   [ ] `internal/api/handlers/admission_info_handler.go`: `/api/subjects` 요청 처리 핸들러 구현
        *   [ ] `internal/api/router.go`: 해당 핸들러 라우팅
        *   [ ] API 테스트
    *   **`GET /api/exam-grade-cuts` API 구현**
        *   [ ] `internal/domain/exam_info.go`: `ExamGradeCut` 관련 구조체 정의
        *   [ ] `internal/db/postgresql/repository/exam_grade_cut_repo.go`: `GetGradeCutsByExam` 함수 구현
        *   [ ] `internal/api/handlers/admission_info_handler.go`: `/api/exam-grade-cuts` 요청 처리 핸들러 구현
        *   [ ] `internal/api/router.go`: 해당 핸들러 라우팅
        *   [ ] API 테스트
    *   **`GET /api/departments/suggest` API 구현**
        *   [ ] `internal/domain/department.go`: `DepartmentSuggestion` 관련 구조체 정의
        *   [ ] `internal/db/postgresql/repository/department_repo.go`: `SuggestDepartmentsByQuery` 함수 구현
        *   [ ] `internal/api/handlers/department_handler.go`: `/api/departments/suggest` 요청 처리 핸들러 구현
        *   [ ] `internal/api/router.go`: 해당 핸들러 라우팅
        *   [ ] API 테스트

### 단계 4: 사용자 성적 데이터 구조 정의 및 수신
    *   [ ] `internal/domain/user_grades.go`: 프론트엔드에서 전달될 상세 내신/수능 성적 데이터 구조(`UserGrades`, `NaesinDetail`, `SuneungDetail` 등) Go struct로 상세히 정의
    *   [ ] `internal/util/validator.go`: `UserGrades` 데이터에 대한 기본 유효성 검사 로직 구현 (필수 필드, 값 범위 등)
    *   **`POST /universities/filter` API 기본 수신부 구현**
        *   [ ] `internal/api/handlers/university_handler.go`: `/universities/filter` 요청 처리 핸들러 기본 틀 작성. 요청 본문의 `UserGrades` 및 `FilterCriteria` 파싱 및 유효성 검사.
        *   [ ] `internal/api/router.go`: 해당 핸들러 라우팅
        *   [ ] (아직 성적 계산X) 수신된 데이터 로그 출력 및 기본 응답 반환으로 테스트

### 단계 5: 대학별 성적 산출 엔진 (`core/calculator/`) 설계 및 핵심 로직 구현
    *   [ ] `internal/core/calculator/types.go`: 성적 산출에 필요한 내부 데이터 구조 정의 (규칙 객체, 중간 계산 결과 등)
    *   [ ] `internal/db/postgresql/repository/admission_rule_repo.go`: `CalculationRuleSet` 및 관련 규칙(과목반영, 가감점, 수능최저)을 DB에서 조회하는 함수들 구현
    *   [ ] `internal/core/calculator/rule_provider.go`: `admission_rule_repo.go`를 사용하여 특정 `admission_rule_id` 또는 `calculation_rule_set_id`에 대한 모든 산출 규칙을 가져오는 기능 구현
    *   [ ] `internal/core/calculator/subject_mapper.go`: (가장 복잡한 부분 중 하나) 사용자 성적 데이터의 과목과 DB에 정의된 `subject_reflection_rules.subject_category`를 매핑하고, 필요한 성적 값을 추출하는 로직 구현. (학년/학기, 과목명, 선택과목 등을 고려)
    *   [ ] `internal/core/calculator/engine.go`:
        *   [ ] `CalculateScore` (또는 유사한 이름) 메인 함수 정의. `UserGrades`와 `CalculationRuleSet` (규칙들 포함)을 입력받음.
        *   [ ] 수능 최저학력기준 판별 로직 구현 (`min_required_suneung_grades` 규칙 사용)
        *   [ ] 과목별 반영 점수 계산 로직 구현 (`subject_reflection_rules` 사용)
            *   각 `reflection_type` (표준점수합, 등급환산 등)에 대한 계산 함수 구현
            *   `additional_params_json` 활용
        *   [ ] 가산점/감점 적용 로직 구현 (`bonus_malus_rules` 사용)
        *   [ ] 최종 환산 점수 계산
    *   [ ] **(테스트)** 단위 테스트 코드 작성: 다양한 사용자 성적과 규칙 세트에 대해 성적 산출 엔진이 정확히 동작하는지 검증. (매우 중요)

### 단계 6: `/universities/filter` API 완성
    *   [ ] `internal/api/handlers/university_handler.go`의 `/universities/filter` 핸들러에서 다음 로직 구현:
        1.  요청된 `filterCriteria.departmentKeywords`로 `departments` 테이블 검색하여 후보 학과 목록 생성.
        2.  각 후보 학과에 대해 `admission_rules` 테이블에서 `filterCriteria.admissionType` 및 현재 연도에 맞는 전형 규칙 조회.
        3.  조회된 각 전형 규칙의 `calculation_rule_set_id`를 사용하여 `core/calculator/engine.go`의 성적 산출 함수 호출, 사용자 환산 점수 계산.
        4.  계산된 점수와 `admission_rules.last_year_avg_converted_score` 등을 비교.
        5.  `filterCriteria.scoreDifferenceTolerance` (성적 편차 필터) 적용하여 최종 대학/학과 목록 필터링.
        6.  API 응답 형식에 맞춰 데이터 가공 후 반환.
    *   [ ] 로깅 및 오류 처리 강화.
    *   [ ] RPI 4 환경 고려하여 성능 테스트 및 최적화 (DB 쿼리, 계산 로직 등).

### 단계 7: `/universities/{universityId}/sidebar-details` API 구현
    *   [ ] `internal/api/handlers/sidebar_handler.go`: `/sidebar-details` 요청 처리 핸들러 구현.
    *   [ ] 요청 파라미터(`universityId`, `departmentName`, `admissionTypeFilter`, 선택적 `userGradesSnapshot`) 수신.
    *   [ ] `universities`, `departments`, `admission_rules` 테이블 등에서 필요한 정적 정보 조회.
    *   [ ] (선택적, `userGradesSnapshot` 제공 시) 해당 사용자의 성적으로 특정 전형에 대한 환산 점수를 다시 계산하거나, `/universities/filter`에서 이미 계산된 값을 활용하여 개인화된 정보(예: 합격선 비교) 생성.
    *   [ ] API 응답 형식(`sidebarSections` 구조)에 맞춰 데이터 가공 후 반환.
    *   [ ] API 테스트.

### 단계 8: 최종 검토, 최적화, 문서화
    *   [ ] 전체 API 엔드포인트 기능 및 응답 형식 최종 검토 및 테스트.
    *   [ ] 코드 리팩토링 및 가독성 향상.
    *   [ ] 보안 고려 사항 점검 (SQL Injection 방지 - Prepared Statement 사용, 입력값 검증 등).
    *   [ ] RPI 4 환경에서의 부하 테스트 및 병목 지점 최적화.
    *   [ ] API 문서 자동 생성 도구 사용 고려 (예: Swagger/OpenAPI).
    *   [ ] `README.md`에 프로젝트 실행 방법, API 사용법 등 상세 내용 업데이트.

## 6. 추가 고려 사항
    *   **로깅**: 어떤 요청이 들어오고, 어떤 계산이 수행되며, 어떤 오류가 발생하는지 추적하기 위한 적절한 로깅 시스템 구축.
    *   **CORS**: 프론트엔드와 다른 도메인에서 실행될 경우 CORS 설정 필요.
    *   **배포**: RPI 4에 Go 애플리케이션 및 PostgreSQL 배포 방법 고려 (Docker 권장).
    *   **모니터링**: 시스템 리소스(CPU, 메모리) 사용량 모니터링 방안.
