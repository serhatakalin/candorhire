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

type AnalyzeRequest struct {
	ApplicationID string `json:"applicationId"`
	JobID         string `json:"jobId"`
	VideoKey      string `json:"videoKey"`
}

type ScoreBreakdown struct {
	Technical     int `json:"technical"`
	Communication int `json:"communication"`
	Motivation    int `json:"motivation"`
	KeywordMatch  int `json:"keywordMatch"`
}

type AnalysisResult struct {
	Summary        string   `json:"summary"`
	Score          int      `json:"score"`
	ScoreBreakdown ScoreBreakdown `json:"scoreBreakdown"`
	KeywordMatches []string `json:"keywordMatches"`
	QuestionPins   []struct {
		QuestionText string `json:"questionText"`
		TimestampSec int    `json:"timestampSec"`
	} `json:"questionPins"`
}

func AnalyzeHandler(c *gin.Context) {
	var body AnalyzeRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Update status to analyzing
	_, _, err := db.Client.From("applications").
		Update(map[string]interface{}{
			"status":    "analyzing",
			"video_url": body.VideoKey,
		}, "", "").
		Eq("id", body.ApplicationID).
		Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application status: " + err.Error()})
		return
	}

	// 2. Fetch job details
	var jobs []struct {
		Keywords  []string `json:"keywords"`
		Questions []struct {
			Text string `json:"text"`
		} `json:"questions"`
		Title string `json:"title"`
	}
	_, err = db.Client.From("jobs").
		Select("keywords, questions, title", "", false).
		Eq("id", body.JobID).
		ExecuteTo(&jobs)
	if err != nil || len(jobs) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch job details"})
		return
	}
	job := jobs[0]

	// 3. Get R2 signed URL
	videoURL, err := db.GetPresignedDownloadURL(context.Background(), body.VideoKey, 1*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate video URL"})
		return
	}

	// 4. Get transcript (STT)
	transcript, err := ai.GetTranscript(context.Background(), videoURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate transcript: " + err.Error()})
		return
	}

	// 5. Claude Claude analysis
	keywordsStr := fmt.Sprintf("%v", job.Keywords)
	questionsStr := ""
	for _, q := range job.Questions {
		questionsStr += q.Text + " | "
	}

	prompt := fmt.Sprintf(`You are an HR expert. You will evaluate a candidate for the following job posting.

Job: %s
Required Keywords: %s
Job Questions: %s

Candidate Video Transcript:
%s

Your Tasks:
1. Analyze how well the candidate matches the keywords
2. Write a summary in Turkish (max 150 words)
3. Give a score between 0-100
4. Detect at which second the candidate starts answering each question

Provide the response ONLY in this JSON format, add nothing else:
{
  "summary": "...",
  "score": 75,
  "scoreBreakdown": {
    "technical": 80,
    "communication": 70,
    "motivation": 75,
    "keywordMatch": 65
  },
  "keywordMatches": ["keyword1", "keyword2"],
  "questionPins": [
    { "questionText": "question text", "timestampSec": 42 }
  ]
}

Score formula: score = (technical * 0.5) + (communication * 0.3) + (motivation * 0.2). keywordMatch is the % of required keywords the candidate mentioned (0-100).`, job.Title, keywordsStr, questionsStr, transcript)

	rawResult, err := ai.AnalyzeApplicationWithPrompt(context.Background(), prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI analysis failed"})
		return
	}

	var result AnalysisResult
	if err := json.Unmarshal([]byte(rawResult), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse AI response"})
		return
	}

	// 6. Final Update
	_, _, err = db.Client.From("applications").
		Update(map[string]interface{}{
			"transcript":       transcript,
			"ai_summary":       result.Summary,
			"score":            result.Score,
			"score_breakdown":  result.ScoreBreakdown,
			"keyword_matches":  result.KeywordMatches,
			"question_pins":    result.QuestionPins,
			"status":           "scored",
			"scored_at":        time.Now().Format(time.RFC3339),
		}, "", "").
		Eq("id", body.ApplicationID).
		Execute()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save final results"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
