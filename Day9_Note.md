## Next.js 16: AI-Native Developer Masterclass - Day 9

1. [Section 1: n8n Lead Alert Automation](#section-1-n8n-lead-alert-automation)
    - แนะนำ n8n Workflow Automation
    - Webhook สำหรับส่งข้อมูลไปยัง n8n

2. [Section 2: Containerization ด้วย Podman](#section-2-containerization-ด้วย-podman)
    - ภาพรวม Architecture ของแอปพลิเคชัน
    - ทำไมต้อง Podman? (vs Docker)
    - การเขียน Dockerfile สำหรับ Next.js
    - Multi-Stage Build

3. [Section 3: Production Deployment](#section-3-production-deployment)
    - Docker Compose สำหรับ Single Container (ใช้ Neon Cloud)
    - Environment Variables ในระบบ Production
    - การทดสอบแอปพลิเคชันใน Container

4. [Section 4: Final Workshop & Best Practices](#section-4-final-workshop--best-practices)
    - รวม Checklist สำหรับ Production
    - Security Best Practices
    - Performance Optimization
    - Workshop: Deploy ระบบทั้งหมด

---

### Section 1: n8n Lead Alert Automation

#### 1.1 n8n คืออะไร?

**n8n** (pronounce: "n-eight-n") เป็น Workflow Automation Tool แบบ Open Source ที่ช่วยเชื่อมต่อแอปพลิเคชันและบริการต่างๆ เข้าด้วยกัน คล้ายกับ Zapier แต่สามารถ Self-host ได้

**ข้อดีของ n8n:**
- 🎯 แบบ Visual — ลาก-วาง สร้าง workflow ง่ายๆ
- 🔒 Self-hosted — ข้อมูลอยู่ในเครื่องเรา
- 💰 ฟรี — Open Source
- 🔌 400+ Integrations — เชื่อมต่อได้เกือบทุก service

#### 1.2 สมัครใช้งานบน n8n.cloud (n8n.io)

1. ไปที่ [n8n.io](https://n8n.io/) และสมัครบัญชี
2. สร้าง Workflow ใหม่ และเลือก Trigger เป็น Webhook

#### 1.3 ตั้งค่า n8n Workflow

**Workflow: Lead Alert**

1. **Webhook Node** — รับข้อมูล Lead จาก API
   - Method: POST
   - URL: จะได้จาก n8n (เช่น `http://localhost:5678/webhook/lead-alert`)

2. **IF Node** — ตรวจสอบข้อมูล
   - เงื่อนไข: `email` ไม่ว่าง

3. **HTTP Request Node** — ส่งข้อความเข้ากลุ่ม LINE ผ่าน LINE Messaging API
   - URL: `https://api.line.me/v2/bot/message/push`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_LINE_CHANNEL_ACCESS_TOKEN`, `Content-Type: application/json`
   - Body:
     ```json
     {
       "to": "YOUR_GROUP_ID",
       "messages": [{ "type": "text", "text": "🔔 Lead ใหม่! ชื่อ: {{$json.name}} อีเมล: {{$json.email}}" }]
     }
     ```

> **หมายเหตุ:** ข้อมูล Lead ถูกบันทึกลง PostgreSQL ผ่าน Prisma แล้วใน API route โดยตรง — n8n ทำหน้าที่จัดการ Notification pipeline เพิ่มเติมเท่านั้น

เพิ่มใน `.env`:
```env
N8N_WEBHOOK_URL="http://localhost:5678/webhook/lead-alert" # URL ของ n8n Webhook ที่สร้างไว้
```
---

#### 2.3 ทำไมต้อง Podman?

| คุณสมบัติ | Podman | Docker |
|---------|--------|--------|
| **Daemon** | ❌ ไม่ต้องมี (Daemonless) | ✅ ต้องรัน daemon |
| **Rootless** | ✅ รันได้โดยไม่ต้อง root | ⚠️ ต้อง root (default) |
| **Security** | 🛡️ ปลอดภัยกว่า | ⚠️ daemon รันเป็น root |
| **Docker Compatible** | ✅ ใช้ Dockerfile เดิมได้ | - |
| **Pod Support** | ✅ รองรับ Kubernetes Pod | ❌ |
| **ราคา** | ฟรี 100% | มี Desktop License |
| **องค์กร** | แนะนำ (RHEL, CentOS) | ทั่วไป |

> **สรุป:** Podman เป็นทางเลือกที่ปลอดภัยกว่า Docker เพราะ **ไม่ต้องรัน daemon เป็น root** ซึ่งเหมาะกับองค์กรที่เน้น Security

#### 2.4 คำสั่ง Podman พื้นฐาน

```bash
# ดึง image
podman pull docker.io/node:20-alpine

# สร้าง container
podman build -t my-app .

# รัน container
podman run -d -p 3000:3000 my-app

# ดู containers ที่รันอยู่
podman ps

# ดู logs
podman logs <container-id>

# หยุด container
podman stop <container-id>

# ลบ container
podman rm <container-id>
```

#### 2.5 เขียน Dockerfile สำหรับ Next.js

สร้างไฟล์ `Dockerfile` (ใช้ได้ทั้ง Docker Desktop และ Podman):

```dockerfile
# =============================================
# Stage 1: Base — shared Alpine + pnpm
# =============================================
FROM docker.io/node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && \
    apk add --no-cache libc6-compat

# =============================================
# Stage 2: Dependencies — install once, cleanly
# =============================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# 1. ติดตั้งแบบไม่รัน scripts ก่อน
RUN pnpm install --frozen-lockfile --ignore-scripts

# 2. Approve เฉพาะ package ที่ต้องรัน build scripts
RUN pnpm approve-builds @prisma/engines prisma sharp unrs-resolver

# 3. Rebuild เพื่อรัน scripts ของตัวที่ถูก approve แล้ว
RUN pnpm rebuild

# =============================================
# Stage 3: Build — compile Next.js
# =============================================
FROM base AS builder
WORKDIR /app

# 1) Copy dependencies และ package.json (จำเป็นสำหรับ prisma)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# 2) Copy prisma schema แล้ว generate client
COPY prisma ./prisma
RUN pnpm prisma generate

# 3) ตั้ง build-time env ก่อน copy source
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL

# BETTER_AUTH_SECRET ไม่ควร bake ใน image
ENV BETTER_AUTH_SECRET="build-time-placeholder"
ENV BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV STANDALONE_BUILD=true

# 4) Copy source code
COPY . .

# 5) Build Next.js
RUN pnpm build

# =============================================
# Stage 4: Runner — minimal production image
# =============================================
FROM docker.io/node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ติดตั้ง Prisma CLI สำหรับรัน sync schema ใน production
RUN npm install -g prisma@7.5.0

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone output: เฉพาะไฟล์ที่จำเป็น
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: copy schema + custom generated client
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/app/generated/prisma ./app/generated/prisma

# Copy entrypoint (Ensure LF line endings)
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
```

#### 2.5.1 สร้าง entrypoint.sh

สร้างไฟล์ `entrypoint.sh` สำหรับรัน Prisma db push ก่อน start server:

```bash
#!/bin/sh
set -e

echo "==> [1/3] Checking environment..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

echo "==> [2/3] Syncing database schema..."
# รันการ sync schema
prisma db push --url "$DATABASE_URL"

echo "==> [3/3] Starting AI Native App..."
exec node server.js

```

#### 2.6 อัปเดต next.config.ts สำหรับ Standalone Build

เพิ่ม `output: "standalone"` ใน `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ถ้าตัวแปร STANDALONE_BUILD เป็น 'true' ให้เปิด standalone
  // ถ้าไม่ใช่ (เช่นรันบนเครื่อง Local) ก็ไม่ต้องใส่ค่า output (เป็น undefined ไป)
  output: process.env.STANDALONE_BUILD === 'true' ? 'standalone' : undefined,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
```

อนุญาติ CORS สำหรับทุก origin ชั่วคราว (ปรับให้จำกัดใน production):
แก้ไข `lib/auth.ts`:

```typescript
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins: [
        "https://your.domain.com",
        "http://localhost:3000",
        "http://localhost:8810"
    ],
})
```


#### 2.7 สร้าง .dockerignore

สร้างไฟล์ `.dockerignore` เพื่อลดขนาด build context (ใช้ได้ทั้ง Docker และ Podman):

```
# Dependencies (install fresh in container)
node_modules
npm-debug.log*

# Build output
.next
out
build
dist

# Version control
.git
.gitignore

# Environment files — ส่งผ่าน docker-compose env_file เท่านั้น
.env
.env.*
!.env.example

# IDE / Editor
.vscode
.idea
*.swp
*.swo
.DS_Store
Thumbs.db

# Test & coverage
coverage
__tests__
*.test.ts
*.spec.ts
cypress
playwright

# SQLite / local DB
*.db
*.db-journal

# TypeScript build info
*.tsbuildinfo

# Documentation
*.md

# Misc
.vercel
.prettierrc
.eslintcache
.claude
example

# Docker files (ไม่ต้อง copy เข้า container)
.dockerignore
Dockerfile
Containerfile
docker-compose*.yml
podman-compose*.yml

# Backup DB (ใหญ่มาก ไม่ต้องส่งเข้า build context)
backupdb/
```

---

### Section 3: Production Deployment

#### 3.1 Docker Compose สำหรับ Single Container (ใช้ Neon Cloud)

เนื่องจากโปรเจ็กต์ใช้ **Neon PostgreSQL** บน cloud เป็น database หลัก จึงไม่จำเป็นต้องรัน postgres container บนเครื่อง — deploy เฉพาะ **Next.js app** เพียง container เดียว แล้วชี้ `DATABASE_URL` ไปยัง Neon โดยตรง

สร้างไฟล์ `docker-compose.yml`:

> **หมายเหตุ:** ไฟล์ `docker-compose.yml` และ `Dockerfile` ใช้ได้ทั้ง Docker Desktop และ Podman ไม่ต้องแก้ไขอะไร

```yaml
networks:
  app-network:
    driver: bridge

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        # บังคับใช้ port 8810 สำหรับ production build ใน docker
        - NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8810
    image: ghcr.io/${GITHUB_ACTOR:-iamsamitdev}/ai-native-app:latest
    container_name: ai-native-app
    ports:
      - "8810:3000"
    env_file:
      - .env.production
    networks:
      - app-network
    restart: unless-stopped
```

> **จุดสำคัญ:**
> - ไม่มี postgres container — ใช้ **Neon PostgreSQL** (พร้อม pgvector) บน cloud แทน
> - `DATABASE_URL` ใน `.env.production` ชี้ตรงไปยัง Neon endpoint
> - `entrypoint.sh` จะรัน `prisma db push` เพื่อ sync schema กับ Neon ก่อน start server
> - ไม่มี volume ที่ต้องจัดการ — ข้อมูลทั้งหมดอยู่บน Neon

**รัน Docker/Podman Compose:**
```bash
# รันด้วย Docker Desktop
docker compose up -d

# หรือรันด้วย Podman
podman compose up -d

# ดู logs ทั้งหมด
docker compose logs -f

# ดู logs เฉพาะ app
docker compose logs -f app

# หยุดทั้งหมด
docker compose down
```

#### 3.2 Environment Variables สำหรับ Production

สร้างไฟล์ `.env.production` (หรือ copy จาก `.env.example`):

```env
# ===========================================
# AI Native App - Production Environment
# ===========================================

# Database (Neon PostgreSQL — จะถูก override เมื่อใช้ Compose)
DATABASE_URL="postgresql://user:password@your-neon-host/dbname?sslmode=require&connection_limit=1"

# Better Auth
BETTER_AUTH_SECRET="production-secret-key-at-least-32-chars"
BETTER_AUTH_URL="https://your-domain.com"
NEXT_PUBLIC_BETTER_AUTH_URL="https://your-domain.com"

# OpenAI
OPENAI_API_KEY="sk-your-production-key"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Google OAuth
GOOGLE_CLIENT_ID="production-google-client-id"
GOOGLE_CLIENT_SECRET="production-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="production-github-client-id"
GITHUB_CLIENT_SECRET="production-github-client-secret"

# LINE Login
LINE_CLIENT_ID="production-line-channel-id"
LINE_CLIENT_SECRET="production-line-channel-secret"

# Facebook Login
FACEBOOK_CLIENT_ID="production-facebook-client-id"
FACEBOOK_CLIENT_SECRET="production-facebook-client-secret"

# Admin Email
ADMIN_EMAIL="admin@example.com"

# Gmail SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="production-gmail-app-password"

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN="production-line-access-token"
LINE_CHANNEL_SECRET="production-line-channel-secret"

# LINE Group IDs (comma separated for multiple groups)
LINE_GROUP_IDS="your_line_group_id_1,your_line_group_id_2"

# n8n Webhook (ใช้ n8n.io cloud)
N8N_WEBHOOK_URL="https://your-n8n-instance.app.n8n.cloud/webhook/lead-alert"
```

> ⚠️ **สำคัญ:** อย่า commit ไฟล์ `.env.production` ลง Git! เพิ่มในไฟล์ `.gitignore`
>
> **หมายเหตุ:** `DATABASE_URL` ในไฟล์นี้ชี้ตรงไปยัง Neon PostgreSQL cloud ทั้งใน container และ standalone mode — ไม่มีการ override ใดๆ

#### 3.3 Production Checklist

**ก่อน Deploy:**
```bash
# 1. ตรวจสอบ build สำเร็จ
npm run build

# 2. ตรวจสอบ TypeScript errors
npx tsc --noEmit

# 3. ตรวจสอบ ESLint
npm run lint

# 4. ตรวจสอบ Prisma Schema
npx prisma validate

# 5. Push Database Schema (ถ้ามีการเปลี่ยนแปลง)
npx prisma db push
```

---

### Section 4: Final Workshop & Best Practices

#### 4.1 Security Best Practices

| ด้าน | Best Practice |
|------|--------------|
| **API Keys** | เก็บใน Environment Variables เท่านั้น อย่าเขียนใน Code |
| **Database** | ใช้ `connection_limit=1` สำหรับ Serverless |
| **Auth** | ใช้ `BETTER_AUTH_SECRET` ที่ซับซ้อนอย่างน้อย 32 ตัวอักษร |
| **RBAC** | ตรวจสอบสิทธิ์ทั้ง Server-side และ API Route |
| **Container** | ใช้ non-root user ใน Container (Podman ทำให้อัตโนมัติ) |
| **CORS** | กำหนด allowed origins สำหรับ Production |
| **Rate Limit** | จำกัดจำนวน requests ต่อ IP/User |
| **Input Validation** | ตรวจสอบ input ทุก API endpoint |

#### 4.2 Performance Optimization

```typescript
// next.config.ts — Performance Settings
const nextConfig: NextConfig = {
  output: "standalone",

  // Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Headers for Caching
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/:all*(svg|jpg|png|webp)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}
```

#### 4.3 Monitoring & Logging

```typescript
// lib/logger.ts
export function log(level: "info" | "warn" | "error", message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data }),
  }

  if (level === "error") {
    console.error(JSON.stringify(logEntry))
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}
```

#### 4.4 Workshop สุดท้าย: Deploy ระบบทั้งหมด

**ขั้นตอนการ Deploy:**

```bash
# 1. Build Container Image
docker build \
  --build-arg NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:8810 \
  -t ai-native-app:latest .

# 2. Start App Container (ชี้ไป Neon PostgreSQL โดยตรง)
docker compose up -d

# 3. ตรวจสอบ Container ที่รันอยู่
docker ps

# 4. ตรวจสอบ Logs
docker compose logs -f app   # ดู Next.js + Prisma db push logs

# 5. ทดสอบระบบ
# - เปิด http://localhost:8810 → ทดสอบ Login/Register
# - ทดสอบ Chat → ถามคำถามจากเอกสาร
# - ทดสอบ LINE Bot → ส่งข้อความผ่าน LINE
# - ทดสอบ Lead Form → กรอกฟอร์ม → ตรวจสอบแจ้งเตือนในกลุ่ม LINE
# - ตรวจสอบ n8n Workflow บน https://your-n8n-instance.app.n8n.cloud

# 6. ตรวจสอบ Resource Usage
docker stats
```

> **หมายเหตุ:** สามารถแทนที่ `docker` ด้วย `podman` ได้ทุกคำสั่ง

#### 4.5 การ Scale ระบบ

```bash
# ดู resource usage
docker stats

# เพิ่ม replicas (manual — ใช้ Neon database)
docker run -d --name app-2 -p 7301:3000 --env-file .env.production ai-native-app
docker run -d --name app-3 -p 7302:3000 --env-file .env.production ai-native-app

# ใช้ load balancer (เช่น nginx หรือ caddy) ด้านหน้า
```

---

### 🎉 สรุปหลักสูตรทั้ง 9 วัน

| วัน | หัวข้อ | สิ่งที่ได้ |
|-----|--------|----------|
| **Day 1** | Auth & Architecture | ระบบ Authentication ครบวงจร (Better Auth, Social Login, RBAC, MFA) |
| **Day 2** | Vector Database | ฐานความรู้ AI ด้วย pgVector, Embedding, Ingestion Pipeline |
| **Day 3** | RAG Chatbot API | AI Chatbot ที่ตอบจากเอกสารองค์กร, Streaming Response |
| **Day 4** | Frontend & LINE | Chat Widget, LINE Bot, Flex Message |
| **Day 5** | Automation & Deploy | n8n Workflow, Lead Database (Prisma), LINE Group Alert, Podman Container |
| **Day 6** | Performance & Monitoring | การปรับแต่งประสิทธิภาพ, การตรวจสอบและบันทึกข้อมูล |
| **Day 7** | Scaling & Load Balancing | การเพิ่ม replicas และการใช้ load balancer |
| **Day 8** | Security Best Practices | การรักษาความปลอดภัยของระบบ |
| **Day 9** | Final Workshop | การ Deploy ระบบทั้งหมดและทดสอบการทำงาน |
### 🛠️ Tech Stack ที่ใช้ทั้งหลักสูตร

| เทคโนโลยี | การใช้งาน |
|-----------|-----------|
| **Next.js 16** | Full-stack Framework (App Router, TypeScript, Tailwind CSS) |
| **Better Auth** | Authentication (Email, Social Login, MFA, RBAC) |
| **Prisma** | ORM สำหรับ PostgreSQL |
| **Neon** | PostgreSQL Serverless + pgVector |
| **OpenAI** | GPT-4o-mini + Text Embedding |
| **n8n** | Workflow Automation |
| **LINE API** | Messaging API (Bot + Push Message) |
| **Podman** | Rootless Container Runtime |

> **ขอบคุณที่ร่วมเรียนรู้ตลอด 9 วัน!** 🚀 หากมีคำถามเพิ่มเติม สามารถติดต่อได้ที่ อ.สามิตร โกยม — IT Genius Engineering