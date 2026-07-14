## Next.js 16: The AI-Native Developer Masterclass - Day 1

0. [Section 0: Setup Tools and Resources](#section-0-setup-tools-and-resources)
    - ติดตั้งเครื่องมือที่จำเป็น (VS Code, Node.js, Git, Postman)
    - ตรวจสอบการติดตั้งเครื่องมือบน Windows / Mac OS / Linux
    - สมัครและเตรียม Neon Database

1. [Section 1: รู้จัก Next.js v.16 พื้นฐาน](#section-1-รู้จัก-nextjs-v16-พื้นฐาน)
    - Next.js คืออะไร? ทำไมต้อง v.16?
    - App Router vs Pages Router
    - React Server Components (RSC)
    - Server Actions, Streaming & Suspense
    - Caching & Revalidation

2. [Section 2: Project Setup & Folder Structure](#section-2-project-setup--folder-structure)
    - การเริ่มต้น Next.js 16 ด้วย TypeScript, Tailwind CSS
    - การวาง Folder Structure แบบ Scalable
    - รู้จัก shadcn/ui
    - การติดตั้งและตั้งค่า shadcn/ui
    - การใช้ Button, Input, Card, Label Components
    - การปรับแต่ง Theme และ Design System
    - สร้าง landing page
    - สร้างหน้า Register และ Login UI
    - สร้างหน้า Dashboard แสดง User Profile

---

### Section 0: Setup Tools and Resources
#### 0.1 Tools and Editors Required
- Visual Studio Code (แนะนำติดตั้ง Extensions: ESLint, Prettier, Prisma, Tailwind CSS IntelliSense)
- Node.js (LTS version 20+)
- Git
- Postman (สำหรับทดสอบ API)
- Web Browser (Chrome หรือ Edge พร้อม DevTools)

#### 0.2 Verify Tools and Environment on Windows / Mac OS / Linux
Open terminal or command prompt and run the following commands to verify the installations:

#### Visual Studio Code
```bash
code --version
```

#### Node.js
```bash
node --version
npm --version
```

#### Git
```bash
git --version
```

#### 0.3 Online Services Required
- **Neon** (https://neon.tech) - PostgreSQL Serverless Database
- **Google Cloud Console** (https://console.cloud.google.com) - สำหรับ Google OAuth
- **GitHub Settings** (https://github.com/settings/developers) - สำหรับ GitHub OAuth
- **LINE Developers Console** (https://developers.line.biz) - สำหรับ LINE Login

---

### Section 1: รู้จัก Next.js v.16 พื้นฐาน

#### 1.1 Next.js คืออะไร?

**Next.js** คือ Full-stack Web Framework ที่สร้างบน React โดยทีม Vercel เปิดตัวครั้งแรกในปี 2016 ปัจจุบัน Next.js เป็น Framework ที่ได้รับความนิยมสูงสุดในโลก React ด้วยจำนวน downloads กว่า 7 ล้านครั้งต่อสัปดาห์บน npm

**ทำไมต้อง Next.js?**

| คุณสมบัติ | React (ล้วนๆ) | Next.js |
|-----------|--------------|----------|
| **Routing** | ต้องติดตั้ง react-router เอง | มี File-based Routing ในตัว |
| **SSR/SSG** | ต้องตั้งค่าเอง | รองรับในตัว |
| **API Routes** | ต้องสร้าง Backend แยก | สร้าง API ในโปรเจกต์เดียวกัน |
| **Image Optimization** | ต้องทำเอง | มี `next/image` ในตัว |
| **SEO** | ยาก (CSR) | ง่าย (SSR/SSG) |
| **Full-stack** | ❌ Front-end only | ✅ Front-end + Back-end |

#### 1.2 Next.js v.16 มีอะไรใหม่?

Next.js 16 เป็นเวอร์ชันล่าสุดที่มาพร้อม App Router เป็น default และมีการปรับปรุงหลายอย่าง:

**ฟีเจอร์เด่น:**
- ✅ **App Router (Stable)** — ระบบ Routing ใหม่ที่ใช้ React Server Components
- ✅ **React Server Components (RSC)** — คอมโพเนนต์ที่ render บน Server ลดขนาด JavaScript ที่ส่งไป Client
- ✅ **Server Actions** — เรียก function ฝั่ง Server จาก Client ได้โดยตรง ไม่ต้องสร้าง API
- ✅ **Turbopack (Stable)** — Bundler ตัวใหม่ที่เร็วกว่า Webpack
- ✅ **Streaming & Suspense** — โหลดหน้าเว็บแบบ Progressive
- ✅ **Partial Prerendering** — ผสม Static + Dynamic rendering ในหน้าเดียวกัน
- ✅ **Enhanced Caching** — ระบบ Cache ที่ชาญฉลาดยิ่งขึ้น

#### 1.3 App Router vs Pages Router

Next.js มี 2 ระบบ Routing — ตั้งแต่ v.13+ แนะนำให้ใช้ **App Router** เป็นหลัก:

| คุณสมบัติ | Pages Router (เก่า) | App Router (ใหม่) |
|-----------|--------------------|-----------------|
| **โครงสร้าง** | `pages/` directory | `app/` directory |
| **Components** | Client Components ทั้งหมด | Server Components เป็น default |
| **Layout** | `_app.tsx` + `_document.tsx` | `layout.tsx` (nested layouts) |
| **Data Fetching** | `getServerSideProps`, `getStaticProps` | `async` function ใน component โดยตรง |
| **Loading UI** | ทำเอง | `loading.tsx` ในตัว |
| **Error Handling** | ทำเอง | `error.tsx` ในตัว |
| **Metadata/SEO** | `next/head` | `metadata` export |

**ตัวอย่างโครงสร้าง App Router:**
```
app/
├── layout.tsx          # Root Layout (ใช้ร่วมกันทุกหน้า)
├── page.tsx            # หน้า Home (/)
├── loading.tsx         # Loading UI สำหรับ /
├── error.tsx           # Error UI สำหรับ /
├── about/
│   └── page.tsx        # หน้า About (/about)
├── blog/
│   ├── page.tsx        # หน้า Blog (/blog)
│   └── [slug]/
│       └── page.tsx    # หน้า Blog Post (/blog/my-post)
└── api/
    └── hello/
        └── route.ts    # API Route (/api/hello)
```

#### 1.4 React Server Components (RSC)

ใน App Router ทุก component เป็น **Server Component** โดย default:

```tsx
// app/page.tsx — นี่คือ Server Component (ไม่ต้องมี "use client")
export default async function HomePage() {
  // สามารถ fetch ข้อมูลจาก database โดยตรง!
  const data = await fetch("https://api.example.com/data")
  const posts = await data.json()

  return (
    <div>
      <h1>Welcome to Next.js 16</h1>
      {posts.map((post: any) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

**เมื่อไหร่ต้องใช้ Client Component?**

เมื่อต้องการใช้ feature เหล่านี้ ให้ใส่ `"use client"` ที่บรรทัดแรก:
- `useState`, `useEffect`, `useRef` (React Hooks)
- Event handlers (`onClick`, `onChange`)
- Browser-only APIs (`window`, `document`)

```tsx
"use client" // ← ประกาศว่าเป็น Client Component

import { useState } from "react"

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

> **Best Practice:** ใช้ Server Components ให้มากที่สุด → ลด JavaScript bundle size → หน้าเว็บเร็วขึ้น

#### 1.5 Server Actions

**Server Actions** ให้คุณเรียก function ฝั่ง Server จาก Client Form ได้โดยตรง:

```tsx
// app/contact/page.tsx
export default function ContactPage() {
  // Server Action — ฟังก์ชันนี้ทำงานบน Server
  async function submitForm(formData: FormData) {
    "use server"
    const name = formData.get("name")
    const email = formData.get("email")
    // บันทึกลง database โดยตรง!
    // await prisma.contact.create({ data: { name, email } })
  }

  return (
    <form action={submitForm}>
      <input name="name" placeholder="ชื่อ" />
      <input name="email" type="email" placeholder="อีเมล" />
      <button type="submit">ส่ง</button>
    </form>
  )
}
```

> **ข้อดี:** ไม่ต้องสร้าง API Route แยก, ไม่ต้อง `fetch` จาก Client, Type-safe end-to-end

#### 1.6 Streaming & Suspense

Next.js 16 รองรับการโหลดหน้าเว็บแบบ **Progressive** ด้วย Streaming:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react"

async function SlowDataComponent() {
  const data = await fetch("https://api.example.com/slow-data")
  const result = await data.json()
  return <div>{result.title}</div>
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* แสดง Loading ในขณะที่ SlowDataComponent กำลังโหลด */}
      <Suspense fallback={<p>กำลังโหลดข้อมูล...</p>}>
        <SlowDataComponent />
      </Suspense>
    </div>
  )
}
```

หรือใช้ไฟล์ `loading.tsx` สำหรับ Loading UI ของทั้ง route:

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>
  )
}
```

#### 1.7 Metadata & SEO

Next.js 16 มีระบบ Metadata ที่ทรงพลังสำหรับ SEO:

```tsx
// app/layout.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "AI Native App",
    template: "%s | My AI Auth App",
  },
  description: "AI-Native Application with Better Auth",
  keywords: ["Next.js", "AI", "Authentication", "Better Auth"],
}
```


### Section 2: Project Setup & Folder Structure

#### 2.1 สร้างโปรเจกต์ Next.js 16

**สร้างโปรเจกต์ใหม่:**
```bash
# เวอร์ชันล่าสุดจะใช้ Next.js 16 โดยอัตโนมัติ
npx create-next-app@latest ai-native-app --yes
# ระบุเลขาเวอร์ชันที่ต้องการ (ถ้าต้องการเจาะจง)
npx create-next-app@16.1.6 ai-native-app --yes
```
**หมายเหตุ:** การใช้ `--yes` จะเป็นการยอมรับค่า default ทั้งหมด

หรือจะเลือกแบบ Interactive ก็ได้:
```bash
npx create-next-app@latest ai-native-app
```

เลือกตัวเลือกดังนี้:
```
✔ Would you like to use TypeScript? Yes
✔ Would you like to use ESLint? Yes
✔ Would you like to use Tailwind CSS? Yes
✔ Would you like your code inside a `src/` directory? No
✔ Would you like to use App Router? (recommended) Yes
✔ Would you like to use Turbopack for `next dev`? Yes
✔ Would you like to customize the import alias (@/* by default)? No
```

**การรันโปรเจกต์:**
```bash
cd ai-native-app
npm run dev
```
เข้าถึงได้ที่ http://localhost:3000

#### 2.2 ตั้งค่า next.config.ts

แก้ไขไฟล์ `next.config.ts` เพิ่ม remote image patterns:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
```

#### 2.3 โครงสร้างโฟลเดอร์ (Co-location + Route Groups)

> **Best Practice:** Next.js App Router แนะนำ **Co-location** — เก็บ component ที่ใช้เฉพาะ page ไว้ข้างๆ `page.tsx`  
> ส่วน component ที่ใช้ร่วมกันหลาย routes ให้เก็บใน `components/`

```
ai-native-app/
├── app/
│   ├── layout.tsx                      ← Root Layout (html, body, fonts, globals.css)
│   ├── globals.css                     ← Design System (oklch, dark mode)
│   │
│   ├── (landing)/                      ← Route Group: Landing Page
│   │   ├── page.tsx                    ← Server Component + Metadata
│   │   ├── Navbar.tsx                  ← Client Component (dark mode toggle)
│   │   ├── Hero.tsx                    ← Hero section
│   │   ├── Features.tsx                ← Features cards
│   │   ├── About.tsx                   ← About section
│   │   ├── TechStack.tsx               ← Tech badges
│   │   ├── Team.tsx                    ← Team members
│   │   ├── Testimonial.tsx             ← Reviews
│   │   └── Footer.tsx                  ← Footer
│   │
│   ├── (auth)/auth/                    ← Route Group: Authentication
│   │   ├── layout.tsx                  ← Split-screen layout
│   │   ├── auth-branding.tsx           ← Animated branding (Unsplash images)
│   │   ├── signin/
│   │   │   ├── LoginForm.tsx           ← Client Component (form logic)
│   │   │   └── page.tsx               ← Server Component + Metadata
│   │   ├── signup/
│   │   │   ├── SignupForm.tsx          ← Client Component (form logic)
│   │   │   └── page.tsx               ← Server Component + Metadata
│   │   └── forgot-password/
│   │       ├── ForgotPasswordForm.tsx  ← Client Component (form logic)
│   │       └── page.tsx               ← Server Component + Metadata
│   │
│   ├── (main)/                         ← Route Group: Authenticated Pages
│   │   ├── layout.tsx                  ← Shared header + navigation
│   │   └── dashboard/
│   │       ├── DashboardContent.tsx    ← Client Component (stats, cards)
│   │       ├── sign-out-button.tsx     ← Client Component (sign out)
│   │       └── page.tsx               ← Server Component + Metadata
│   │
│   ├── api/auth/[...all]/route.ts      ← Better Auth API Handler
│   └── generated/prisma/              ← Prisma Client (auto-generated)
│
├── components/
│   └── ui/                             ← Shared UI only (shadcn/ui)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
│
├── lib/
│   ├── auth.ts                         ← Better Auth Server Config
│   ├── auth-client.ts                  ← Better Auth Client
│   ├── prisma.ts                       ← Prisma Client Singleton (Driver Adapter)
│   └── utils.ts                        ← cn() utility
│
├── prisma/
│   └── schema.prisma                   ← Database Schema
│
├── .env                                ← Environment Variables
├── next.config.ts                      ← Next.js Config (images)
└── package.json
```

> **Route Groups** `(landing)`, `(auth)`, `(main)` จะไม่ปรากฏใน URL — เป็นแค่โฟลเดอร์สำหรับจัดกลุ่ม route กับ layout ที่แตกต่างกัน

#### 2.4 รู้จัก shadcn/ui

**shadcn/ui** ไม่ใช่ไลบรารี Component (เช่น MUI หรือ Ant Design) ในแบบดั้งเดิม แต่นิยามตัวเองว่าเป็น "ชุดของ Component ที่คุณสามารถคัดลอกและวางลงในโปรเจกต์ได้โดยตรง"
- **"ไม่ใช่การติดตั้ง แต่คือการเป็นเจ้าของ"**
แทนที่จะติดตั้งผ่าน npm install เป็น dependency ตัวใหญ่ๆ shadcn/ui จะให้คุณใช้ CLI หรือคัดลอกโค้ดต้นฉบับมาไว้ในโฟลเดอร์ components ของคุณเอง
- **ข้อดี:** คุณสามารถแก้ไขโค้ดข้างในได้ทุกบรรทัดเพื่อให้เข้ากับงานของคุณที่สุด โดยไม่ต้องรอเจ้าของไลบรารีอัปเดต
- **ขุมพลังเบื้องหลัง** shadcn/ui รวมเอาเทคโนโลยีระดับท็อปมาไว้ด้วยกัน
  - Radix UI: จัดการเรื่อง Logic และการเข้าถึง (Accessibility/WCAG) เช่น การกด Tab หรือการใช้ Screen Reader
  - Tailwind CSS: ใช้ในการจัดแต่งหน้าตา (Styling) ทำให้คุณเปลี่ยนสีหรือปรับขนาดได้ง่ายผ่าน Utility Classes
  - Lucide React: ชุดไอคอนเริ่มต้นที่สวยงามและน้ำหนักเบา
- **ทำไมต้องใช้ ?**
  - ความยืดหยุ่นสูง: เนื่องจากโค้ดอยู่ที่เรา เราจะลบส่วนที่ไม่ใช้ออก หรือเปลี่ยนโครงสร้างใหม่ทั้งหมดก็ได้
  - ดีไซน์สะอาดตา: มาพร้อมสไตล์ที่ดูโมเดิร์น Minimal และรองรับ Dark Mode ในตัว
  - TypeScript First: รองรับ Type Safety เต็มรูปแบบ ช่วยลด Bug ในการพัฒนา
  - เป็นมิตรกับ AI: เนื่องจากเป็น Source Code ที่ชัดเจน ทำให้ AI (เช่น Cursor หรือ Copilot) เข้าใจและช่วยเขียนโค้ดต่อได้ง่ายกว่าไลบรารีที่ถูก Compile มาแล้ว 

#### 2.5 การติดตั้งและตั้งค่า shadcn/ui

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# Install components
npx shadcn@latest add button card input label
```

#### 2.6 การใช้ Button, Input, Card, Label Components

แก้ไขไฟล์ `app/page.tsx` เพื่อทดสอบการใช้ Components:

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Home() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="[EMAIL_ADDRESS]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### 2.7 สร้างหน้า Landing Page 
สำหรับโปรเจกต์นี้เราจะสร้าง landing page ที่มี Navbar, Hero section, Features, About, Tech Stack, Team และ Testimonial

> ก่อนอื่นเราจะสร้าง group route ชื่อ `(landing)` เพื่อเก็บหน้า landing page ทั้งหมดไว้ด้วยกัน และสร้าง component ย่อยๆ สำหรับแต่ละ section

จากนั้นทำการย้ายโค้ดใน `app/page.tsx` ไปไว้ที่ `app/(landing)/page.tsx` และสร้าง component ใหม่ๆ ตามที่ระบุไว้ในโครงสร้างโฟลเดอร์ด้านบน

และทำการลบหน้า about และ contact ที่สร้างไว้ตอนแรกออกไป เพราะเราจะสร้างใหม่ใน landing page นี้แทน

ตอนนี้โครงสร้างโฟลเดอร์ใน `app/` จะเป็นดังนี้:
```app/
├── layout.tsx
├── globals.css
├── (landing)/
│   ├── page.tsx
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── About.tsx
│   ├── TechStack.tsx
│   ├── Team.tsx
│   ├── Testimonial.tsx
│   └── Footer.tsx
```

##### 2.7.1 สร้างไฟล์ `app/(landing)/Navbar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

// Theme store for managing dark mode
const themeStore = {
    getSnapshot: (): boolean => {
        if (typeof window === 'undefined') return false
        return document.documentElement.classList.contains('dark')
    },
    getServerSnapshot: (): boolean => false,
    subscribe: (callback: () => void): (() => void) => {
        const observer = new MutationObserver(callback)
        if (typeof window !== 'undefined') {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            })
        }
        return () => observer.disconnect()
    },
    setTheme: (isDark: boolean): void => {
        if (isDark) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    },
    initTheme: (): void => {
        if (typeof window === 'undefined') return
        const savedTheme = localStorage.getItem('theme')
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }
}

const navLinks = [
    { href: "/#home", label: "หน้าแรก" },
    { href: "/#features", label: "ฟีเจอร์" },
    { href: "/#about", label: "เกี่ยวกับเรา" },
    { href: "/#team", label: "ทีมงาน" },
    { href: "/#testimonial", label: "รีวิว" },
]

function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const isDarkMode = useSyncExternalStore(
        themeStore.subscribe,
        themeStore.getSnapshot,
        themeStore.getServerSnapshot
    )

    useEffect(() => {
        themeStore.initTheme()
    }, [])

    const toggleDarkMode = useCallback(() => {
        themeStore.setTheme(!isDarkMode)
    }, [isDarkMode])

    return (
        <header className="fixed left-0 top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <Link href="/#home" className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="text-lg font-bold">AI Native App</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        aria-label="Toggle theme"
                    >
                        {/* Moon icon (light mode) */}
                        <svg
                            viewBox="0 0 24 24"
                            className={`h-4.5 w-4.5 transition-all ${isDarkMode ? 'hidden' : 'block'}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                        {/* Sun icon (dark mode) */}
                        <svg
                            viewBox="0 0 24 24"
                            className={`h-4.5 w-4.5 transition-all ${isDarkMode ? 'block' : 'hidden'}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    </button>

                    <Link href="/auth/signin">
                        <Button variant="ghost" size="sm">
                            เข้าสู่ระบบ
                        </Button>
                    </Link>
                    <Link href="/auth/signup">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                            เริ่มต้นใช้งาน
                        </Button>
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="text-muted-foreground flex h-9 w-9 items-center justify-center lg:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                                <path d="M16.5 5.5L5.5 16.5M5.5 5.5L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 22 22" className="fill-current">
                                <path d="M2.75 3.66666H19.25V5.49999H2.75V3.66666ZM2.75 10.0833H19.25V11.9167H2.75V10.0833ZM2.75 16.5H19.25V18.3333H2.75V16.5Z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t bg-background/95 backdrop-blur-md">
                    <nav className="mx-auto max-w-7xl px-6 py-4 space-y-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    )
}

export default Navbar

```

##### 2.7.2 สร้างไฟล์ `app/(landing)/Hero.tsx`:

```tsx
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Hero() {
    return (
        <section id="home" className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-14">
            {/* Background gradient */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 h-150 w-225 rounded-full bg-purple-500/10 blur-3xl" />
                <div className="absolute right-0 top-1/3 h-100 w-100 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="mx-auto max-w-4xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Powered by Next.js 16 &amp; Better Auth</span>
                </div>

                <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                    <span className="bg-linear-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                        AI-Native
                    </span>{" "}
                    Application
                </h1>

                <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
                    สร้างแอปพลิเคชัน AI ครบวงจร — ตั้งแต่ระบบ Authentication ที่ปลอดภัย,
                    RAG Chatbot อัจฉริยะ, LINE Integration ไปจนถึง Production Deployment
                </p>

                <div className="flex items-center justify-center gap-4">
                    <Link href="/auth/signup">
                        <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8">
                            เริ่มต้นใช้งาน
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/auth/signin">
                        <Button variant="outline" size="lg" className="px-8">
                            เข้าสู่ระบบ
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
```
##### 2.7.3 สร้างไฟล์ `app/(landing)/Features.tsx`:

```tsx
import { Bot, Shield, Database, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
    {
        icon: Shield,
        title: "Secure Authentication",
        description: "Better Auth with Social Login, MFA, RBAC — ระบบยืนยันตัวตนที่ปลอดภัยและทันสมัย",
    },
    {
        icon: Database,
        title: "RAG Knowledge Base",
        description: "สร้างฐานความรู้ AI ด้วย pgVector และ OpenAI Embeddings — ค้นหาข้อมูลจากความหมาย",
    },
    {
        icon: Bot,
        title: "AI Chatbot",
        description: "Chatbot อัจฉริยะที่ตอบคำถามจากเอกสารองค์กร — รองรับ Web และ LINE",
    },
    {
        icon: Zap,
        title: "Automation & Deploy",
        description: "Workflow Automation ด้วย n8n และ Container Deployment ด้วย Podman",
    },
]

export default function Features() {
    return (
        <section id="features" className="border-t bg-muted/30 py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight">
                        ฟีเจอร์หลัก
                    </h2>
                    <p className="mx-auto max-w-2xl text-muted-foreground">
                        เทคโนโลยีที่ทันสมัยและครบวงจร สำหรับการสร้าง AI-Native Application
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature) => (
                        <Card key={feature.title} className="group transition-all hover:shadow-lg hover:border-purple-500/50">
                            <CardHeader>
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-900/30">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}

```

##### 2.7.4 สร้างไฟล์ `app/(landing)/About.tsx`

```tsx
import { Code, Users, Lightbulb } from "lucide-react"

export default function About() {
    const highlights = [
        {
            icon: Lightbulb,
            title: "AI-First Approach",
            description: "ออกแบบโดยมี AI เป็นหัวใจหลัก ตั้งแต่ RAG, Embeddings ไปจนถึง Chatbot อัจฉริยะ",
        },
        {
            icon: Code,
            title: "Modern Stack",
            description: "ใช้เทคโนโลยีล่าสุด — Next.js 16, Prisma v7, Better Auth และ pgVector",
        },
        {
            icon: Users,
            title: "Production Ready",
            description: "พร้อม Deploy ด้วย Container, Workflow Automation และ LINE Integration",
        },
    ]

    return (
        <section id="about" className="py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                    {/* Left - Text */}
                    <div>
                        <h2 className="mb-4 text-3xl font-bold tracking-tight">
                            เกี่ยวกับ{" "}
                            <span className="bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                AI Native App
                            </span>
                        </h2>
                        <p className="mb-6 text-muted-foreground leading-relaxed">
                            AI Native App คือโปรเจกต์ต้นแบบที่พัฒนาจากหลักสูตร
                            &quot;Next.js 16: The AI-Native Developer Masterclass&quot;
                            ครอบคลุมการสร้างแอปพลิเคชันครบวงจรตั้งแต่ Authentication,
                            RAG Knowledge Base, AI Chatbot ไปจนถึง LINE Integration
                            และ Production Deployment
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                            เหมาะสำหรับนักพัฒนาที่ต้องการเรียนรู้การสร้าง AI Application
                            ด้วยเทคโนโลยียุคใหม่แบบ hands-on ทำจริงทุกขั้นตอน
                        </p>
                    </div>

                    {/* Right - Highlights */}
                    <div className="space-y-6">
                        {highlights.map((item) => (
                            <div key={item.title} className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="mb-1 font-semibold">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}


```

##### 2.7.5 สร้างไฟล์ `app/(landing)/TechStack.tsx`

```tsx
export default function TechStack() {
    const techs = [
        "Next.js 16", "TypeScript", "Tailwind CSS", "Better Auth",
        "Prisma v7", "PostgreSQL", "pgVector", "OpenAI",
        "LINE API", "n8n", "Podman",
    ]

    return (
        <section id="tech-stack" className="py-24">
            <div className="mx-auto max-w-7xl px-6 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight">Tech Stack</h2>
                <p className="mb-12 text-muted-foreground">เทคโนโลยีที่ใช้ในโปรเจกต์</p>

                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-4">
                    {techs.map((tech) => (
                        <span
                            key={tech}
                            className="rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        >
                            {tech}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}
```

##### 2.7.6 สร้างไฟล์ `app/(landing)/Team.tsx`

```tsx
import { Github, Linkedin } from "lucide-react"

const teamMembers = [
    {
        name: "อ.สามิตร โกยม",
        role: "Lead Instructor & Developer",
        bio: "Full-Stack Developer & AI Enthusiast — ผู้สอนหลักสูตร Next.js 16: The AI-Native Developer Masterclass",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80",
        github: "#",
        linkedin: "#",
    },
    {
        name: "ดร.ปัญญา ศิลป์",
        role: "AI Research Advisor",
        bio: "ที่ปรึกษาด้าน AI & Machine Learning — เชี่ยวชาญด้าน NLP, RAG Architecture และ Vector Databases",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80",
        github: "#",
        linkedin: "#",
    },
    {
        name: "คุณนภา ดิจิทัล",
        role: "UX/UI Designer",
        bio: "ออกแบบ User Experience ที่สวยงามและใช้งานง่าย — เชี่ยวชาญด้าน Design System และ Accessibility",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&q=80",
        github: "#",
        linkedin: "#",
    },
]

export default function Team() {
    return (
        <section id="team" className="border-t bg-muted/30 py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight">ทีมงาน</h2>
                    <p className="mx-auto max-w-2xl text-muted-foreground">
                        ทีมผู้พัฒนาและผู้สอนที่อยู่เบื้องหลังหลักสูตร AI-Native Developer Masterclass
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {teamMembers.map((member) => (
                        <div
                            key={member.name}
                            className="group rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:shadow-lg hover:border-purple-500/50"
                        >
                            {/* Avatar */}
                            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full ring-2 ring-purple-500/20 ring-offset-2 ring-offset-background transition-all group-hover:ring-purple-500/50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            {/* Info */}
                            <h3 className="mb-1 text-lg font-semibold">{member.name}</h3>
                            <p className="mb-3 text-sm font-medium text-purple-600 dark:text-purple-400">
                                {member.role}
                            </p>
                            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                                {member.bio}
                            </p>

                            {/* Social Links */}
                            <div className="flex items-center justify-center gap-3">
                                <a
                                    href={member.github}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    aria-label={`${member.name} GitHub`}
                                >
                                    <Github className="h-4 w-4" />
                                </a>
                                <a
                                    href={member.linkedin}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    aria-label={`${member.name} LinkedIn`}
                                >
                                    <Linkedin className="h-4 w-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

```

##### 2.7.7 สร้างไฟล์ `app/(landing)/Testimonial.tsx`

```tsx
import { Star, Quote } from "lucide-react"

const testimonials = [
    {
        name: "วิทยา สมาร์ท",
        role: "Senior Developer",
        company: "TechCorp Thailand",
        quote: "หลักสูตรนี้ทำให้เข้าใจ AI-Native Development ได้อย่างลึกซึ้ง ทำโปรเจกต์จริงตั้งแต่วันแรก ใช้งานจริงได้เลยหลังเรียนจบ",
        rating: 5,
    },
    {
        name: "ปาริชาต ดิจิทัล",
        role: "Full Stack Developer",
        company: "Digital Innovation Co.",
        quote: "ชอบที่สอน RAG และ pgVector แบบเข้าใจง่าย ทำให้สร้าง Knowledge Base ได้จริงๆ เชื่อม LINE ได้ด้วย ประทับใจมาก",
        rating: 5,
    },
    {
        name: "ธนพล นวัตกรรม",
        role: "Tech Lead",
        company: "AI Solutions Ltd.",
        quote: "เนื้อหาครบวงจรตั้งแต่ Auth จนถึง Deploy ด้วย Podman ทีมงานนำไปใช้งานจริงในออฟฟิศได้ทันที ROI สูงมาก",
        rating: 5,
    },
]

export default function Testimonial() {
    return (
        <section id="testimonial" className="py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight">
                        รีวิวจากผู้เรียน
                    </h2>
                    <p className="mx-auto max-w-2xl text-muted-foreground">
                        ความคิดเห็นจากนักพัฒนาที่ผ่านหลักสูตร AI-Native Developer Masterclass
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {testimonials.map((item) => (
                        <div
                            key={item.name}
                            className="relative rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-purple-500/50"
                        >
                            {/* Quote Icon */}
                            <Quote className="absolute right-6 top-6 h-8 w-8 text-purple-100 dark:text-purple-900/50" />

                            {/* Stars */}
                            <div className="mb-4 flex gap-1">
                                {Array.from({ length: item.rating }).map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                                &ldquo;{item.quote}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="border-t pt-4">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {item.role} — {item.company}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

```

##### 2.7.8 สร้างไฟล์ `app/(landing)/Footer.tsx`

```tsx
import Link from "next/link"
import { Sparkles } from "lucide-react"

export default function Footer() {
    return (
        <footer className="border-t bg-muted/30 py-12">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Brand */}
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            <span className="text-lg font-bold">AI Native App</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            AI-Native Application สร้างจากหลักสูตร
                            Next.js 16: The AI-Native Developer Masterclass
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="mb-3 font-semibold">ลิงก์ด่วน</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/#features" className="hover:text-foreground transition-colors">
                                    ฟีเจอร์
                                </Link>
                            </li>
                            <li>
                                <Link href="/#about" className="hover:text-foreground transition-colors">
                                    เกี่ยวกับเรา
                                </Link>
                            </li>
                            <li>
                                <Link href="/#team" className="hover:text-foreground transition-colors">
                                    ทีมงาน
                                </Link>
                            </li>
                            <li>
                                <Link href="/auth/signin" className="hover:text-foreground transition-colors">
                                    เข้าสู่ระบบ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="mb-3 font-semibold">ติดต่อ</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>IT Genius Engineering</li>
                            <li>อ.สามิตร โกยม</li>
                            <li>
                                <a href="https://www.itgenius.co.th" className="text-purple-500 hover:text-purple-400 transition-colors">
                                    www.itgenius.co.th
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
                    <p>© 2026 AI Native App — Next.js 16: The AI-Native Developer Masterclass</p>
                    <p className="mt-1">โดย อ.สามิตร โกยม (IT Genius Engineering)</p>
                </div>
            </div>
        </footer>
    )
}

```

##### 2.7.9 สร้าง landing page สร้างไฟล์ `app/(landing)/page.tsx`

```tsx
import { Metadata } from "next"
import Navbar from "@/app/(landing)/Navbar"
import Hero from "@/app/(landing)/Hero"
import Features from "@/app/(landing)/Features"
import About from "@/app/(landing)/About"
import TechStack from "@/app/(landing)/TechStack"
import Team from "@/app/(landing)/Team"
import Testimonial from "@/app/(landing)/Testimonial"
import Footer from "@/app/(landing)/Footer"

export const metadata: Metadata = {
  title: "AI Native App",
  description:
    "AI-Native Application ครบวงจร — Authentication, RAG Chatbot, Knowledge Base, LINE Integration และ Production Deployment ด้วย Next.js 16, Better Auth, Prisma v7 และ OpenAI",
  keywords: [
    "AI Native App",
    "Next.js 16",
    "Better Auth",
    "RAG Chatbot",
    "Knowledge Base",
    "LINE Integration",
    "Prisma v7",
    "pgVector",
    "OpenAI",
    "AI Application",
  ],
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <TechStack />
      <Team />
      <Testimonial />
      <Footer />
    </div>
  )
}
```

##### 2.7.10 แก้ไข Root Layout

ไฟล์ `app/layout.tsx` คือ Root Layout ที่ต้องมี `<html>` และ `<body>` (มีได้ที่เดียว):

```tsx
import type { Metadata } from "next"
import { Inter, Anuphan } from "next/font/google"
import "./globals.css"

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
})

const anuphan = Anuphan({
    variable: "--font-anuphan",
    subsets: ["thai", "latin"],
})

export const metadata: Metadata = {
    title: {
        default: "AI Native App",
        template: "%s | AI Native App",
    },
    description: "AI-Native Application with Next.js 16 & Better Auth",
    keywords: ["Next.js", "AI", "Authentication", "Better Auth", "RAG"],
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="th" suppressHydrationWarning>
            <body className={`${inter.variable} ${anuphan.variable} font-sans antialiased`}>
                {children}
            </body>
        </html>
    )
}
```

> **จุดสังเกตุ:**
> - ใช้ `Inter` สำหรับแสดงฟอนต์ภาษาอังกฤษ และ `Anuphan` สำหรับภาษาไทย
> - ตั้ง CSS Variable `--font-inter`, `--font-anuphan` ให้ใช้ใน `globals.css`
> - `suppressHydrationWarning` ป้องกัน dark mode hydration mismatch
> - Route Groups (`(landing)`, `(auth)`, `(main)`) จะแชร์ Root Layout นี้ร่วมกัน **ไม่ต้องมี `<html>/<body>` ซ้ำกัน**

##### 2.7.11 แก้ไข globals.css ที่ `app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter), var(--font-anuphan);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

#### 2.8 สร้างหน้า Authentication สำหรับ Sign In, Sign Up และ Forgot Password

##### 2.8.1 สร้างไฟล์ LoginForm component ที่ `app/(auth)/auth/signin/LoginForm.tsx`

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, Eye, EyeOff } from "lucide-react"

export default function LoginForm() {

    const router = useRouter() // Next.js Router สำหรับการนำทางหลังจากเข้าสู่ระบบสำเร็จ

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {

            // Mock API Call (จะเปลี่ยนเป็นเรียก API จริงใน Section 7)
            await new Promise((resolve) => setTimeout(resolve, 1500))
            const result = {
                error: email === "test@example.com" && password === "password" ? null : { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
            }

            if (result.error) {
                setError(result.error.message || "เข้าสู่ระบบไม่สำเร็จ")
            } else {
                router.push("/dashboard") // นำทางไปยังหน้า Dashboard หลังจากเข้าสู่ระบบสำเร็จ
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold">AI Native App</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    ยินดีต้อนรับกลับ
                </h1>
                <p className="text-sm text-muted-foreground">
                    เข้าสู่ระบบเพื่อใช้งานต่อ
                </p>
            </div>

            {/* Social Buttons */}
            <div className="space-y-3">
                <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => {
                        // Google Sign In (จะเพิ่มใน Section 7)
                    }}
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => {
                        // GitHub Sign In (จะเพิ่มใน Section 7)
                    }}
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Sign in with GitHub
                </Button>
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link
                            href="/auth/forgot-password"
                            className="text-xs text-purple-500 hover:text-purple-400"
                        >
                            ลืมรหัสผ่าน?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-purple-600 py-5 text-white hover:bg-purple-700"
                    disabled={isLoading}
                >
                    {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-muted-foreground">
                ยังไม่มีบัญชี?{" "}
                <Link
                    href="/auth/signup"
                    className="font-medium text-purple-500 hover:text-purple-400"
                >
                    สมัครสมาชิก
                </Link>
            </p>
        </div>
    )
}
```

##### 2.8.2 สร้างไฟล์ `app/(auth)/auth/signin/page.tsx`

```tsx
import { Metadata } from "next"
import LoginForm from "./LoginForm"

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ",
    description:
        "เข้าสู่ระบบ AI Native App — แอปพลิเคชัน AI ครบวงจร พร้อม RAG Chatbot, Knowledge Base และ LINE Integration รองรับ Social Login ผ่าน Google, GitHub และ LINE",
    keywords: [
        "เข้าสู่ระบบ",
        "Sign In",
        "AI Native App",
        "Better Auth",
        "Social Login",
        "Google Login",
        "GitHub Login",
        "LINE Login",
        "Next.js Authentication",
        "ระบบยืนยันตัวตน",
    ],
}

export default function SignInPage() {
    return <LoginForm />
}
```

##### 2.8.3 สร้างไฟล์ SignupForm ที่ `app/(auth)/auth/signup/SignupForm.tsx`

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, Eye, EyeOff } from "lucide-react"

export default function SignupForm() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        if (password.length < 8) {
            setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
            setIsLoading(false)
            return
        }

        try {
           
            // Mock API call - replace with actual API integration
            await new Promise((resolve) => setTimeout(resolve, 1500))
            const result = { success: true, error: null } // Mock result


            if (result.error) {
                setError(result.error || "สมัครสมาชิกไม่สำเร็จ")
            } else {
                router.push("/dashboard")
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold">AI Native App</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    สร้างบัญชีใหม่
                </h1>
                <p className="text-sm text-muted-foreground">
                    กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งาน
                </p>
            </div>

            {/* Social Buttons */}
            <div className="space-y-3">
                <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => { }}
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign up with Google
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => { }}
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Sign up with GitHub
                </Button>
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">ชื่อ</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="สามิตร โกยม"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="samit@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-purple-600 py-5 text-white hover:bg-purple-700"
                    disabled={isLoading}
                >
                    {isLoading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                </Button>
            </form>

            {/* Sign In Link */}
            <p className="text-center text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{" "}
                <Link
                    href="/auth/signin"
                    className="font-medium text-purple-500 hover:text-purple-400"
                >
                    เข้าสู่ระบบ
                </Link>
            </p>
        </div>
    )
}

```

##### 2.8.4 สร้างไฟล์ `app/(auth)/auth/signup/page.tsx`

```tsx
import { Metadata } from "next"
import SignupForm from "./SignupForm"

export const metadata: Metadata = {
    title: "สมัครสมาชิก",
    description:
        "สมัครสมาชิก AI Native App — สร้างบัญชีเพื่อเข้าถึง RAG Chatbot อัจฉริยะ, Knowledge Base Management และระบบ AI ครบวงจร รองรับ Social Login ผ่าน Google, GitHub และ LINE",
    keywords: [
        "สมัครสมาชิก",
        "Sign Up",
        "สร้างบัญชี",
        "AI Native App",
        "Better Auth",
        "Next.js 16",
        "RAG Chatbot",
        "Knowledge Base",
        "AI Application",
        "ระบบสมาชิก",
    ],
}

export default function SignUpPage() {
    return <SignupForm />
}
```

##### 2.8.5 สร้างไฟล์ ForgotPasswordForm ที่ `app/(auth)/auth/forgot-password/ForgotPasswordForm.tsx`

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // TODO: เชื่อมต่อ Better Auth forgot password API
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setIsSubmitted(true)
        setIsLoading(false)
    }

    if (isSubmitted) {
        return (
            <div className="space-y-6">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                    <span className="text-xl font-bold">AI Native App</span>
                </div>

                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        ตรวจสอบอีเมลของคุณ
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่{" "}
                        <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsSubmitted(false)}
                >
                    ลองอีเมลอื่น
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    <Link
                        href="/auth/signin"
                        className="inline-flex items-center gap-1 font-medium text-purple-500 hover:text-purple-400"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold">AI Native App</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    ลืมรหัสผ่าน?
                </h1>
                <p className="text-sm text-muted-foreground">
                    ไม่ต้องกังวล เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
                </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full bg-purple-600 py-5 text-white hover:bg-purple-700"
                    disabled={isLoading}
                >
                    {isLoading ? "กำลังส่ง..." : "รีเซ็ตรหัสผ่าน"}
                </Button>
            </form>

            {/* Back to Sign In */}
            <p className="text-center text-sm text-muted-foreground">
                <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-1 font-medium text-purple-500 hover:text-purple-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </p>
        </div>
    )
}

```

##### 2.8.6 สร้างไฟล์ `app/(auth)/auth/forgot-password/page.tsx`

```tsx
import { Metadata } from "next"
import ForgotPasswordForm from "./ForgotPasswordForm"

export const metadata: Metadata = {
    title: "ลืมรหัสผ่าน",
    description:
        "รีเซ็ตรหัสผ่าน AI Native App — กรอกอีเมลเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่ ระบบจะส่งอีเมลยืนยันให้ภายในไม่กี่วินาที",
    keywords: [
        "ลืมรหัสผ่าน",
        "Forgot Password",
        "รีเซ็ตรหัสผ่าน",
        "Reset Password",
        "AI Native App",
        "Better Auth",
        "กู้คืนบัญชี",
        "Account Recovery",
    ],
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />
}
```


##### 2.8.7 สร้างไฟล์ `app/(auth)/auth/auth-branding.tsx` แสดงข้อมูลฟีเจอร์เด่นของระบบ Authentication ในรูปแบบสไลด์โชว์

```tsx
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Bot, Brain, Shield } from "lucide-react"

interface SlideData {
    icon: React.ElementType
    title: string
    description: string
    image: string
}

const slides: SlideData[] = [
    {
        icon: Bot,
        title: "AI Chatbot",
        description:
            "Chatbot อัจฉริยะที่ตอบคำถามจากเอกสารองค์กร รองรับทั้ง Web และ LINE Messaging API",
        image:
            "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=1600&fit=crop&q=80",
    },
    {
        icon: Brain,
        title: "RAG Knowledge Base",
        description:
            "สร้างฐานความรู้ AI ด้วย pgVector และ OpenAI Embeddings — ค้นหาข้อมูลจากความหมายได้อย่างแม่นยำ",
        image:
            "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=1600&fit=crop&q=80",
    }, 
    {
        icon: Shield,
        title: "Secure Authentication",
        description:
            "Better Auth พร้อม Social Login, MFA, RBAC — ระบบยืนยันตัวตนที่ปลอดภัยระดับ Enterprise",
        image:
            "https://images.unsplash.com/photo-1590065707046-4fde65275b2e?w=1200&h=1600&fit=crop&q=80",
    },
]

export function AuthBranding() {
    const [activeIndex, setActiveIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % slides.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [])

    const current = slides[activeIndex]
    const Icon = current.icon

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <Image
                    src={current.image}
                    alt={current.title}
                    fill
                    className="object-cover transition-all duration-700"
                    priority
                    sizes="50vw"
                />
                {/* Dark overlay gradient */}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-black/30" />
            </div>

            {/* Content */}
            <div className="relative flex h-full flex-col justify-end p-12">
                <div className="space-y-6">
                    {/* Feature Icon + Label */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                            <Icon className="h-5 w-5 text-purple-300" />
                        </div>
                        <span className="text-lg font-light text-purple-300">
                            AI Native App
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold leading-tight text-white">
                        {current.title}
                    </h2>

                    {/* Description */}
                    <p className="max-w-md text-lg leading-relaxed text-gray-300">
                        &ldquo;{current.description}&rdquo;
                    </p>

                    {/* Tech Tags */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        {["Next.js 16", "Better Auth", "Prisma v7", "pgVector", "OpenAI"].map(
                            (tech) => (
                                <span
                                    key={tech}
                                    className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300 backdrop-blur-sm"
                                >
                                    {tech}
                                </span>
                            )
                        )}
                    </div>
                </div>

                {/* Navigation Dots */}
                <div className="mt-8 flex items-center gap-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                activeIndex === index
                                    ? "w-8 bg-white"
                                    : "w-2 bg-gray-500 hover:bg-gray-400"
                            )}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

```

##### 2.8.10 สร้างไฟล์ `app/(auth)/auth/layout.tsx` เพื่อจัดวางหน้า Authentication โดยแบ่งเป็น 2 คอลัมน์ (Form และ Branding)

```tsx
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AuthBranding } from "@/app/(auth)/auth/auth-branding"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen">
            {/* Left Side - Form */}
            <div className="relative flex w-full flex-col justify-center px-4 py-12 lg:w-1/2 lg:px-20">
                {/* Back to Home */}
                <Link
                    href="/"
                    className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    กลับหน้าหลัก
                </Link>

                <div className="mx-auto w-full max-w-100">
                    {children}
                </div>
            </div>

            {/* Right Side - Branding */}
            <div className="hidden lg:block lg:w-1/2">
                <AuthBranding />
            </div>
        </div>
    )
}
```

#### 2.9 สร้างหน้า Dashboard สำหรับทดสอบการเข้าสู่ระบบ

##### 2.9.1 สร้างไฟล์ `app/(main)/dashboard/sign-out-button.tsx` สำหรับปุ่ม Sign Out

```tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SignOutButton() {
    const router = useRouter()

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
                router.push("/auth/signin")
            }}
            className="gap-2"
        >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
        </Button>
    )
}
```

##### 2.9.2 สร้างไฟล์ `app/(main)/dashboard/DashboardContent.tsx` สำหรับแสดงข้อมูลผู้ใช้และปุ่ม Sign Out

```tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Bot, Database, Sparkles } from "lucide-react"
import { SignOutButton } from "./sign-out-button"

export default function DashboardContent() {
    
    // TODO: ใช้ useSession() จาก Better Auth เมื่อเชื่อมต่อ DB แล้ว
    const session = {
        user: {
            name: "John Doe",
            email: "john@example.com",
            role: "admin",
        },
    }

    const stats = [
        {
            title: "สถานะ",
            value: session.user.role === "admin" ? "Admin" : "User",
            icon: Shield,
            description: `Role: ${session.user.role}`,
        },
        {
            title: "Knowledge Docs",
            value: "0",
            icon: Database,
            description: "เอกสารในฐานข้อมูล",
        },
        {
            title: "AI Chats",
            value: "0",
            icon: Bot,
            description: "การสนทนาทั้งหมด",
        },
        {
            title: "สถานะระบบ",
            value: "Active",
            icon: Sparkles,
            description: "ระบบทำงานปกติ",
        },
    ]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        สวัสดี, {session.user.name} 👋
                    </h2>
                    <p className="text-muted-foreground">
                        ยินดีต้อนรับสู่ AI Native App Dashboard
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-muted-foreground sm:block">
                        {session.user.email}
                    </span>
                    <SignOutButton />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                    <p>
                        เริ่มต้นด้วยการเพิ่มเอกสารใน{" "}
                        <a href="/knowledge" className="text-purple-500 underline">
                            Knowledge Base
                        </a>{" "}
                        หรือทดสอบ{" "}
                        <a href="/chat" className="text-purple-500 underline">
                            AI Chat
                        </a>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
```

##### 2.9.3 สร้างไฟล์ `app/(main)/dashboard/page.tsx` สำหรับหน้า Dashboard

```tsx
import { Metadata } from "next"
import DashboardContent from "./DashboardContent"

export const metadata: Metadata = {
    title: "Dashboard",
    description:
        "แดชบอร์ด AI Native App — ศูนย์กลางการจัดการระบบ AI ครบวงจร ดูสถิติการใช้งาน, จัดการ Knowledge Base, AI Chat และตั้งค่าระบบทั้งหมดได้ในที่เดียว",
    keywords: [
        "Dashboard",
        "แดชบอร์ด",
        "AI Native App",
        "ศูนย์กลางการจัดการ",
        "Knowledge Base",
        "AI Chat",
        "สถิติการใช้งาน",
        "ระบบจัดการ AI",
    ],
}

export default function DashboardPage() {
    return <DashboardContent />
}
```

##### 2.9.4 สร้างไฟล์ `app/(main)/layout.tsx` สำหรับจัดวางหน้า Dashboard

```tsx
import { Sparkles } from "lucide-react"
import Link from "next/link"

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <span className="text-lg font-bold">AI Native App</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Dashboard
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl p-6">{children}</main>
        </div>
    )
}
```

---

### สรุป Day 1

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Project Setup** | สร้างโปรเจกต์ Next.js 16 พร้อม TypeScript & Tailwind CSS |

ในวันพรุ่งนี้เราจะเริ่มสร้างระบบ Authentication ด้วย Better Auth และเชื่อมต่อกับ Prisma ที่เราเตรียมไว้วันนี้!