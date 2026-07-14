## Next.js 16: The AI-Native Developer Masterclass - Day 3

6. [Section 6: Basic Next.js RestAPI](#section-6-basic-nextjs-restapi)
    - พื้นฐาน REST API ใน Next.js 16 — Route Handlers
    - การสร้าง API Routes
    - การใช้ Route Handlers กับ Prisma Client

7. [Section 7: Better Auth Integration](#section-7-better-auth-integration)
    - ติดตั้งและตั้งค่า Better Auth (Server-side & Client-side)
    - อัพเดทหน้า Register และ Login UI เรียกใช้ Better Auth
    - การตรวจสอบ Session ใน Server Component

---

### การเลือกใช้ระหว่าง pnpm หรือ Bun runtime

ในปี 2026 การเลือกใช้ระหว่าง pnpm หรือ Bun runtime สำหรับ Next.js ขึ้นอยู่กับว่าคุณให้ความสำคัญกับ "ความเสถียรระดับโปรดักชัน" หรือ "ความเร็วในการพัฒนา" เป็นหลักครับ โดยสรุปข้อแนะนำได้ดังนี้:

### 1. เลือก pnpm หากต้องการ "ความเสถียรและความถูกต้อง"

pnpm ยังคงเป็นมาตรฐานอุตสาหกรรมสำหรับโปรเจกต์ขนาดใหญ่และ Monorepo ในปี 2026 

- **ความถูกต้องของ Dependency:** มีระบบจัดการที่เข้มงวด ป้องกันปัญหา "Phantom Dependencies" (การเรียกใช้ package ที่ไม่ได้ประกาศไว้) ซึ่งช่วยให้โปรเจกต์ระยะยาวปลอดภัยกว่า
- **ประหยัดพื้นที่ดิสก์:** ใช้ระบบ Content-addressable storage เพื่อเก็บไฟล์ package ไว้ที่เดียวทั่วทั้งเครื่อง

### 2. เลือก Bun Runtime หากต้องการ "ความเร็วและ DX ที่ยอดเยี่ยม"

Bun ได้กลายเป็นเครื่องมือแบบ All-in-one ที่รวม Runtime, Package Manager และ Test Runner ไว้ด้วยกัน

- **ความเร็วระดับจัดเต็ม:** ติดตั้ง package เร็วกว่า pnpm ประมาณ 4 เท่า และเร็วกว่า npm ถึง 7 เท่า รวมถึงช่วยให้ next dev เริ่มต้นทำงาน (Cold Start) ได้เร็วกว่า Node.js อย่างมาก
- **ลดความซับซ้อน:** รองรับ TypeScript และ JSX ได้ในตัวโดยไม่ต้องตั้งค่า Transpiler เพิ่มเติม
- **ประสิทธิภาพ:** ใช้หน่วยความจำ (RAM) น้อยกว่า Node.js ประมาณ 30-40% ซึ่งช่วยลดค่าใช้จ่ายในระบบ Cloud หรือ Serverless ได้

ตารางเปรียบเทียบการตัดสินใจ
| หัวข้อ  | pnpm (Node.js) | Bun Runtime |
|---------|----------------|-------------|
| เหมาะสำหรับ | Enterprise, Large Monorepos | Greenfield Projects, Startups, Personal Apps |
| จุดเด่น | ความถูกต้อง (Correctness), เสถียรสูง | ความเร็ว (Speed), All-in-one Tooling |
| การรองรับ | เข้ากันได้กับทุก Library | ดีมาก แต่อาจมีบาง Library เฉพาะทางที่ไม่รองรับ |
| Deployment | รองรับทุก Platform (Vercel, AWS, etc.) | รองรับวงกว้าง (Vercel, Netlify) |

**คำแนะนำเพิ่มเติม:** หากคุณยังลังเล คุณสามารถใช้ Bun เป็นเพียง Package Manager (ใช้ bun install) เพื่อเอาความเร็วในการติดตั้ง แต่ยังรันแอปบน Node.js เพื่อรักษาความเสถียรในฝั่ง Runtime ได้ ซึ่งเป็นทางเลือกที่ได้รับความนิยมสูงเพราะความเสี่ยงต่ำแต่ได้ผลลัพธ์เร็วขึ้นชัดเจน

สำหรับโปรเจ็กต์ AI Chatbot ที่ใช้ Stack ทันสมัยอย่าง Next.js 16, Prisma 7 และ pgVector ผมแนะนำให้ใช้ pnpm เป็นทางเลือกที่สมดุลที่สุดครับ แต่มีเหตุผลที่คุณอาจจะขยับไปใช้ Bun ได้เช่นกัน

### 1. ทำไม pnpm ถึงเหมาะกับโปรเจ็กต์นี้ที่สุด?

- **Prisma 7 & Next.js 16 Compatibility:** ทั้ง Prisma และ Next.js มีการทำงานร่วมกับ Node.js runtime ที่เสถียรมาก pnpm ช่วยให้การจัดการ node_modules สะอาดและลดปัญหาเรื่อง Version conflict ของ Type definitions ใน AI SDK ต่างๆ ได้ดีกว่า npm

- **ความเร็วที่ไว้ใจได้:** pnpm ติดตั้ง package เร็วใกล้เคียงกับ Bun แต่ให้ความมั่นใจเรื่อง "ความถูกต้อง" ของ dependency (Strict mode) ซึ่งสำคัญมากเมื่อคุณมี library หลายตัวที่ทำงานร่วมกัน เช่น better-auth, openai, และ prisma

- **ความปลอดภัยของ Monorepo:** หากในอนาคตคุณขยายโปรเจ็กต์ไปทำ Worker แยกสำหรับประมวลผล Vector, pnpm จัดการโครงสร้างแบบ Monorepo ได้ดีที่สุด

### 2. เมื่อไหร่ที่ควรเลือก Bun?
- **เน้นความเร็วในการพัฒนา (DX):** ถ้าคุณหงุดหงิดกับการรอ next dev หรือ prisma generate นานๆ Bun จะช่วยให้ทุกอย่างเร็วขึ้นอย่างเห็นได้ชัด
- **ไฟล์ขนาดใหญ่ (pdf-parse / csv-parse):** ใน package.json ของคุณมีการประมวลผลไฟล์ (PDF, CSV) หากคุณรันบน Bun Runtime โดยตรง มันจะประมวลผล I/O เหล่านี้ได้เร็วกว่า Node.js
- **ข้อควรระวัง:** Prisma V.7 รองรับ Bun ได้ดีขึ้นมากแล้ว แต่คุณควรทดสอบเรื่อง Connection Pooling กับ PostgreSQL/pgVector ให้ดี เพราะบางครั้ง Bun’s HTTP stack อาจมีพฤติกรรมต่างจาก Node.js เล็กน้อยในระดับ Low-level

### 3. ส่วน npm?
- **ไม่แนะนำ:** สำหรับปี 2026 และโปรเจ็กต์ AI ที่ต้องการความคล่องตัวสูง npm เริ่มช้าเกินไปและจัดการพื้นที่ดิสก์ได้ไม่ดีเท่าสองตัวบน

### สรุปคำแนะนำ:
- **ถ้าเน้นความชัวร์ (Production Ready):** ใช้ pnpm (รันบน Node.js)
- **ถ้าเน้นความเร็วสะใจและลองเทคโนโลยีใหม่:** ใช้ Bun (รันทั้ง Runtime และ Package Manager)
- **ทางสายกลาง:** ใช้ Bun สำหรับการติดตั้ง package (bun install) เพื่อความเร็ว แต่รันโปรเจ็กต์ด้วย Node.js เพื่อความเสถียรของ Prisma และ Next.js ครับ

### ขั้นตอนการย้ายจาก npm ไป pnpm ทำได้ง่ายๆ ดังนี้
#### 1. เตรียมเครื่อง Development
ติดตั้ง pnpm ในเครื่องที่คุณใช้เขียนโค้ดก่อน:
```bash
npm install -g pnpm
```
#### 2. แปลงไฟล์ Lockfile (หัวใจสำคัญ)
แทนที่จะลบแล้วลงใหม่เฉยๆ ให้ใช้คำสั่ง import เพื่อรักษาเวอร์ชันของ library เดิมที่เคย Test แล้วว่าเวิร์ก:
```bash
pnpm import
```
> คำสั่งนี้จะอ่าน package-lock.json แล้วสร้าง pnpm-lock.yaml ให้คุณโดยอัตโนมัติ

#### 3. Cleanup ของเก่า
ลบไฟล์และโฟลเดอร์ที่ไม่จำเป็นออก:
```bash
rm -rf node_modules package-lock.json
```

#### 4. ติดตั้งใหม่ด้วย pnpm
เพื่อให้แน่ใจว่าทุกอย่างถูกต้องและ Prisma Generate ทำงานครบถ้วน:
```bash
pnpm install
pnpm prisma generate
# หรือ
pnpx prisma generate
```

#### 5. ทดสอบรันแอปด้วย:
```bash
pnpm dev
```

### Section 6: Basic Next.js RestAPI

ก่อนที่จะเชื่อมต่อ Better Auth มาทำความเข้าใจพื้นฐาน REST API ใน Next.js 16 กันก่อน

#### 6.1 Route Handlers คืออะไร?

Next.js App Router ใช้ **Route Handlers** สำหรับสร้าง API โดยสร้างไฟล์ `route.ts` ภายในโฟลเดอร์ `app/api/`

```
app/
├── api/
│   ├── hello/
│   │   └── route.ts          ← GET /api/hello
│   ├── users/
│   │   └── route.ts          ← GET, POST /api/users
│   └── users/[id]/
│       └── route.ts          ← GET, PUT, DELETE /api/users/:id
```

#### 6.2 HTTP Methods

Route Handler รองรับ HTTP Methods ต่อไปนี้:

| Method | หน้าที่ | ตัวอย่างการใช้งาน |
|--------|---------|------------------|
| `GET` | ดึงข้อมูล | แสดงรายการสินค้า, ข้อมูล user |
| `POST` | สร้างข้อมูลใหม่ | สมัครสมาชิก, เพิ่มสินค้า |
| `PUT` | อัพเดตทั้งหมด | แก้ไขข้อมูลทั้ง record |
| `PATCH` | อัพเดตบางส่วน | แก้ไขเฉพาะ field |
| `DELETE` | ลบข้อมูล | ลบสินค้า, ยกเลิกบัญชี |

#### 6.3 ตัวอย่าง: GET API

สร้างไฟล์ `app/api/hello/route.ts`:

```typescript
import { NextResponse } from "next/server"

export async function GET() {
    return NextResponse.json({
        message: "Hello from Next.js API!",
        timestamp: new Date().toISOString(),
    })
}
```

**ทดสอบ:** เปิด browser แล้วไปที่ http://localhost:3000/api/hello

#### 6.4 ตัวอย่าง: POST API พร้อม Request Body

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"

// GET /api/users
export async function GET() {
    // ตัวอย่าง: ดึงข้อมูลจาก Prisma
    // const users = await prisma.user.findMany()
    return NextResponse.json({
        users: [
            { id: 1, name: "John", email: "john@example.com" },
            { id: 2, name: "Jane", email: "jane@example.com" },
        ],
    })
}

// POST /api/users
export async function POST(request: NextRequest) {
    const body = await request.json()
    const { name, email } = body

    if (!name || !email) {
        return NextResponse.json(
            { error: "Name and email are required" },
            { status: 400 }
        )
    }

    // ตัวอย่าง: สร้าง user ใน Prisma
    // const user = await prisma.user.create({ data: { name, email } })
    return NextResponse.json(
        { message: "User created", user: { name, email } },
        { status: 201 }
    )
}
```
> ทดสอบด้วย Postman หรือ `curl`:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

#### 6.5 Dynamic Route Parameters

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"

// GET /api/users/:id
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    // ตัวอย่าง: ดึง user จาก Prisma
    // const user = await prisma.user.findUnique({ where: { id } })
    return NextResponse.json({
        user: { id, name: "John Doe", email: "john@example.com" },
    })
}

// DELETE /api/users/:id
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    // ตัวอย่าง: ลบ user ใน Prisma
    // await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: `User ${id} deleted` })
}
```

> **สำคัญ (Next.js 16):** `params` เป็น `Promise` ต้องใช้ `await` คำสั่ง `await params` ก่อนเข้าถึงค่า (`const { id } = await params`)

#### 6.6 Query Parameters & Headers

```typescript
// ตัวอย่างการอ่าน Query Parameters
// GET /api/users?page=1&limit=10
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"

    return NextResponse.json({
        page: parseInt(page),
        limit: parseInt(limit),
        data: [],
    })
}
```

#### 6.7 Catch-all Routes

Route Handler พิเศษที่จับทุก path ที่ขึ้นต้นด้วย prefix ที่กำหนด:

```typescript
// app/api/auth/[...all]/route.ts
// จับทุก request: /api/auth/signin, /api/auth/callback/google, etc.
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { POST, GET } = toNextJsHandler(auth)
```

> **นี่คือ pattern ที่ Better Auth ใช้!** ไฟล์ `[...all]/route.ts` จะรับ request ทั้งหมดที่เริ่มต้นด้วย `/api/auth/` และส่งต่อให้ Better Auth จัดการ

#### 6.8 ทดสอบ API ด้วย Postman

ใช้ Postman ทดสอบ API ที่สร้าง:

| Method | URL | Body (JSON) | Expected Status |
|--------|-----|------------|----------------|
| GET | `http://localhost:3000/api/hello` | - | 200 |
| GET | `http://localhost:3000/api/users` | - | 200 |
| POST | `http://localhost:3000/api/users` | `{"name":"John","email":"john@example.com"}` | 201 |
| GET | `http://localhost:3000/api/users/1` | - | 200 |
| DELETE | `http://localhost:3000/api/users/1` | - | 200 |

> **Tips:** สามารถใช้ `curl` ใน terminal แทน Postman ได้:
> ```bash
> curl -X POST http://localhost:3000/api/users \
>   -H "Content-Type: application/json" \
>   -d '{"name":"John","email":"john@example.com"}'
> ```
---

### Section 7: Better Auth Integration

#### 7.1 ติดตั้ง Dependencies ที่จำเป็น สำหรับ Better Auth
```bash
pnpm install better-auth
# หรือระบุเวอร์ชัน
pnpm install better-auth@^1.5.5
```

#### 7.2 ตั้งค่า Better Auth ฝั่ง Server 
สร้างไฟล์ `lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [admin()],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
})
```

> **จุดสังเกตุ:**
> - ใช้ `admin()` plugin จาก Better Auth สำหรับจัดการ role, ban/unban users
> - `session.expiresIn` กำหนด session หมดอายุใน 7 วัน
> - `session.updateAge` อัพเดต session ทุก 24 ชั่วโมง

#### 7.3 สร้าง API Route Handler

สร้างไฟล์ `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { POST, GET } = toNextJsHandler(auth)
```

> **อธิบาย:** ไฟล์นี้เป็น catch-all route ที่จะรับ request ทั้งหมดที่เริ่มต้นด้วย `/api/auth/` และส่งต่อให้ Better Auth จัดการ

#### 7.4 ตั้งค่า Client Helper

สร้างไฟล์ `lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
})

export const {
    signIn,
    signUp,
    signOut,
    useSession,
} = authClient
```
> **อธิบาย:** `createAuthClient` สร้าง client helper สำหรับเรียก API ของ Better Auth จากฝั่ง client (เช่น signIn, signUp, signOut, useSession)


#### 7.5 อัพเดท LoginForm
แก้ไขไฟล์ `app/(auth)/auth/signin/LoginForm.tsx`:

```tsx
... (imports เดิม)
import { signIn } from "@/lib/auth-client"
...
try {
    const result = await signIn.email({
        email,
        password,
    });

    if (result.error) {
        if(result.error.message === "Invalid email or password") {
            setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        } else {
            setError(result.error.message || "เข้าสู่ระบบไม่สำเร็จ")
        }
    } else {
        router.push("/dashboard");
    }

} catch {
    setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
} finally {
    setIsLoading(false)
}
...
```

#### 7.6 อัพเดท SignUpForm
แก้ไขไฟล์ `app/(auth)/auth/signup/SignUpForm.tsx`
```tsx
... (imports เดิม)
import { signUp } from "@/lib/auth-client"
...
try {
    const result = await signUp.email({
        name,
        email,
        password,
    });

    if (result.error) {
        setError(result.error.message || "สมัครสมาชิกไม่สำเร็จ");
    } else {
        router.push("/dashboard");
    }
} catch {
    setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
} finally {
    setIsLoading(false);
}
...
```

#### 7.7 อัพเดท DashboardContent เพื่อแสดงข้อมูล user และปุ่ม sign out:
แก้ไขไฟล์ `app/(main)/dashboard/DashboardContent.tsx`:
ใน Next.js คุณสามารถเช็ค Session ได้โดยตรงในหน้า Page:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Bot, Database, Sparkles } from "lucide-react"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export default async function DashboardContent() {
    
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        return null
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
                        <a href="/knowledge" className="text-purple-500 dark:text-purple-400 underline">
                            Knowledge Base
                        </a>{" "}
                        หรือทดสอบ{" "}
                        <a href="/chat" className="text-purple-500 dark:text-purple-400 underline">
                            AI Chat
                        </a>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
```

#### 7.8 อัพเดท SignOutButton ให้เรียกใช้ `signOut` จาก auth-client:
แก้ไขไฟล์ `app/(main)/dashboard/SignOutButton.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SignOutButton() {
    const router = useRouter()

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
                await signOut()
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

#### 7.9 สร้าง UserMenu Component สำหรับแสดงข้อมูล user และปุ่ม sign out ใน Navbar
สร้างไฟล์ `app/(main)/_components/header/UserMenu.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import Image from "next/image"
import Link from "next/link"

export default function UserMenu() {
    const { data: session, isPending } = useSession()
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // ปิด dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // กำลังโหลด Session
    if (isPending) {
        return <div className="animate-pulse w-9 h-9 bg-gray-200 rounded-full" />
    }

    // ยังไม่ได้ Login
    if (!session) {
        return null
    }

    // สร้าง Avatar Initials จากชื่อผู้ใช้
    const initials = (session.user?.name || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="relative" ref={menuRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 rounded-full hover:bg-gray-100 transition pl-3 pr-1.5 py-1.5"
            >
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {session.user?.name}
                </span>

                {session.user?.image ? (
                    <Image
                        src={session.user.image}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full ring-2 ring-gray-100"
                        width={36}
                        height={36}
                    />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-2 ring-purple-100">
                        <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                )}

                {/* Chevron */}
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{session.user?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{session.user?.email}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                            {(session.user as { role?: string })?.role?.toUpperCase() || "USER"}
                        </span>
                    </div>

                    {/* Profile Link */}
                    <div className="px-2 pt-2">
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            โปรไฟล์ของฉัน
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="px-2 pt-1 pb-1">
                        <button
                            onClick={async () => {
                                await signOut({
                                    fetchOptions: {
                                        onSuccess: () => {
                                            window.location.href = "/auth/signin"
                                        },
                                    },
                                })
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
```

#### 7.10 อัพเดท Layout ให้แสดงข้อมูล user และปุ่ม sign out ในทุกหน้า (ถ้าล็อกอินอยู่)
แก้ไขไฟล์ `app/(main)/layout.tsx`:

```tsx
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import UserMenu from "./UserMenu"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    // ถ้าไม่ได้ Login → Redirect ไปหน้า Login
    if (!session) {
        redirect("/auth/signin")
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Fixed Top Navbar */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left: Logo + Nav */}
                        <div className="flex items-center gap-8">
                            {/* Logo */}
                            <Link href="/dashboard" className="flex items-center gap-2.5 group">
                                <div className="w-9 h-9 bg-linear-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20 group-hover:shadow-purple-600/40 transition">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100 hidden sm:block">
                                    AI Native<span className="text-purple-600 dark:text-purple-400"> App</span>
                                </span>
                            </Link>

                            {/* Navigation */}
                            <nav className="flex items-center gap-1">
                                <NavLink href="/dashboard" icon="📊">Dashboard</NavLink>
                            </nav>
                        </div>

                        {/* Right: User Menu */}
                        <UserMenu />
                    </div>
                </div>
            </header>

            {/* Main Content (with top padding for fixed header) */}
            <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">{children}</main>
        </div>
    )
}

// Nav Link Component
function NavLink({
    href,
    icon,
    children,
}: {
    href: string
    icon: string
    children: React.ReactNode
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition"
        >
            <span className="text-base">{icon}</span>
            <span className="hidden sm:inline">{children}</span>
        </Link>
    )
}
```

#### 7.11 แยก `themeStore` ออกมาเป็น shared module ให้ทั้ง Navbar และ UserMenu ใช้ร่วมกัน
สร้างไฟล์ `lib/theme-store.ts`:

```typescript
// Shared theme store for managing dark mode across the app
// Uses useSyncExternalStore pattern for React 18+ compatibility

export const themeStore = {
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
```
> **อธิบาย:** `themeStore` เป็น shared module สำหรับจัดการ dark mode ในแอป ใช้ `useSyncExternalStore` pattern เพื่อให้ React รู้ว่าเมื่อไหร่ที่ theme เปลี่ยนแปลง และสามารถเรียกใช้ `setTheme` จากทุกที่ในแอปได้

#### 7.12 อัพเดท UserMenu ให้ใช้ `themeStore` แทนการจัดการ theme เอง
แก้ไขไฟล์ `app/(main)/_components/header/UserMenu.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { themeStore } from "@/lib/theme-store"
import Image from "next/image"
import Link from "next/link"

export default function UserMenu() {
    const { data: session, isPending } = useSession()
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Dark mode
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

    // ปิด dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // กำลังโหลด Session
    if (isPending) {
        return <div className="animate-pulse w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
    }

    // ยังไม่ได้ Login
    if (!session) {
        return null
    }

    // สร้าง Avatar Initials จากชื่อผู้ใช้
    const initials = (session.user?.name || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="relative flex items-center gap-2" ref={menuRef}>
            {/* Theme Toggle Button */}
            <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
                aria-label="Toggle theme"
            >
                {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>

            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition pl-3 pr-1.5 py-1.5"
            >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
                    {session.user?.name}
                </span>

                {session.user?.image ? (
                    <Image
                        src={session.user.image}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full ring-2 ring-gray-100 dark:ring-gray-700"
                        width={36}
                        height={36}
                    />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-2 ring-purple-100 dark:ring-purple-900">
                        <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                )}

                {/* Chevron */}
                <svg
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{session.user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{session.user?.email}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            {(session.user as { role?: string })?.role?.toUpperCase() || "USER"}
                        </span>
                    </div>

                    {/* Profile Link */}
                    <div className="px-2 pt-2">
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            โปรไฟล์ของฉัน
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="px-2 pt-1 pb-1">
                        <button
                            onClick={async () => {
                                await signOut({
                                    fetchOptions: {
                                        onSuccess: () => {
                                            window.location.href = "/auth/signin"
                                        },
                                    },
                                })
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
```
> **อธิบาย:** ใน `UserMenu` เราใช้ `useSyncExternalStore` เพื่อ subscribe กับ `themeStore` และอัพเดท UI เมื่อ theme เปลี่ยนแปลง นอกจากนี้ยังมีปุ่ม toggle สำหรับสลับระหว่าง dark mode และ light mode ได้อย่างง่ายดาย

#### 7.13 อัพเดท Navbar ให้ใช้ `themeStore` แทนการจัดการ theme เอง
แก้ไขไฟล์ `app/(landing)/Navbar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { themeStore } from "@/lib/theme-store"

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
> **อธิบาย:** ใน `Navbar` เราใช้ `useSyncExternalStore` เพื่อ subscribe กับ `themeStore` และอัพเดท UI เมื่อ theme เปลี่ยนแปลง นอกจากนี้ยังมีปุ่ม toggle สำหรับสลับระหว่าง dark mode และ light mode ได้อย่างง่ายดาย

#### 7.14 อัพเดท Root Layout
แก้ไขไฟล์ `app/layout.tsx`:

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
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var t = localStorage.getItem('theme');
                                    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                        document.documentElement.classList.add('dark');
                                    }
                                } catch(e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className={`${inter.variable} ${anuphan.variable} font-sans antialiased`}>
                {children}
            </body>
        </html>
    )
}
```
**อธิบาย:* ใน `RootLayout` เราเพิ่ม script ที่จะรันก่อนที่ React จะ hydrate เพื่อเช็ค theme ที่ผู้ใช้ตั้งค่าไว้ใน localStorage และปรับ class ของ document ตามนั้น เพื่อให้แน่ใจว่า theme ถูกต้องตั้งแต่แรกโหลดหน้า และไม่มีปัญหา FOUC (Flash of Unstyled Content)


---

### สรุป Day 3

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Dashboard Layout** | สร้างหน้า Dashboard ที่แสดงข้อมูลสถิติพื้นฐานและลิงก์ด่วนไปยังฟีเจอร์ต่างๆ |
| **UserMenu Component** | สร้างเมนูสำหรับแสดงข้อมูลผู้ใช้และปุ่มสำหรับเข้าสู่ระบบและออกจากระบบ |
| **Theme Management** | สร้างระบบจัดการธีม (dark mode/light mode) ที่สามารถใช้ร่วมกันได้ทั่วทั้งแอป |
| **Root Layout** | อัพเดท Root Layout เพื่อให้รองรับการตั้งค่า theme และป้องกันปัญหา FOUC |
