package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"candorhire/backend/internal/db"
)

func GetVideoSignedURLHandler(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Key is required"})
		return
	}

	// In a real app, you would check HR role here via c.Get("user")
	// For now, we generate the signed URL via R2
	url, err := db.GetPresignedDownloadURL(context.Background(), key, 30*time.Minute)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate signed URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
