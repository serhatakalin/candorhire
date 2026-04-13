# CandorHire

AI-powered recruitment platform. Automatically transcribes and analyzes candidate videos, measures CV compatibility, and provides data-driven hiring decisions for administrators.

**Production:** https://candorhire.web.app

| Role | Email | Password |
|---|---|---|
| HR | hr@test.com | 123456 |
| Candidate | candidate@test.com | 123456 |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind CSS 4 |
| Backend | Go 1.26 (Gin) · Next.js API Routes |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (cookie-based SSR) |
| Storage | Cloudflare R2 (S3-compat, presigned URL) |
| STT | Fal.ai Whisper (async queue) |
| LLM — Analysis | OpenRouter → Gemini 2.0 Flash |
| LLM — Keywords | Anthropic Claude 3.5 Sonnet |
| UI Design | Google Stitch |

## Services

| Service | Address | Description |
|---|---|---|
| Next.js | `localhost:3000` | Frontend + all API routes |
| Go backend | `localhost:8080` | Keyword extraction only (Claude Sonnet) |

`npm run dev` starts both simultaneously (`concurrently`).

The Go backend handles a single responsibility: `extract-keywords`. All other processing (CV analysis, video STT, storage, auth) runs in Next.js API routes via direct `fetch` calls to external APIs.

## Setup

### Requirements

- Node.js 20+
- Go 1.22+
- Supabase CLI (`brew install supabase/tap/supabase`)

### 1. Install dependencies

```bash
npm install
cd app/api/backend && go mod download && cd ../../..
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# AI / STT
FAL_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=

# Go backend (optional, default: 8080)
PORT=8080

# STT provider (optional, default: fal)
STT_PROVIDER=fal
```

### 3. Apply Supabase migrations

```bash
supabase db push
```

Or for local development:

```bash
supabase start
supabase db reset
```

### 4. Start development environment

```bash
npm run dev
```

## Project Structure

```
├── app/
│   ├── (candidate)/        # Candidate portal (job listings, application flow)
│   ├── admin/              # Admin panel (dashboard, jobs, candidates)
│   └── api/
│       ├── analyze/        # Video analysis pipeline (Whisper + Gemini)
│       ├── cvs/            # CV upload + AI compatibility score
│       ├── videos/         # Video/audio upload + signed URL
│       └── backend/        # Go service (Gin)
│           ├── handlers/
│           └── internal/   # db, ai, session
├── lib/
│   ├── r2.ts               # Cloudflare R2 client
│   ├── supabase.ts         # Supabase browser client
│   ├── supabase-server.ts  # Supabase server client (SSR)
│   ├── data.ts             # Cached server-side data fetchers
│   └── stt/                # STT adapter layer
└── supabase/
    └── migrations/         # PostgreSQL migration files
```

## Analysis Pipeline

```
Candidate applies
  ├─ CV → R2 + Gemini CV Check → cvMatchScore
  ├─ Video + Audio → R2
  └─ Application (status: pending)
         │
         ▼
  /api/analyze
         ├─ status: analyzing
         ├─ Fal.ai Whisper → Transcript
         └─ Gemini 2.0 Flash → AI summary + score (technical / communication / motivation)
                │
                ▼
         DB updated (status: scored)
                │
                ▼
         Admin dashboard (auto-updates via 5s polling)
```

## API Routes

### Next.js API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/analyze` | — | Run video analysis pipeline (Whisper STT + Gemini scoring) |
| `POST` | `/api/check-cv` | candidate | Parse PDF and check CV compatibility against job keywords |
| `GET` | `/api/videos/signed-url?key=` | session | Generate presigned download URL for a video |
| `GET` | `/api/cvs/signed-url?key=` | session | Generate presigned download URL for a CV |
| `POST` | `/api/storage/upload-cv` | candidate | Upload CV PDF to R2 |
| `GET` | `/api/storage/upload-url?key=&type=` | candidate | Get presigned upload URL for video/audio |
| `POST` | `/api/storage/upload-video?key=` | candidate | Upload video directly to R2 |
| `GET` | `/api/jobs/[jobId]/questions` | candidate | Fetch interview questions for a job |
| `POST` | `/api/jobs/extract-keywords` | hr/admin | Proxy → Go backend: extract keywords from job description |
| `PATCH` | `/api/applications/status` | hr/admin | Update application status (shortlisted / rejected / scored) |

### Go Backend Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `POST` | `/api/jobs/extract-keywords` | session | Extract keywords from job title + description via Claude Sonnet |

## Notes

- The Go backend automatically loads `.env.local` from the project root.
- Whisper results go through artifact filtering (subtitle hallucinations); transcripts under 20 words skip AI analysis.
- R2 presigned URLs are generated with a 1-hour TTL.
- The `STT_PROVIDER` env variable allows switching STT providers.
