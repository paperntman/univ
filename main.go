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
	handlers.InitDB()
	defer handlers.CloseDB()

	departmentInfoPath := "data/departments.csv"
	admissionResultPath := "data/adiga_2025_admission_results_final.csv"
	handlers.LoadAdmissionData(departmentInfoPath, admissionResultPath)

	// --- 2. Gin 엔진 및 라우터 설정 ---
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		// (CORS 설정은 그대로 둡니다)
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*") 
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		api.POST("/universities/filter", handlers.FilterUniversities)
		api.GET("/subjects", gin.WrapF(handlers.Subject))
		api.GET("/map/initial-data", gin.WrapF(handlers.GetUniversitiesHandler))
	}

	r.NoRoute(func(c *gin.Context) {
		c.Status(http.StatusNotFound)
	})

	// --- 3. 서버 실행 (Nginx 뒤에서 실행) ---
	// Nginx가 SSL 처리와 리디렉션을 모두 담당하므로,
	// Go 애플리케이션은 내부 포트(예: 8080)에서 간단한 HTTP 서버로만 실행합니다.
	log.Println("Starting server on internal port :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}