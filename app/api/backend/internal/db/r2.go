package db

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var R2Client *s3.Client
var PresignClient *s3.PresignClient
var R2Bucket string

func InitR2() {
	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	accessKey := os.Getenv("R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	R2Bucket = os.Getenv("R2_BUCKET_NAME")

	r2Config := aws.Config{
		Region: "auto",
		Credentials: aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	}

	R2Client = s3.NewFromConfig(r2Config, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID))
	})

	PresignClient = s3.NewPresignClient(R2Client)
}

func GetPresignedDownloadURL(ctx context.Context, key string, expiresIn time.Duration) (string, error) {
	request, err := PresignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket:                     aws.String(R2Bucket),
		Key:                        aws.String(key),
		ResponseContentDisposition: aws.String("inline"),
	}, func(o *s3.PresignOptions) {
		o.Expires = expiresIn
	})
	if err != nil {
		return "", err
	}
	return request.URL, nil
}
