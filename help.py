import sqlite3
import csv # CSV 파싱을 위해 추가

# --- 1. 기존 DB 정보 (수정 필요) ---
db_name = 'universities.db' # 기존 SQLite3 DB 파일명
old_table_name = 'university_departments'  # 기존 데이터가 저장된 테이블명
old_column_name = '_연도_시도코드_시도명_시군구코드_시군구명_학교명_학교구분명_수업연한_학위과정명_주야과정명_학과상태명_학과명_학과코드명_7대계열__표준분류계열코드_대학자체계열명_단과대학명_학교학과특성명_주요교과목명_입학정원수_졸업자수_관련직업명_수정일자_데이터기준일자' # 콤마로 구분된 문자열이 저장된 컬럼명

# --- 2. 데이터 분류 (제공해주신 정보) ---
# 이 리스트의 순서와 이름이 데이터 파싱에 사용됩니다.
# 데이터 타입은 SQLite에 맞게 조정했습니다.
column_definitions = [
    ("연도", "INTEGER"),
    ("시도코드", "TEXT"),
    ("시도명", "TEXT"),
    ("시군구코드", "TEXT"),
    ("시군구명", "TEXT"),
    ("학교명", "TEXT"),
    ("학교구분명", "TEXT"),
    ("수업연한", "INTEGER"),
    ("학위과정명", "TEXT"),
    ("주야과정명", "TEXT"),
    ("학과상태명", "TEXT"),
    ("학과명", "TEXT"),
    ("학과코드명", "TEXT"), # 학과코드
    ("7대계열", "TEXT"),
    ("표준분류계열코드", "TEXT"),
    ("대학자체계열명", "TEXT"),
    ("단과대학명", "TEXT"),
    ("학교학과특성명", "TEXT"),
    ("주요교과목명", "TEXT"),
    ("입학정원수", "INTEGER"),
    ("졸업자수", "INTEGER"),
    ("관련직업명", "TEXT"),
    ("수정일자", "TEXT"), # 'YYYY-MM-DD' 형식으로 가정
    ("데이터기준일자", "TEXT") # 'YYYY-MM-DD' 형식으로 가정
]

# 컬럼 이름을 리스트로 추출
column_names = [col[0] for col in column_definitions]

