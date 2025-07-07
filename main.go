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

	// --- 3. 정적 파일 및 SPA 라우팅 설정 (제거됨) ---
	// 프론트엔드는 Github Pages 등을 통해 별도로 호스팅됩니다.
	// 더 이상 백엔드에서 정적 파일을 직접 제공하지 않습니다.

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

	// 등록된 API 경로가 아닌 모든 요청에 대해 404 Not Found를 반환합니다.
	r.NoRoute(func(c *gin.Context) {
		c.Status(http.StatusNotFound)
	})

	// --- 4. 서버 실행 ---

	port := "80"
	log.Printf("서버가 %s 포트에서 시작됩니다.", port)
	log.Printf("메인 페이지: http://localhost:%s/", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
