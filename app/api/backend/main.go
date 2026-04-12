package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"candorhire/backend/handlers"
	"candorhire/backend/internal/ai"
	"candorhire/backend/internal/db"
	"candorhire/backend/internal/session"
)

func main() {
	// Try loading .env.local from potential paths
	envPaths := []string{".env.local", "../../../.env.local", "app/api/backend/.env.local"}
	for _, path := range envPaths {
		if _, err := os.Stat(path); err == nil {
			godotenv.Load(path)
			log.Printf("Loaded environment from %s", path)
			break
		}
	}

	// Initialize Supabase client
	if err := db.Init(); err != nil {
		log.Fatal("Failed to initialize Supabase client:", err)
	}

	// Initialize R2 client
	db.InitR2()

	// Initialize AI
	ai.Init()

	r := gin.Default()

	// Public routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Protected API routes
	api := r.Group("/api")
	api.Use(session.AuthMiddleware())
	{
		api.POST("/analyze", handlers.AnalyzeHandler)
		api.POST("/jobs/extract-keywords", handlers.ExtractKeywordsHandler)
		api.GET("/videos/signed-url", handlers.GetVideoSignedURLHandler)
		api.GET("/cvs/signed-url", handlers.GetVideoSignedURLHandler)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to run server:", err)
	}
}
