package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"candorhire/backend/internal/ai"
	"candorhire/backend/internal/db"
)

type ExtractKeywordsRequest struct {
	JobID string `json:"jobId"`
}

func ExtractKeywordsHandler(c *gin.Context) {
	var body struct {
		JobID string `json:"jobId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Fetch job details
	var jobs []struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	_, err := db.Client.From("jobs").
		Select("title, description", "", false).
		Eq("id", body.JobID).
		ExecuteTo(&jobs)
	if err != nil || len(jobs) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}
	job := jobs[0]

	// 2. Claude analysis for keywords
	prompt := fmt.Sprintf(`Extract technical and soft skill keywords from the following job posting. Maximum 20 keywords. Provide the response ONLY in JSON format:
{"keywords": ["keyword1", "keyword2"]}

Job Title: %s
Job Description: %s`, job.Title, job.Description)

	rawResult, err := ai.AnalyzeApplicationWithPrompt(context.Background(), prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI analysis failed"})
		return
	}

	var result struct {
		Keywords []string `json:"keywords"`
	}
	if err := json.Unmarshal([]byte(rawResult), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse AI response"})
		return
	}

	// 3. Update job with keywords
	_, _, err = db.Client.From("jobs").
		Update(map[string]interface{}{
			"keywords":              result.Keywords,
			"keywords_generated_at": time.Now().Format(time.RFC3339),
		}, "", "").
		Eq("id", body.JobID).
		Execute()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save keywords"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"keywords": result.Keywords})
}
