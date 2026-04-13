# CandorHire

AI-destekli işe alım platformu. Aday videolarını otomatik transkribe edip analiz eder, CV uyumluluğunu ölçer ve yöneticilere veriye dayalı karar desteği sunar.

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · Tailwind CSS 4 |
| Backend | Go 1.26 (Gin) · Next.js API Routes |
| Veritabanı | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (cookie-based SSR) |
| Depolama | Cloudflare R2 (S3-compat, presigned URL) |
| STT | Fal.ai Whisper (async queue) |
| LLM — Analiz | OpenRouter → Gemini 2.0 Flash |
| LLM — Keyword | Anthropic Claude 3.5 Sonnet |
| UI Tasarım | Google Stitch |

## Servisler

Uygulama iki ayrı process olarak çalışır:

| Servis | Adres | Açıklama |
|---|---|---|
| Next.js | `localhost:3000` | Frontend + Next.js API Routes (CV analizi, analiz pipeline, storage) |
| Go backend | `localhost:8080` | Keyword extraction, video signed-URL, Supabase session proxy |

`npm run dev` her ikisini birden başlatır (`concurrently`).

## Kurulum

### Gereksinimler

- Node.js 20+
- Go 1.22+
- Supabase CLI (`brew install supabase/tap/supabase`)

### 1. Bağımlılıkları kur

```bash
npm install
cd app/api/backend && go mod download && cd ../../..
```

### 2. Environment değişkenlerini ayarla

Proje kökünde `.env.local` oluştur:

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

# Go backend (opsiyonel, default: 8080)
PORT=8080

# STT provider (opsiyonel, default: fal)
STT_PROVIDER=fal
```

### 3. Supabase migration'larını uygula

```bash
supabase db push
```

Ya da local geliştirme için:

```bash
supabase start
supabase db reset
```

### 4. Geliştirme ortamını başlat

```bash
npm run dev
```

## Proje Yapısı

```
├── app/
│   ├── (candidate)/        # Aday portali (ilanlar, başvuru akışı)
│   ├── admin/              # Admin paneli (dashboard, ilanlar, adaylar)
│   └── api/
│       ├── analyze/        # Video analiz pipeline (Whisper + Gemini)
│       ├── cvs/            # CV yükleme + AI uyumluluk skoru
│       ├── videos/         # Video/audio yükleme + signed URL
│       └── backend/        # Go servisi (Gin)
│           ├── handlers/
│           └── internal/   # db, ai, session
├── lib/
│   ├── r2.ts               # Cloudflare R2 client
│   ├── supabase.ts         # Supabase browser client
│   ├── supabase-server.ts  # Supabase server client (SSR)
│   ├── data.ts             # Cached server-side data fetchers
│   └── stt/                # STT adaptör katmanı
└── supabase/
    └── migrations/         # PostgreSQL migration dosyaları
```

## Analiz Pipeline

```
Aday başvurur
  ├─ CV → R2 + Gemini CV Check → cvMatchScore
  ├─ Video + Audio → R2
  └─ Application (status: pending)
         │
         ▼
  /api/analyze
         ├─ status: analyzing
         ├─ Fal.ai Whisper → Transkript
         └─ Gemini 2.0 Flash → AI özet + skor (teknik / iletişim / motivasyon)
                │
                ▼
         DB güncellenir (status: scored)
                │
                ▼
         Admin dashboard (5s polling ile otomatik yansır)
```

## Test Kullanıcıları

| Rol | E-posta | Şifre |
|---|---|---|
| HR | hr@test.com | 123456 |
| Aday | candidate@test.com | 123456 |

## Notlar

- Go backend `.env.local` dosyasını proje kökünden otomatik yükler.
- Whisper sonuçları artefakt temizleme (altyazı halüsinasyonları) aşamasından geçer; 20 kelimeden kısa transkriptler AI analizini atlar.
- R2 presigned URL'leri 1 saatlik TTL ile üretilir.
- `STT_PROVIDER` env değişkeniyle farklı STT servisleri takılabilir.
