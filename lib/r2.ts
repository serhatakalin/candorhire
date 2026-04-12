import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const BUCKET_NAME = process.env.R2_BUCKET_NAME!
const KEY_PREFIX = 'candorhire'

export function r2Key(key: string) {
  return `${KEY_PREFIX}/${key}`
}

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: r2Key(key),
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 1800) {
  // Avoid double-prefixing if the key was already built with r2Key.
  const fullKey = key.startsWith('candorhire/') ? key : r2Key(key)
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullKey,
    ResponseContentDisposition: 'inline',
  })
  return getSignedUrl(r2, command, { expiresIn })
}
