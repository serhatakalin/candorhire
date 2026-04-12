package ai

import (
	"context"
	"fmt"
	"os"

	"github.com/go-resty/resty/v2"
)

type FalAIResult struct {
	Text string `json:"text"`
}

func GetTranscript(ctx context.Context, audioURL string) (string, error) {
	apiKey := os.Getenv("FAL_KEY")
	client := resty.New()

	var result FalAIResult
	// In a real scenario, you might need to poll for the result if it's async
	// For now, we assume fal.ai returns the text directly in the response
	resp, err := client.R().
		SetHeader("Authorization", "Key "+apiKey).
		SetHeader("Content-Type", "application/json").
		SetResult(&result).
		SetBody(map[string]interface{}{
			"audio_url": audioURL,
		}).
		Post("https://fal.run/fal-ai/whisper")

	if err != nil {
		return "", err
	}

	if resp.IsError() {
		return "", fmt.Errorf("fal.ai error: %s", resp.String())
	}

	return result.Text, nil
}
