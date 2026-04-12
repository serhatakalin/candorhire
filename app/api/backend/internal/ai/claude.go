package ai

import (
	"context"
	"os"

	"github.com/liushuangls/go-anthropic/v2"
)

var Client *anthropic.Client

func Init() {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	Client = anthropic.NewClient(apiKey)
}

func AnalyzeApplicationWithPrompt(ctx context.Context, prompt string) (string, error) {
	resp, err := Client.CreateMessages(ctx, anthropic.MessagesRequest{
		Model: anthropic.ModelClaude3Dot5Sonnet20241022,
		Messages: []anthropic.Message{
			{
				Role: anthropic.RoleUser,
				Content: []anthropic.MessageContent{
					{
						Type: anthropic.MessagesContentTypeText,
						Text: &prompt,
					},
				},
			},
		},
		MaxTokens: 1024,
	})
	if err != nil {
		return "", err
	}
	return *resp.Content[0].Text, nil
}
