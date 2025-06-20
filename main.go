// main.go

package main

import (
	"log"
	"net/http"
	"strings"
	"univ/handlers" // 프로젝트 모듈 이름이 'univ'라고 가정

	"github.com/gin-gonic/gin"
)

func main() {
	// --- 1. 초기화 작업 ---

	// DB 초기화 함수 호출
	// 이 함수는 handlers 패키지 내부에 구현되어 있어야 합니다.
	handlers.InitDB()
	// 프로그램 종료 시 DB 연결이 안전하게 닫히도록 defer 사용
	defer handlers.CloseDB()

	// CSV 파일 경로 정의
	departmentInfoPath := "data/departments.csv"
	admissionResultPath := "data/adiga_2025_admission_results_final.csv"

	// 서버 시작 전, 메모리에 CSV 데이터 로드
	handlers.LoadAdmissionData(departmentInfoPath, admissionResultPath)

	// --- 2. Gin 엔진 및 라우터 설정 ---

	// Gin 엔진 생성
	r := gin.Default()

	// API 라우트 그룹 설정
	api := r.Group("/api")
	{
		// 이 핸들러들은 DB를 사용할 수도, 안 할 수도 있습니다.
		// handlers 패키지 내부 구현에 따라 동작합니다.
		api.POST("/universities/filter", handlers.FilterUniversities)

		// 표준 http.HandlerFunc를 Gin 핸들러로 래핑
		api.GET("/subjects", gin.WrapF(handlers.Subject))
	}

	// /map/initial-data는 DB에서 초기 대학 목록을 가져올 가능성이 높습니다.
	r.GET("/map/initial-data", gin.WrapF(handlers.GetUniversitiesHandler))

	// --- 3. 정적 파일 및 SPA 라우팅 설정 ---

	// Vite/React 빌드 결과물 내의 'assets' 폴더를 정적 파일로 제공
	// 예: /assets/index-xyz.js -> ./latest/dist/assets/index-xyz.js
	r.Static("/assets", "./latest/dist/assets")

	// 루트의 favicon.ico 같은 특정 파일들을 직접 매핑
	r.StaticFile("/favicon.ico", "./latest/dist/favicon.ico")
	// 필요에 따라 다른 정적 파일들을 추가할 수 있습니다.
	// r.StaticFile("/logo.png", "./latest/dist/logo.png")

	// 등록된 API나 정적 파일 경로가 아닌 모든 요청을 처리 (SPA 지원)
	// 이 설정은 다른 모든 라우트 등록 *후에* 와야 합니다.
	r.NoRoute(func(c *gin.Context) {
		// /api/로 시작하는 알 수 없는 경로는 404 Not Found 처리
		if strings.HasPrefix(c.Request.RequestURI, "/api") {
			c.Status(http.StatusNotFound)
			return
		}

		// 그 외 모든 경로는 프런트엔드 앱의 진입점인 index.html을 반환
		c.File("./latest/dist/index.html")
	})

	// --- 4. 서버 실행 ---

	port := "8080"
	log.Printf("서버가 %s 포트에서 시작됩니다.", port)
	log.Printf("메인 페이지: http://localhost:%s/", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
