// main.go

package main

import (
	"log"
	"net/http"
	"univ/handlers" // 프로젝트 모듈 이름이 'univ'라고 가정

	"github.com/gin-gonic/gin"
)

func main() {
	// --- 1. 초기화 작업 ---

	// DB 초기화 함수 호출
	handlers.InitDB()
	defer handlers.CloseDB()

	// CSV 파일 경로 정의
	departmentInfoPath := "data/departments.csv"
	admissionResultPath := "data/adiga_2025_admission_results_final.csv"

	// 서버 시작 전, 메모리에 CSV 데이터 로드
	handlers.LoadAdmissionData(departmentInfoPath, admissionResultPath)

	// --- 2. Gin 엔진 및 라우터 설정 ---

	// Gin 엔진 생성
	r := gin.Default()

	// CORS 처리를 위한 미들웨어 추가
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*") // 실제 운영 환경에서는 특정 도메인으로 제한하는 것이 좋습니다.
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API 라우트 그룹 설정
	api := r.Group("/api")
	{
		api.POST("/universities/filter", handlers.FilterUniversities)
		api.GET("/subjects", gin.WrapF(handlers.Subject))
		api.GET("/map/initial-data", gin.WrapF(handlers.GetUniversitiesHandler))
	}

	// 등록된 API 경로가 아닌 모든 요청에 대해 404 Not Found를 반환합니다.
	r.NoRoute(func(c *gin.Context) {
		c.Status(http.StatusNotFound)
	})

	// --- 3. 서버 실행 (HTTPS 및 리디렉션) ---

	// 실제 서버 환경에서만 HTTPS를 적용합니다.
	// Certbot이 생성한 인증서 경로 (Ubuntu 기준 표준 경로)
	certFile := "/etc/letsencrypt/live/dotorimuuk.duckdns.org/fullchain.pem"
	keyFile := "/etc/letsencrypt/live/dotorimuuk.duckdns.org/privkey.pem"

	// 80번 포트(HTTP)로 오는 요청을 443번 포트(HTTPS)로 리디렉션하는 서버를 고루틴으로 실행
	go func() {
		// 리디렉션을 위한 새 Gin 엔진
		redirectRouter := gin.New()
		redirectRouter.GET("/*path", func(c *gin.Context) {
			// 요청된 호스트와 경로를 사용하여 HTTPS URL을 구성
			redirectURL := "https://" + "dotorimuuk.duckdns.org" + c.Request.RequestURI
			c.Redirect(http.StatusMovedPermanently, redirectURL)
		})
		log.Println("HTTP to HTTPS redirection server starting on port 80")
		// 80번 포트에서 리디렉션 서버 실행
		if err := redirectRouter.Run(":80"); err != nil {
			// Fatalf를 사용하면 메인 프로세스가 종료되므로 Printf 사용
			log.Printf("Could not start HTTP redirection server: %v", err)
		}
	}()

	// 443번 포트에서 메인 HTTPS 서버 실행
	log.Println("Starting HTTPS server on port 443")
	if err := r.RunTLS(":443", certFile, keyFile); err != nil {
		log.Fatalf("Failed to run HTTPS server: %v", err)
	}
}
