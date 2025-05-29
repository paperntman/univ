package main

import (
	"log"
	"net/http"
)

func main() {
	// 1. 정적 파일을 제공할 디렉토리 설정
	// http.Dir("./static")은 현재 실행 파일 위치를 기준으로 "static" 폴더를 나타냅니다.
	// http.FileServer는 이 디렉토리의 파일들을 HTTP를 통해 제공하는 핸들러를 생성합니다.
	fileServer := http.FileServer(http.Dir("./static"))

	// 2. 특정 URL 경로와 파일 서버 핸들러 연결
	// "/static/" URL 경로로 오는 요청은 fileServer가 처리하도록 합니다.
	// http.StripPrefix는 URL에서 "/static/" 부분을 제거하고 파일 시스템 경로를 찾도록 합니다.
	// 예: 클라이언트가 "/static/css/style.css"를 요청하면,
	//     StripPrefix를 통해 "css/style.css"가 되고,
	//     FileServer는 "./static/css/style.css" 파일을 찾아서 제공합니다.
	http.Handle("/static/", http.StripPrefix("/static/", fileServer))

	// 3. 루트 경로 ("/") 핸들러: index.html 파일을 직접 제공
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// 루트 경로가 아니면 404 Not Found 에러를 반환합니다.
		// (이렇게 하면 /static/ 외의 다른 알 수 없는 경로는 404 처리됩니다)
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		// "./static/index.html" 파일을 클라이언트에게 제공합니다.
		http.ServeFile(w, r, "./static/index.html")
	})

	// 서버 시작
	log.Println("서버가 8080 포트에서 시작됩니다.")
	log.Println("메인 페이지: http://localhost:8080")
	log.Println("정적 파일 예시 (CSS): http://localhost:8080/static/css/style.css")
	log.Println("정적 파일 예시 (JS): http://localhost:8080/static/js/script.js")
	log.Println("정적 파일 예시 (Image): http://localhost:8080/static/images/gopher.png")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