# --- 3. 데이터 파싱 및 기존 DB에 새 테이블 생성/저장 함수 ---
def refactor_existing_db():
    conn = None
    try:
        # 기존 DB 연결
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()

        # 3-1. Univ 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Univ (
                univ_name TEXT PRIMARY KEY,
                address TEXT
            )
        ''')

        # 3-2. Depart 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Depart (
                dept_code TEXT PRIMARY KEY,
                univ_name TEXT NOT NULL,
                dept_name TEXT,
                seven_major_categories TEXT, -- 7대계열
                standard_classification_code TEXT, -- 표준분류계열코드
                univ_specific_category TEXT, -- 대학자체계열명
                college_name TEXT, -- 단과대학명
                dept_characteristic TEXT, -- 학교학과특성명
                main_subjects TEXT, -- 주요교과목명
                admission_capacity INTEGER, -- 입학정원수
                graduates_count INTEGER, -- 졸업자수
                related_jobs TEXT, -- 관련직업명
                FOREIGN KEY (univ_name) REFERENCES Univ(univ_name)
            )
        ''')

        # 3-3. AdmissionResult 테이블 생성 (경쟁률, 입결 정보가 없으므로 일단 예시만)
        # 만약 원본 데이터에 경쟁률 등의 정보가 있다면, 이 테이블에 삽입 로직을 추가해야 합니다.
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS AdmissionResult (
                result_id INTEGER PRIMARY KEY AUTOINCREMENT,
                dept_code TEXT NOT NULL,
                admission_year INTEGER NOT NULL,
                admission_type TEXT, -- 예: '정시', '수시종합', '수시교과'
                competition_rate REAL,
                cutoff_70_percent REAL,
                cutoff_50_percent REAL,
                average_score REAL,
                FOREIGN KEY (dept_code) REFERENCES Depart(dept_code)
            )
        ''')

        # 기존 테이블에서 데이터 가져오기
        cursor.execute(f"SELECT {old_column_name} FROM {old_table_name}")
        rows = cursor.fetchall()

        for row_data in rows:
            single_data_string = row_data[0]
            
            # csv 모듈을 사용하여 콤마 및 따옴표 처리 (더 견고한 파싱)
            # 만약 데이터가 큰따옴표로 묶여있지 않다면, 이 부분은 단순 split(',')으로 변경해야 합니다.
            # 하지만 콤마 포함 필드가 있다면 csv 모듈 사용이 권장됩니다.
            # 예시 데이터 '2024,51,강원특별자치도,...'는 큰따옴표가 없으므로 단순 split 사용
            # 하지만 주요교과목명, 관련직업명에 콤마가 포함될 수 있으므로,
            # 실제 데이터 형식을 확인하고 가장 적합한 파싱 방법을 선택해야 합니다.
            # 여기서는 24개의 명확한 필드를 가정하고, 주요교과목명 등에 포함된 콤마를 어떻게 처리할지는
            # 실제 데이터 포맷에 따라 달라질 수 있음을 미리 말씀드립니다.
            
            # 임시 해결책: 정확히 24개 필드를 분리하려고 시도합니다.
            parts = single_data_string.split(',')

            if len(parts) == len(column_names):
                data = dict(zip(column_names, parts))

                # Univ 테이블에 삽입
                univ_name = data.get("학교명")
                sido_name = data.get("시도명")
                sigungu_name = data.get("시군구명")
                univ_address = f"{sido_name} {sigungu_name}" if sido_name and sigungu_name else None

                if univ_name:
                    cursor.execute("INSERT OR IGNORE INTO Univ (univ_name, address) VALUES (?, ?)",
                                   (univ_name, univ_address))

                # Depart 테이블에 삽입
                dept_code = data.get("학과코드명")
                if dept_code:
                    try:
                        cursor.execute('''
                            INSERT OR IGNORE INTO Depart (
                                dept_code, univ_name, dept_name, seven_major_categories,
                                standard_classification_code, univ_specific_category, college_name,
                                dept_characteristic, main_subjects, admission_capacity,
                                graduates_count, related_jobs
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            dept_code,
                            univ_name,
                            data.get("학과명"),
                            data.get("7대계열"),
                            data.get("표준분류계열코드"),
                            data.get("대학자체계열명"),
                            data.get("단과대학명"),
                            data.get("학교학과특성명"),
                            data.get("주요교과목명"),
                            int(data.get("입학정원수", 0)) if data.get("입학정원수") else None, # 숫자로 변환, 없으면 None
                            int(data.get("졸업자수", 0)) if data.get("졸업자수") else None,     # 숫자로 변환, 없으면 None
                            data.get("관련직업명")
                        ))
                    except sqlite3.IntegrityError as e:
                        print(f"Error inserting into Depart (likely duplicate): {e} for dept_code {dept_code}")
                    except ValueError as e:
                        print(f"Data type error for {dept_code}: {e} (Raw data: {data.get('입학정원수')}, {data.get('졸업자수')})")
                
                # AdmissionResult 데이터 삽입 (예시 데이터에 경쟁률 없음)
                # 만약 competition_rate 등이 원본 문자열에 있다면 여기에 추가 로직 작성
                # 예시:
                # admission_year = int(data.get("연도"))
                # if admission_year and dept_code:
                #     cursor.execute('''
                #         INSERT INTO AdmissionResult (dept_code, admission_year, admission_type, competition_rate)
                #         VALUES (?, ?, ?, ?)
                #     ''', (dept_code, admission_year, '정시', None)) # 경쟁률 데이터 없으면 None

            else:
                print(f"Skipping malformed row: {single_data_string}")
                print(f"Expected {len(column_names)} parts, got {len(parts)}. (Raw data: {row_data[0]})")

        # 변경사항 커밋
        conn.commit()
        print(f"Data successfully processed and new tables created/populated in {db_name}")

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    finally:
        if conn:
            conn.close()

# 함수 실행
refactor_existing_db()