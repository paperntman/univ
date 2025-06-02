package main

import (
	"log"
	"net/http"

	// "your_project_name/handlers" 형식으로 import
	// your_project_name은 go.mod 파일의 module 이름과 일치해야 합니다.
	// 예: module myawesomeproject -> "myawesomeproject/handlers"
	"univ/handlers" // <<--- 이 부분을 실제 모듈 이름으로 변경하세요!
)

func main() {
	// 1. 핸들러 패키지의 DB 초기화 함수 호출
	handlers.InitDB()
	// 프로그램 종료 시 DB 연결 닫기
	defer handlers.CloseDB()

	// 2. 대학 정보 API 라우트 설정
	// "/map/initial-data" 경로로 오는 요청을 handlers.GetUniversitiesHandler 함수가 처리합니다.
	// 이 핸들러는 정적 파일 핸들러보다 먼저 등록되어야 합니다.
	http.HandleFunc("/map/initial-data", handlers.GetUniversitiesHandler)
	http.HandleFunc("/api/subjects", handlers.Subject)

	// 3. 정적 파일 서버 설정
	// "./app/dist" 디렉토리의 모든 파일을 제공합니다.
	// 이 설정은 "/" 경로로 들어오는 모든 요청을 처리하며,
	// 예를 들어 "/assets/index-Dr4Soqas.js"와 같은 하위 경로의 CSS/JS 파일도
	// "./app/dist/assets/index-Dr4Soqas.js"에서 자동으로 찾아 제공하게 됩니다.
	// 이렇게 하면 CSV, JS, CSS 파일들이 올바르게 로드됩니다.
	http.Handle("/", http.FileServer(http.Dir("./beta_3/dist")))

	// 서버 시작
	port := "8080" // 포트 번호를 변수로 관리하면 더 좋습니다.
	log.Printf("서버가 %s 포트에서 시작됩니다.", port)
	log.Printf("메인 페이지: http://localhost:%s/", port)
	log.Printf("대학 정보 API: http://localhost:%s/api/universities", port)

	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal("ListenAndServe 에러: ", err)
	}
}
