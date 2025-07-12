package handlers // 패키지 이름을 'handlers'로 지정

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3" // SQLite 드라이버
)

// 데이터베이스 파일 경로 (필요하다면 설정 파일이나 환경 변수에서 읽어오도록 개선 가능)
const dbFile = "./data/universities.db"

// 전역 데이터베이스 연결 풀 (이 패키지 내에서 사용)
var db *sql.DB

// 응답 JSON의 각 대학 정보를 위한 구조체
type UniversityResponse struct {
	UniversityID   string   `json:"universityId"`
	UniversityName string   `json:"universityName"`
	Location       Location `json:"location"`
	// 필요하다면 여기에 다른 필드 추가 (logoUrl 등)
}

// InitDB 함수는 데이터베이스 연결을 초기화하고 전역 db 변수에 할당합니다.
// main.go에서 호출될 것입니다.
func InitDB() {
	var err error
	db, err = sql.Open("sqlite3", dbFile)
	if err != nil {
		log.Fatalf("DB 연결 에러 (handlers): %v", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatalf("DB Ping 에러 (handlers): %v", err)
	}
	log.Println("SQLite 데이터베이스에 성공적으로 연결되었습니다 (from handlers).")
}

// CloseDB 함수는 데이터베이스 연결을 닫습니다.
// main.go에서 defer로 호출될 수 있습니다.
func CloseDB() {
	if db != nil {
		db.Close()
		log.Println("SQLite 데이터베이스 연결이 닫혔습니다 (from handlers).")
	}
}

// GetUniversitiesHandler 함수는 모든 대학 정보를 조회하여 JSON으로 응답합니다.
// 이 함수는 main.go에서 라우팅에 사용될 것입니다 (대문자로 시작하여 Exported).
func GetUniversitiesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET 요청만 허용됩니다.", http.StatusMethodNotAllowed)
		return
	}

	if db == nil {
		log.Println("DB가 초기화되지 않았습니다.")
		http.Error(w, "서버 내부 오류: 데이터베이스 연결 없음", http.StatusInternalServerError)
		return
	}

	rows, err := db.Query("SELECT id, name, latitude, longitude FROM universities")
	if err != nil {
		log.Printf("DB 쿼리 에러: %v", err)
		http.Error(w, "데이터 조회 중 에러가 발생했습니다.", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	universities := []UniversityResponse{}
	for rows.Next() {
		var uni UniversityResponse
		var lat, lon sql.NullFloat64

		if err := rows.Scan(&uni.UniversityID, &uni.UniversityName, &lat, &lon); err != nil {
			log.Printf("DB 행 스캔 에러: %v", err)
			http.Error(w, "데이터 처리 중 에러가 발생했습니다.", http.StatusInternalServerError)
			return
		}

		if lat.Valid {
			uni.Location.Latitude = lat.Float64
		}
		if lon.Valid {
			uni.Location.Longitude = lon.Float64
		}
		universities = append(universities, uni)
	}

	if err = rows.Err(); err != nil {
		log.Printf("DB 행 반복 중 에러: %v", err)
		http.Error(w, "데이터 조회 중 에러가 발생했습니다.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(universities); err != nil {
		log.Printf("JSON 인코딩 에러: %v", err)
	}
}
