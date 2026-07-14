## Next.js 16: The AI-Native Developer Masterclass - Day 5

10. [Section 10: Role-Based Access Control (RBAC)](#section-10-role-based-access-control-rbac)
    - Role-based Access Control (Admin/User)
    - Better Auth Admin Plugin APIs
    - สร้าง Seed Script สำหรับ Admin เริ่มต้น
    - สร้าง Custom API Route สำหรับเปลี่ยน Role
    - ตรวจสอบสิทธิ์ใน Server Component
    - สรุป Better Auth Admin Plugin APIs
    - ทดสอบ RBAC ด้วย curl
    - Access Control ของ Better Auth
    - การออกแบบระบบ Access Control ด้วย Better Auth
    - Global Impersonation Banner
    - Update User Profile

11. [Section 11: Multi-Factor Authentication (MFA) & Email Features](#section-11-multi-factor-authentication-mfa--email-features)
    - อัปเดต Prisma Schema สำหรับ 2FA และ Email Verification
    - ตั้งค่า Two-Factor Plugin (Server & Client)
    - เพิ่ม TOTP UI ในหน้า Profile
    - สร้างหน้า Verify 2FA (Sign-in Flow)
    - Verify Email ผ่าน Gmail (Email Provider)
    - สร้างหน้า Verify Email
    - Forgot Password ผ่าน Gmail
    - สร้างหน้า Forgot Password
    - สร้างหน้า Reset Password

🎁 [Bonus: Audit Log — แนวคิดและโครงสร้างสำหรับต่อยอด](#bonus-audit-log--แนวคิดและโครงสร้างสำหรับต่อยอด)

### Section 10: Role-Based Access Control (RBAC)

#### 10.1 ทำความเข้าใจ Better Auth Admin Plugin

Better Auth มี **Admin Plugin** ในตัว (`better-auth/plugins`) ที่จัดการ RBAC ให้ครบวงจร:

| ฟีเจอร์ | API Endpoint | คำอธิบาย |
|---------|-------------|----------|
| สร้าง User | `POST /api/auth/admin/create-user` | Admin สร้าง user ใหม่พร้อมกำหนด role |
| ดู Users ทั้งหมด | `GET /api/auth/admin/list-users` | แสดงรายการ user พร้อม pagination |
| เปลี่ยน Role | `POST /api/auth/admin/set-role` | เปลี่ยน role ของ user |
| Ban/Unban | `POST /api/auth/admin/ban-user` | แบน/ปลดแบน user |
| Impersonate | `POST /api/auth/admin/impersonate-user` | เข้าใช้งานในนามของ user อื่น |
| ลบ User | `POST /api/auth/admin/remove-user` | ลบ user ออกจากระบบ |

**Roles เริ่มต้น:**
- `admin` — ควบคุมทุกอย่างได้
- `user` — ไม่มีสิทธิ์จัดการ user อื่น

**Schema ที่ต้องมี (เราตั้งค่าไว้แล้วใน Prisma):**
- `user` table: `role`, `banned`, `banReason`, `banExpires`
- `session` table: `impersonatedBy` (สำหรับ impersonate feature)

#### 10.2 ตรวจสอบ Server Config (`lib/auth.ts`)

ไฟล์ `lib/auth.ts` ของเราได้เพิ่ม `admin()` plugin ไว้แล้ว:

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

> **หมายเหตุ:** `admin()` plugin จะเปิด API endpoints ทั้งหมดที่อยู่ภายใต้ `/api/auth/admin/...` ให้อัตโนมัติ

#### 10.3 เพิ่ม Admin Client Plugin (`lib/auth-client.ts`)

เพื่อให้ฝั่ง Client เรียกใช้ API ของ admin ได้ ต้องเพิ่ม `adminClient` plugin:

```typescript
import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
    plugins: [adminClient()],
})

export const {
    signIn,
    signUp,
    signOut,
    useSession,
} = authClient
```

หลังจากเพิ่ม `adminClient()` แล้ว สามารถเรียกใช้ผ่าน `authClient.admin.*` ได้:

```typescript
// ตัวอย่างการใช้งานฝั่ง Client
await authClient.admin.listUsers({ query: { limit: 10 } })
await authClient.admin.setRole({ userId: "xxx", role: "admin" })
await authClient.admin.banUser({ userId: "xxx", banReason: "Spam" })
await authClient.admin.createUser({ email: "...", password: "...", name: "...", role: "user" })
```

#### 10.4 สร้าง Seed Script — ตั้งค่า Admin เริ่มต้น

ขั้นตอนนี้สำคัญมาก: ระบบ RBAC ต้องมี Admin คนแรกเพื่อจัดการ user อื่นได้

**ขั้นตอน:**
1. สมัครสมาชิกปกติผ่านหน้า `/auth/signup`
2. เพิ่ม `ADMIN_EMAIL` ใน `.env`:
   ```
   ADMIN_EMAIL="admin@ainative.com"
   ```
3. รัน seed script เพื่ออัปเดต role เป็น admin

**สร้างไฟล์ `prisma/seed.ts`:**

```typescript
// Seed script: สร้าง Admin เริ่มต้น
// ใช้: pnpx tsx --env-file=.env prisma/seed.ts

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"

const connectionString = process.env.DATABASE_URL!

async function main() {
    const adapter = new PrismaPg({ connectionString })
    const prisma = new PrismaClient({ adapter })

    const adminEmail = process.env.ADMIN_EMAIL || "admin@ainative.com"

    console.log(`\n🔍 Looking for user with email: ${adminEmail}`)

    // ค้นหา user ที่มีอีเมลตรงกัน
    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
    })

    if (existingUser) {
        // ถ้า user มีอยู่แล้ว → อัปเดต role เป็น admin
        if (existingUser.role === "admin") {
            console.log(`✅ User "${existingUser.name}" is already an admin.`)
        } else {
            const updated = await prisma.user.update({
                where: { email: adminEmail },
                data: { role: "admin" },
            })
            console.log(`✅ Updated "${updated.name}" (${updated.email}) role to "admin"`)
        }
    } else {
        console.log(`⚠️  No user found with email: ${adminEmail}`)
        console.log(``)
        console.log(`   Please do one of the following:`)
        console.log(`   1. Sign up at http://localhost:3000/auth/signup with this email`)
        console.log(`   2. Or set ADMIN_EMAIL in .env to an existing user's email`)
        console.log(`   Then run this seed script again: npx tsx prisma/seed.ts`)
    }

    await prisma.$disconnect()
}

main().catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
})
```

**วิธีรัน:**

```bash
# รัน seed script
pnpx tsx --env-file=.env prisma/seed.ts
```

#### 10.5 สร้าง Admin API Route (Custom) สำหรับเปลี่ยน Role

นอกจาก Better Auth จะมี `/api/auth/admin/set-role` ให้แล้ว เราสามารถสร้าง custom route เพิ่มเพื่อ validation เพิ่มเติมได้:

สร้างไฟล์ `app/api/admin/change-role/route.ts`:

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    // 1. ตรวจสอบว่าผู้ใช้ล็อกอินอยู่
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. ตรวจสอบว่าเป็น Admin
    if (session.user.role !== "admin") {
        return NextResponse.json(
            { error: "Forbidden: Admin access required" },
            { status: 403 }
        )
    }

    // 3. อ่านข้อมูลจาก request body
    const { userId, newRole } = await request.json()

    if (!userId || !newRole) {
        return NextResponse.json(
            { error: "Missing userId or newRole" },
            { status: 400 }
        )
    }

    // 4. ตรวจสอบว่า role ที่ส่งมาถูกต้อง
    const validRoles = ["user", "manager", "admin"]
    if (!validRoles.includes(newRole)) {
        return NextResponse.json(
            { error: "Invalid role. Must be 'user', 'manager', or 'admin'" },
            { status: 400 }
        )
    }

    // 5. อัปเดต role ใน database
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: newRole },
        })

        return NextResponse.json({
            message: `Role updated to ${newRole}`,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
            },
        })
    } catch {
        return NextResponse.json(
            { error: "User not found or update failed" },
            { status: 404 }
        )
    }
}
```

#### 10.6 การตรวจสอบสิทธิ์ใน Server Component

```tsx
// ตัวอย่างหน้า Admin Only
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function AdminPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard") // redirect กลับไป Dashboard ถ้าไม่ใช่ Admin
    }

    return (
        <div>
            <h1>Admin Panel</h1>
            <p>Welcome, {session.user.name} (Admin)</p>
        </div>
    )
}
```

#### 10.7 สรุป Better Auth Admin Plugin APIs

| Method | Endpoint | Client Function | คำอธิบาย |
|--------|----------|-----------------|----------|
| POST | `/api/auth/admin/create-user` | `authClient.admin.createUser()` | สร้าง user ใหม่ |
| GET | `/api/auth/admin/list-users` | `authClient.admin.listUsers()` | ดู users ทั้งหมด (pagination) |
| POST | `/api/auth/admin/update-user` | `authClient.admin.updateUser()` | อัปเดตข้อมูล user (ชื่อ ฯลฯ) |
| POST | `/api/auth/admin/set-role` | `authClient.admin.setRole()` | เปลี่ยน role |
| POST | `/api/auth/admin/ban-user` | `authClient.admin.banUser()` | แบน user |
| POST | `/api/auth/admin/unban-user` | `authClient.admin.unbanUser()` | ปลดแบน user |
| POST | `/api/auth/admin/impersonate-user` | `authClient.admin.impersonateUser()` | เข้าใช้ในนาม user อื่น |
| POST | `/api/auth/admin/stop-impersonating` | `authClient.admin.stopImpersonating()` | หยุด impersonate |
| POST | `/api/auth/admin/remove-user` | `authClient.admin.removeUser()` | ลบ user |
| POST | `/api/auth/admin/set-user-password` | `authClient.admin.setUserPassword()` | เปลี่ยนรหัสผ่าน user |

> **ข้อสังเกต:**  
> - ทุก Admin API ต้อง login เป็น user ที่มี `role: "admin"` ก่อนถึงจะเรียกได้  
> - ถ้า role ไม่ใช่ admin จะได้ `403 Forbidden`  
> - เมื่อเรียกผ่าน `curl` ต้องส่ง `Origin` header เสมอ (Browser ส่งให้อัตโนมัติ)

#### 10.8 ทดสอบ RBAC ด้วย curl

> ติดตั้ง jq สำหรับอ่าน JSON ใน terminal:
```bash
# สำหรับ macOS
brew install jq

# สำหรับ Ubuntu/Debian
sudo apt install jq

# สำหรับ Windows (ผ่าน winget)
winget install jqlang.jq
```

> ⚠️ **สำคัญ:** ทุก curl command ที่เรียก Better Auth API ต้องเพิ่ม **`Origin` header** ด้วย
> เพราะ Better Auth บังคับตรวจสอบ Origin เพื่อป้องกัน CSRF attack
> ถ้าไม่ส่ง จะได้ error: `{"code":"MISSING_OR_NULL_ORIGIN","message":"Missing or null Origin"}`

**ทดสอบ list users (ต้อง login เป็น admin ก่อน):**

```bash
# 1. Login เพื่อเอา cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"email\":\"admin@ainative.com\",\"password\":\"your-password\"}"

# 2. List users (ใช้ cookie ที่ได้)
curl -b cookies.txt \
  -H "Origin: http://localhost:3000" \
  http://localhost:3000/api/auth/admin/list-users | jq

# 3. เปลี่ยน role (ผ่าน Better Auth built-in API)
curl -b cookies.txt -X POST http://localhost:3000/api/auth/admin/set-role \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"userId\":\"TARGET_USER_ID\",\"role\":\"admin\"}"

# 4. เปลี่ยน role (ผ่าน custom API — ไม่ต้องมี Origin เพราะเป็น Next.js Route Handler ไม่ใช่ Better Auth)
curl -b cookies.txt -X POST http://localhost:3000/api/admin/change-role \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"TARGET_USER_ID\",\"newRole\":\"admin\"}"

# 5. Ban user
curl -b cookies.txt -X POST http://localhost:3000/api/auth/admin/ban-user \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"userId\":\"TARGET_USER_ID\",\"banReason\":\"Spam\",\"banExpiresIn\":3600}"

# 6. Unban user
curl -b cookies.txt -X POST http://localhost:3000/api/auth/admin/unban-user \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"userId\":\"TARGET_USER_ID\"}"

# 7. Remove user
curl -b cookies.txt -X POST http://localhost:3000/api/auth/admin/remove-user \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"userId\":\"TARGET_USER_ID\"}"

# 8. Set user password
curl -b cookies.txt -X POST http://localhost:3000/api/auth/admin/set-user-password \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "{\"userId\":\"TARGET_USER_ID\",\"newPassword\":\"new-secure-password\"}"
```

> **หมายเหตุ Windows CMD/PowerShell:**
> - **CMD:** ใช้ `\"` สำหรับ escape double-quotes ใน JSON (เหมือนตัวอย่างด้านบน)
> - **PowerShell:** ใช้ `Invoke-RestMethod` หรือ escape ด้วย backtick `` ` ``
> - แนะนำใช้ **Git Bash** หรือ **WSL** เพื่อให้ใช้ curl ได้เหมือน Linux/macOS

#### 10.9 Access Control ของ Better Auth

Access Control ในระบบของ Better Auth คือระบบควบคุมสิทธิ์การเข้าถึงที่ช่วยให้คุณจัดการได้ว่า ผู้ใช้คนไหนสามารถทำอะไรในระบบได้บ้าง โดยอ้างอิงจาก Role (บทบาท) ที่พวกเขาถืออยู่ เช่น `admin` หรือ `user` ซึ่งแต่ละ Role จะมีสิทธิ์ที่แตกต่างกันไปตามที่คุณกำหนดไว้ในระบบ RBAC (Role-Based Access Control) ของ Better Auth 

#### Access Control มีไว้เพื่ออะไร ?

มีไว้เพื่อบริหารจัดการความปลอดภัยและกำหนดขอบเขตการใช้งานของผู้ใช้แต่ละกลุ่ม เช่น:
- **จัดการสิทธิ์ตามบทบาท:** เพื่อระบุว่ากลุ่มผู้ใช้ เช่น admin หรือ user มีสิทธิ์เข้าถึงทรัพยากร (Resources) ต่างกัน.
- **ป้องกันการเข้าถึงที่ไม่ได้รับอนุญาต:** เช่น ป้องกันไม่ให้ผู้ใช้ทั่วไป (user) ลบข้อมูลผู้ใช้คนอื่น หรือเปลี่ยนรหัสผ่านของผู้อื่น
- **ความยืดหยุ่นในการขยายระบบ:** คุณสามารถสร้างบทบาทใหม่ ๆ (Custom Roles) ที่มีชุดสิทธิ์เฉพาะตัวตามความต้องการของธุรกิจได้

#### Access Control ทำหน้าที่อย่างไร ?
ระบบนี้ทำงานผ่านองค์ประกอบหลัก 3 ส่วน ดังนี้:

1. **การกำหนด Role และ Permission (การตั้งกฎ):**
คุณต้องสร้าง **Access Controller** เพื่อกำหนดว่าในระบบมีทรัพยากร (Resource) อะไรบ้าง และแต่ละทรัพยากรทำอะไร (Action) ได้บ้าง:
   - **Statement:** คือการประกาศชุดสิทธิ์ เช่น `project` สามารถทำ `create`, `share`, `update`, `delete` ได้
    - **Role:** คือการนำสิทธิ์เหล่านั้นมามอบให้บทบาทต่าง ๆ  เช่น `user` อาจได้สิทธิ์แค่ `create` ในขณะที่ `admin` ได้สิทธิ์ทั้ง `create` และ `update`

2. **การเชื่อมต่อกับระบบ (Integration):**
เมื่อกำหนดสิทธิ์เสร็จแล้ว คุณต้องส่งค่าบทบาทเหล่านั้นเข้าไปใน Admin Plugin ทั้งฝั่ง Server และ Client:
    - **Server:** ใช้ตรวจสอบสิทธิ์ก่อนทำรายการผ่าน API ใน `lib/auth.ts` คุณจะต้องเพิ่ม `admin()` plugin เพื่อให้ระบบรู้จักบทบาทและสิทธิ์ที่คุณกำหนด
    - **Client:** ใช้สำหรับควบคุมการแสดงผล UI เช่น ซ่อนปุ่ม "ลบ" หากผู้ใช้ไม่มีสิทธิ์ ใน `lib/auth-client.ts` คุณต้องเพิ่ม `adminClient()` plugin เพื่อให้สามารถเรียกใช้ API ที่เกี่ยวข้องกับการจัดการผู้ใช้และบทบาทได้

3. **การตรวจสอบสิทธิ์ (Execution):**
ะบบจะทำหน้าที่ตรวจสอบความถูกต้องผ่านฟังก์ชันต่าง ๆ:
    - **การเช็คจากตัวผู้ใช้** (`hasPermission`): ตรวจสอบว่า `userId` นั้น ๆ มีสิทธิ์ตามที่ระบุหรือไม่
    - **การเช็คจากบทบาท** (`checkRolePermission`): ตรวจสอบว่าบทบาทนั้น ๆ (เช่น `admin`) มีสิทธิ์ทำ Action ที่ต้องการหรือไม่ โดยไม่ต้องติดต่อ Server (ทำงานแบบ Synchronous)

#### 10.10 การออกแบบระบบ Access Control ด้วย Better Auth
การออกแบบระบบ **Access Control** ด้วย **Better Auth** สำหรับ Next.js โดยใช้ Prisma และ PostgreSQL นั้น จะเริ่มต้นจากการนิยามสิทธิ์ (Permissions) และสร้างบทบาท (Roles) ในไฟล์แยกต่างหากเพื่อให้เรียกใช้งานได้ทั้งฝั่ง Server และ Client

กำหนดขั้นตอนการเขียนโค้ดแบ่งตามสิทธิ์:
- **Admin:** มีสิทธิ์เต็มที่ในการจัดการผู้ใช้และบทบาท เช่น สร้างผู้ใช้ใหม่, เปลี่ยนบทบาท, แบนผู้ใช้ และ (Create, Read, Update, Delete)
- **Manager:** เรียกดู (Read), เพิ่ม (Create), แก้ไข (Update) แต่ ลบ (Delete) ไม่ได้ และไม่มีสิทธิ์จัดการผู้ใช้คนอื่น
- **User:** มีสิทธิ์จำกัด เช่น แก้ไขข้อมูลตัวเองได้ (Update) เพิ่ม (Create) และเรียกดู (Read) ได้เท่านั้น

#####  10.10.1 สร้างไฟล์นิยามสิทธิ์ (`lib/permissions.ts`)
เราจะใช้ `createAccessControl` เพื่อกำหนดทรัพยากร (เช่น project หรือ content) และสร้างบทบาททั้ง 3 ระดับ

สร้างไฟล์ `lib/permissions.ts`:

```typescript
import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access"

// 1. กำหนด Actions ที่ทำได้ในระบบ
export const statement = {
    ...defaultStatements, 
    project: ["create", "read", "update", "delete"], 
} as const 

export const ac = createAccessControl(statement) 

// 2. สร้าง Role ตามเงื่อนไขของคุณ
export const user = ac.newRole({ 
    project: ["create", "read"], 
}) 

export const manager = ac.newRole({ 
    project: ["create", "read", "update"], 
}) 

export const admin = ac.newRole({
    project: ["create", "read", "update", "delete"],
    ...adminAc.statements, // ให้สิทธิ์จัดการ User/Session มาตรฐานของ Admin ด้วย
})
```

##### 10.10.2 ตั้งค่าใน Better Auth Server (`lib/auth.ts`)

แก้ไข `lib/auth.ts` เพื่อเพิ่ม Access Control Plugin และส่งค่า Role ที่เราสร้างขึ้นไป:

```typescript
...

import { admin as adminPlugin } from "better-auth/plugins"
import { ac, admin, manager, user } from "@/lib/permissions"

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    ...
    plugins: [
        adminPlugin({
            ac,
            roles: {
                admin,
                manager,
                user
            }
        })
    ],
    ...
})
```

##### 10.10.3 ตั้งค่าที่ Client (`lib/auth-client.ts`)
เพื่อให้ฝั่ง Frontend สามารถเช็คสิทธิ์เพื่อซ่อน/แสดงปุ่มได้ทันที
```typescript
import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { ac, admin, manager, user } from "./permissions"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
    plugins: [
        adminClient({
            ac,
            roles: {
                admin,
                manager,
                user
            }
        })
    ],
})

export const {
    signIn,
    signUp,
    signOut,
    useSession,
} = authClient
```

##### 10.10.4 นำ RBAC ไปใช้กับ Sidebar — จำกัดเมนูตาม Role

เราจะนำ role ของผู้ใช้จาก `useSession()` มากรองเมนู Sidebar ให้แสดงเฉพาะที่ role นั้นมีสิทธิ์เห็น:

| Role | เมนูที่เห็น |
|------|------------|
| `admin` | Dashboard, AI & Data, Management, Admin, Help |
| `manager` | Dashboard, AI & Data, Management, Help |
| `user` | Dashboard, AI & Data, Help |

**ขั้นตอนที่ 1: เพิ่ม `allowedRoles` ใน sidebar-data.ts**

```typescript
// app/(main)/_components/sidebar/sidebar-data.ts
import {
    LayoutDashboard,
    PanelsTopLeft,
    LibraryBig,
    Users,
    Component,
    Settings,
    MessageCircle,
    MessagesSquare,
    HelpCircle,
    ClipboardList,
    type LucideIcon,
} from "lucide-react"

export interface NavItemType {
    title: string
    href: string
    icon: LucideIcon
    badge?: string
}

export interface NavSectionType {
    title?: string
    items: NavItemType[]
    allowedRoles?: string[]  // ถ้าไม่กำหนด = ทุก role เห็น
}

export const sidebarData: NavSectionType[] = [
    {
        // Dashboard — ทุก role เห็น (ไม่มี allowedRoles)
        items: [
            { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        // AI & Data — ทุก role เห็น
        title: "AI & Data",
        items: [
            { title: "Chat", href: "/chat", icon: MessageCircle },
        ],
    },
    {
        // Management — เฉพาะ admin และ manager
        title: "Management",
        items: [
            { title: "Projects", href: "/management/projects", icon: PanelsTopLeft },
            { title: "Teams", href: "/management/teams", icon: Component },
            { title: "Leads", href: "/management/lead", icon: ClipboardList },
        ],
        allowedRoles: ["admin", "manager"],
    },
    {
        // Admin — เฉพาะ admin เท่านั้น
        title: "Admin",
        items: [
            { title: "Users", href: "/admin/users", icon: Users },
            { title: "Knowledge", href: "/admin/knowledge", icon: LibraryBig },
            { title: "LINE Groups", href: "/admin/line-groups", icon: MessagesSquare },
            { title: "Settings", href: "/admin/settings", icon: Settings },
        ],
        allowedRoles: ["admin"],
    },
]

// Help — ทุก role เห็น (bottom nav แยกจาก sidebarData)
export const bottomNavItems: NavItemType[] = [
    { title: "Help", href: "/help", icon: HelpCircle },
]
```

**ขั้นตอนที่ 2: กรอง section ตาม role ใน sidebar.tsx**

```tsx
// app/(main)/_components/sidebar/sidebar.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { PanelLeftClose, PanelLeft, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth-client"
import { sidebarData, bottomNavItems } from "./sidebar-data"
import { NavSection } from "./nav-section"
import { NavItem } from "./nav-item"

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const { data: session } = useSession()
    const userRoles = ((session?.user as { role?: string })?.role || "user").split(",").map((r) => r.trim())

    // กรอง section ตาม role ของผู้ใช้ (รองรับ multi-role)
    const filteredSections = sidebarData.filter(
        (section) => !section.allowedRoles || section.allowedRoles.some((r) => userRoles.includes(r))
    )

    return (
        <aside ...>
            {/* ... header ... */}

            {/* Main Navigation — ใช้ filteredSections แทน sidebarData */}
            <div className="flex-1 overflow-y-auto">
                <div className={cn("py-4", collapsed ? "px-1" : "px-3")}>
                    <div className="space-y-2">
                        {filteredSections.map((section, index) => (
                            <NavSection
                                key={index}
                                section={section}
                                collapsed={collapsed}
                                defaultOpen={true}
                            />
                        ))}
                    </div>

                    {/* Bottom Navigation — ทุก role เห็น */}
                    <div className="mt-6 border-t border-border pt-4">
                        <nav className="space-y-1">
                            {bottomNavItems.map((item) => (
                                <NavItem key={item.href} item={item} collapsed={collapsed} />
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
        </aside>
    )
}
```

**หลักการทำงาน:**
1. `useSession()` ดึง session ปัจจุบันที่มี `user.role` (เก็บเป็น comma-separated string เช่น `"user,manager"`)
2. `userRoles` แยก role string ออกเป็น array เช่น `["user", "manager"]`
3. `filteredSections` กรอง `sidebarData` — ถ้า section ไม่มี `allowedRoles` จะแสดงทุก role, ถ้ามีจะเช็คว่า role ใดก็ตามของผู้ใช้อยู่ใน `allowedRoles` หรือไม่ (ใช้ `.some()`)
4. `bottomNavItems` (Help) ไม่ผ่าน filter จึงแสดงทุก role เสมอ

> **หมายเหตุ:** การซ่อนเมนูฝั่ง UI เป็นเพียง **UI-level protection** เท่านั้น ต้องมี **Server-side protection** (ตรวจ role ใน API Route / Server Component) ด้วยเสมอ เพื่อป้องกันการเข้าถึงผ่าน URL โดยตรง

##### 10.10.5 สร้างหน้าจัดการผู้ใช้ (Admin Only)

> **📌 Multi-Role Support:** Better Auth รองรับการกำหนดหลาย role ให้ผู้ใช้คนเดียว โดยเก็บเป็น comma-separated string เช่น `"user,manager"` 
> ตัวอย่าง: ผู้ใช้คนหนึ่งสามารถเป็นทั้ง `user` และ `manager` พร้อมกันได้ ทำให้เห็นเมนูทั้งของ user และ manager ใน sidebar

สร้างหน้า Admin Users Management ที่ครอบคลุมทุก API ของ Better Auth Admin Plugin:

| ฟีเจอร์ | API ที่ใช้ | UI |
|---------|----------|-----|
| สร้างผู้ใช้ | `authClient.admin.createUser()` | Modal form (ชื่อ, อีเมล, รหัสผ่าน, role) |
| แสดงรายการผู้ใช้ | `authClient.admin.listUsers()` | ตาราง + pagination + ค้นหาด้วยอีเมล |
| แก้ไขข้อมูลผู้ใช้ | `authClient.admin.updateUser()` | Modal แก้ไขชื่อ |
| เปลี่ยน Role | `authClient.admin.setRole()` | Modal เลือก role แบบ checkbox (เลือกได้หลาย role) |
| แบน/ปลดแบน | `authClient.admin.banUser()` / `unbanUser()` | Modal ระบุเหตุผล + ระยะเวลา / ปุ่ม unban ใน dropdown |
| Impersonate | `authClient.admin.impersonateUser()` | เข้าใช้ในนาม user อื่น + banner บอกสถานะ |
| ลบผู้ใช้ | `authClient.admin.removeUser()` | Modal ยืนยันก่อนลบ |
| เปลี่ยนรหัสผ่าน | `authClient.admin.setUserPassword()` | Modal กรอกรหัสผ่านใหม่ |

**โครงสร้างไฟล์:**

```
app/(main)/admin/users/
├── page.tsx              ← Server Component (ตรวจ admin role → redirect)
└── UsersManagement.tsx   ← Client Component (UI ทั้งหมด)
```

**ขั้นตอนที่ 1: สร้าง Server Page พร้อม Role Guard**

สร้างไฟล์ `app/(main)/admin/users/page.tsx`:

```tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import UsersManagement from "./UsersManagement"

export const metadata = {
    title: "User Management | Admin",
}

export default async function AdminUsersPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    // ถ้าไม่ใช่ Admin → redirect กลับ Dashboard (รองรับ multi-role)
    if (!session) {
        redirect("/dashboard")
    }

    const userRoles = (session.user.role ?? "user").split(",").map((r: string) => r.trim())
    if (!userRoles.includes("admin")) {
        redirect("/dashboard")
    }

    return <UsersManagement />
}
```

**ขั้นตอนที่ 2: สร้าง Client Component**

สร้างไฟล์ `app/(main)/admin/users/UsersManagement.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authClient, useSession } from "@/lib/auth-client"
import {
    Users,
    Plus,
    Shield,
    ShieldAlert,
    Ban,
    Trash2,
    Key,
    Pencil,
    UserCheck,
    UserX,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    X,
    Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================
interface User {
    id: string
    name: string
    email: string
    image: string | null
    role: string
    banned: boolean
    banReason: string | null
    banExpires: string | null
    createdAt: string
}

const ALL_ROLES = ["user", "manager", "admin"] as const
type RoleType = (typeof ALL_ROLES)[number]

type ModalType =
    | "create"
    | "editUser"
    | "setRole"
    | "ban"
    | "setPassword"
    | "delete"
    | null

// ============================================================
// Main Component
// ============================================================
export default function UsersManagement() {
    const { data: session } = useSession()

    // ── State ────────────────────────────────────────────────
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    const limit = 10

    // Modal
    const [modal, setModal] = useState<ModalType>(null)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState("")
    const [actionSuccess, setActionSuccess] = useState("")

    // Dropdown
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})

    // Form fields
    const [formName, setFormName] = useState("")
    const [formEmail, setFormEmail] = useState("")
    const [formPassword, setFormPassword] = useState("")
    const [formRoles, setFormRoles] = useState<RoleType[]>(["user"])
    const [formBanReason, setFormBanReason] = useState("")
    const [formBanDuration, setFormBanDuration] = useState<number>(0) // 0 = ถาวร, อื่นๆ = วินาที

    // ── Fetch Users ──────────────────────────────────────────
    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await authClient.admin.listUsers({
                query: {
                    limit,
                    offset: (page - 1) * limit,
                    ...(search
                        ? {
                              searchField: "email",
                              searchValue: search,
                              searchOperator: "contains" as const,
                          }
                        : {}),
                },
            })

            if (res.data) {
                setUsers(res.data.users as unknown as User[])
                setTotalUsers(res.data.total)
            }
        } catch {
            console.error("Failed to fetch users")
        } finally {
            setLoading(false)
        }
    }, [page, search])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const totalPages = Math.ceil(totalUsers / limit)

    // ── Helpers ──────────────────────────────────────────────
    const resetForm = () => {
        setFormName("")
        setFormEmail("")
        setFormPassword("")
        setFormRoles(["user"])
        setFormBanReason("")
        setFormBanDuration(0)
        setActionError("")
        setActionSuccess("")
    }

    const openModal = (type: ModalType, user?: User) => {
        resetForm()
        setModal(type)
        if (user) {
            setSelectedUser(user)
            setFormRoles(user.role.split(",").map((r) => r.trim()) as RoleType[])
            if (type === "editUser") {
                setFormName(user.name)
            }
        }
    }

    const closeModal = () => {
        setModal(null)
        setSelectedUser(null)
        resetForm()
    }

    const showSuccess = (msg: string) => {
        setActionSuccess(msg)
        setTimeout(() => setActionSuccess(""), 3000)
    }

    // ── Actions ──────────────────────────────────────────────
    const handleCreateUser = async () => {
        setActionLoading(true)
        setActionError("")
        try {
            const res = await authClient.admin.createUser({
                name: formName,
                email: formEmail,
                password: formPassword,
                role: formRoles.length === 1 ? formRoles[0] : formRoles,
            })
            if (res.error) throw new Error(res.error.message ?? "Create failed")
            closeModal()
            showSuccess("สร้างผู้ใช้ใหม่สำเร็จ")
            fetchUsers()
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleUpdateUser = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        setActionError("")
        try {
            const res = await authClient.admin.updateUser({
                userId: selectedUser.id,
                data: { name: formName },
            })
            if (res.error) throw new Error(res.error.message ?? "Update failed")
            closeModal()
            showSuccess("อัปเดตข้อมูลผู้ใช้สำเร็จ")
            fetchUsers()
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleSetRole = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        setActionError("")
        try {
            const res = await authClient.admin.setRole({
                userId: selectedUser.id,
                role: formRoles.length === 1 ? formRoles[0] : formRoles,
            })
            if (res.error) throw new Error(res.error.message ?? "Set role failed")
            closeModal()
            showSuccess(`เปลี่ยน role เป็น "${formRoles.join(", ")}" สำเร็จ`)
            fetchUsers()
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleBanUser = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        setActionError("")
        try {
            const res = await authClient.admin.banUser({
                userId: selectedUser.id,
                banReason: formBanReason || undefined,
                ...(formBanDuration > 0 ? { banExpiresIn: formBanDuration } : {}),
            })
            if (res.error) throw new Error(res.error.message ?? "Ban failed")
            closeModal()
            showSuccess("แบนผู้ใช้สำเร็จ")
            fetchUsers()
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleUnbanUser = async (user: User) => {
        try {
            const res = await authClient.admin.unbanUser({
                userId: user.id,
            })
            if (res.error) throw new Error(res.error.message ?? "Unban failed")
            showSuccess("ปลดแบนผู้ใช้สำเร็จ")
            fetchUsers()
        } catch {
            console.error("Unban failed")
        }
    }

    const handleSetPassword = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        setActionError("")
        try {
            const res = await authClient.admin.setUserPassword({
                userId: selectedUser.id,
                newPassword: formPassword,
            })
            if (res.error) throw new Error(res.error.message ?? "Set password failed")
            closeModal()
            showSuccess("เปลี่ยนรหัสผ่านสำเร็จ")
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!selectedUser) return
        setActionLoading(true)
        setActionError("")
        try {
            const res = await authClient.admin.removeUser({
                userId: selectedUser.id,
            })
            if (res.error) throw new Error(res.error.message ?? "Delete failed")
            closeModal()
            showSuccess("ลบผู้ใช้สำเร็จ")
            fetchUsers()
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(false)
        }
    }

    const handleImpersonate = async (user: User) => {
        try {
            const res = await authClient.admin.impersonateUser({
                userId: user.id,
            })
            if (res.error) throw new Error(res.error.message ?? "Impersonate failed")
            window.location.href = "/dashboard"
        } catch {
            console.error("Impersonate failed")
        }
    }

    const handleStopImpersonating = async () => {
        try {
            await authClient.admin.stopImpersonating()
            window.location.href = "/admin/users"
        } catch {
            console.error("Stop impersonating failed")
        }
    }

    // ── Role badge ───────────────────────────────────────────
    const RoleBadge = ({ role }: { role: string }) => {
        const colors: Record<string, string> = {
            admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            manager:
                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            user: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        }
        const iconMap: Record<string, React.ReactNode> = {
            admin: <ShieldAlert className="h-3 w-3" />,
            manager: <Shield className="h-3 w-3" />,
            user: <UserCheck className="h-3 w-3" />,
        }
        const roles = role.split(",").map((r) => r.trim())
        return (
            <div className="flex flex-wrap gap-1">
                {roles.map((r) => (
                    <span
                        key={r}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            colors[r] ?? "bg-gray-100 text-gray-700"
                        )}
                    >
                        {iconMap[r]}
                        {r}
                    </span>
                ))}
            </div>
        )
    }

    // ── Role Checkbox Toggle ─────────────────────────────────
    const toggleRole = (role: RoleType) => {
        setFormRoles((prev) => {
            if (prev.includes(role)) {
                // ต้องเหลืออย่างน้อย 1 role
                if (prev.length <= 1) return prev
                return prev.filter((r) => r !== role)
            }
            return [...prev, role]
        })
    }

    const RoleCheckboxes = () => (
        <div className="flex flex-col gap-2">
            {ALL_ROLES.map((role) => (
                <label
                    key={role}
                    className="flex items-center gap-2 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <input
                        type="checkbox"
                        checked={formRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary accent-primary"
                    />
                    <RoleBadge role={role} />
                </label>
            ))}
        </div>
    )

    // ── Impersonation Banner ─────────────────────────────────
    // impersonatedBy อยู่ใน session object (ไม่ใช่ user)
    const isImpersonating = !!(session?.session as { impersonatedBy?: string } | undefined)?.impersonatedBy

    // ══════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* Impersonation Banner */}
            {isImpersonating && (
                <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                        <UserX className="h-4 w-4" />
                        <span>
                            กำลังเข้าใช้งานในนามผู้ใช้คนอื่น (Impersonating)
                        </span>
                    </div>
                    <button
                        onClick={handleStopImpersonating}
                        className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                        หยุด Impersonate
                    </button>
                </div>
            )}

            {/* Success Message */}
            {actionSuccess && (
                <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                    ✅ {actionSuccess}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        จัดการผู้ใช้
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        ทั้งหมด {totalUsers} คน
                    </p>
                </div>
                <button
                    onClick={() => openModal("create")}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    สร้างผู้ใช้ใหม่
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="ค้นหาด้วยอีเมล..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                    }}
                    className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                    ผู้ใช้
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                    Role
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                    สถานะ
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                    สมัครเมื่อ
                                </th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        ไม่พบผู้ใช้
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                    >
                                        {/* User info */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img
                                                        src={user.image}
                                                        alt={user.name}
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
                                                        {user.name
                                                            ?.split(" ")
                                                            .map((w) => w[0])
                                                            .join("")
                                                            .toUpperCase()
                                                            .slice(0, 2) || "?"}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="px-4 py-3">
                                            <RoleBadge role={user.role} />
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {user.banned ? (
                                                <div>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <Ban className="h-3 w-3" />
                                                        Banned
                                                    </span>
                                                    {user.banExpires && (
                                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                                            หมดเวลา: {new Date(user.banExpires).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <UserCheck className="h-3 w-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>

                                        {/* Created  */}
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(
                                                user.createdAt
                                            ).toLocaleDateString("th-TH", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </td>

                                        {/* Actions dropdown */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    ref={(el) => { btnRefs.current[user.id] = el }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        if (openDropdown === user.id) {
                                                            setOpenDropdown(null)
                                                        } else {
                                                            const rect = btnRefs.current[user.id]?.getBoundingClientRect()
                                                            if (rect) {
                                                                setDropdownPos({
                                                                    top: rect.bottom + 4,
                                                                    left: rect.right - 192, // w-48 = 12rem = 192px
                                                                })
                                                            }
                                                            setOpenDropdown(user.id)
                                                        }
                                                    }}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            หน้า {page} จาก {totalPages}
                        </p>
                        <div className="flex gap-1">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions Dropdown (rendered outside table to avoid overflow clipping) */}
            {openDropdown && (() => {
                const user = users.find((u) => u.id === openDropdown)
                if (!user) return null
                return (
                    <>
                        {/* Invisible backdrop — click to close */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenDropdown(null)}
                        />
                        <div
                            className="fixed z-50 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 text-left shadow-lg"
                            style={{ top: dropdownPos.top, left: dropdownPos.left }}
                        >
                                                        <DropdownItem
                                                            icon={Pencil}
                                                            label="แก้ไขข้อมูล"
                                                            onClick={() => {
                                                                setOpenDropdown(
                                                                    null
                                                                )
                                                                openModal(
                                                                    "editUser",
                                                                    user
                                                                )
                                                            }}
                                                        />
                                                        <DropdownItem
                                                            icon={Shield}
                                                            label="เปลี่ยน Role"
                                                            onClick={() => {
                                                                setOpenDropdown(
                                                                    null
                                                                )
                                                                openModal(
                                                                    "setRole",
                                                                    user
                                                                )
                                                            }}
                                                        />
                                                        <DropdownItem
                                                            icon={Key}
                                                            label="เปลี่ยนรหัสผ่าน"
                                                            onClick={() => {
                                                                setOpenDropdown(
                                                                    null
                                                                )
                                                                openModal(
                                                                    "setPassword",
                                                                    user
                                                                )
                                                            }}
                                                        />
                                                        {user.banned ? (
                                                            <DropdownItem
                                                                icon={UserCheck}
                                                                label="ปลดแบน"
                                                                onClick={() => {
                                                                    setOpenDropdown(
                                                                        null
                                                                    )
                                                                    handleUnbanUser(
                                                                        user
                                                                    )
                                                                }}
                                                            />
                                                        ) : (
                                                            <DropdownItem
                                                                icon={Ban}
                                                                label="แบนผู้ใช้"
                                                                className="text-amber-600 dark:text-amber-400"
                                                                onClick={() => {
                                                                    setOpenDropdown(
                                                                        null
                                                                    )
                                                                    openModal(
                                                                        "ban",
                                                                        user
                                                                    )
                                                                }}
                                                            />
                                                        )}
                                                        <DropdownItem
                                                            icon={UserX}
                                                            label="Impersonate"
                                                            onClick={() => {
                                                                setOpenDropdown(
                                                                    null
                                                                )
                                                                handleImpersonate(
                                                                    user
                                                                )
                                                            }}
                                                        />
                                                        <div className="my-1 border-t border-border" />
                                                        <DropdownItem
                                                            icon={Trash2}
                                                            label="ลบผู้ใช้"
                                                            className="text-red-600 dark:text-red-400"
                                                            onClick={() => {
                                                                setOpenDropdown(
                                                                    null
                                                                )
                                                                openModal(
                                                                    "delete",
                                                                    user
                                                                )
                                                            }}
                                                        />
                        </div>
                    </>
                )
            })()}

            {/* ═══════ MODALS ═══════ */}

            {/* Create User Modal */}
            {modal === "create" && (
                <Modal title="สร้างผู้ใช้ใหม่" onClose={closeModal}>
                    <div className="space-y-4">
                        <FormField
                            label="ชื่อ"
                            value={formName}
                            onChange={setFormName}
                            placeholder="ชื่อผู้ใช้"
                        />
                        <FormField
                            label="อีเมล"
                            type="email"
                            value={formEmail}
                            onChange={setFormEmail}
                            placeholder="email@example.com"
                        />
                        <FormField
                            label="รหัสผ่าน"
                            type="password"
                            value={formPassword}
                            onChange={setFormPassword}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                        />
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                                Role (เลือกได้หลาย role)
                            </label>
                            <RoleCheckboxes />
                        </div>
                        {actionError && <ErrorMsg msg={actionError} />}
                        <ModalActions
                            loading={actionLoading}
                            confirmLabel="สร้างผู้ใช้"
                            onCancel={closeModal}
                            onConfirm={handleCreateUser}
                        />
                    </div>
                </Modal>
            )}

            {/* Edit User Modal */}
            {modal === "editUser" && selectedUser && (
                <Modal
                    title={`แก้ไขข้อมูล — ${selectedUser.name}`}
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            อีเมล: <strong>{selectedUser.email}</strong>
                        </div>
                        <FormField
                            label="ชื่อ"
                            value={formName}
                            onChange={setFormName}
                            placeholder="ชื่อผู้ใช้"
                        />
                        {actionError && <ErrorMsg msg={actionError} />}
                        <ModalActions
                            loading={actionLoading}
                            confirmLabel="บันทึก"
                            onCancel={closeModal}
                            onConfirm={handleUpdateUser}
                        />
                    </div>
                </Modal>
            )}

            {/* Set Role Modal */}
            {modal === "setRole" && selectedUser && (
                <Modal
                    title={`เปลี่ยน Role — ${selectedUser.name}`}
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Role ปัจจุบัน:{" "}
                            <RoleBadge role={selectedUser.role} />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">
                                Role (เลือกได้หลาย role)
                            </label>
                            <RoleCheckboxes />
                        </div>
                        {actionError && <ErrorMsg msg={actionError} />}
                        <ModalActions
                            loading={actionLoading}
                            confirmLabel="บันทึก"
                            onCancel={closeModal}
                            onConfirm={handleSetRole}
                        />
                    </div>
                </Modal>
            )}

            {/* Ban User Modal */}
            {modal === "ban" && selectedUser && (
                <Modal
                    title={`แบนผู้ใช้ — ${selectedUser.name}`}
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            ผู้ใช้ที่ถูกแบนจะไม่สามารถเข้าสู่ระบบได้
                        </p>
                        <FormField
                            label="เหตุผล (ไม่บังคับ)"
                            value={formBanReason}
                            onChange={setFormBanReason}
                            placeholder="เช่น Spam, ละเมิดกฎ"
                        />
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground">
                                ระยะเวลาแบน
                            </label>
                            <select
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-white [&>option]:dark:bg-gray-900 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
                                value={formBanDuration}
                                onChange={(e) => setFormBanDuration(Number(e.target.value))}
                            >
                                <option value={0}>ถาวร (ไม่มีกำหนด)</option>
                                <option value={3600}>1 ชั่วโมง</option>
                                <option value={86400}>1 วัน</option>
                                <option value={259200}>3 วัน</option>
                                <option value={604800}>7 วัน</option>
                                <option value={2592000}>30 วัน</option>
                                <option value={7776000}>90 วัน</option>
                            </select>
                        </div>
                        {actionError && <ErrorMsg msg={actionError} />}
                        <ModalActions
                            loading={actionLoading}
                            confirmLabel="แบนผู้ใช้"
                            variant="destructive"
                            onCancel={closeModal}
                            onConfirm={handleBanUser}
                        />
                    </div>
                </Modal>
            )}

            {/* Set Password Modal */}
            {modal === "setPassword" && selectedUser && (
                <Modal
                    title={`เปลี่ยนรหัสผ่าน — ${selectedUser.name}`}
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <FormField
                            label="รหัสผ่านใหม่"
                            type="password"
                            value={formPassword}
                            onChange={setFormPassword}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                        />
                        {actionError && <ErrorMsg msg={actionError} />}
                        <ModalActions
                            loading={actionLoading}
                            confirmLabel="เปลี่ยนรหัสผ่าน"
                            onCancel={closeModal}
                            onConfirm={handleSetPassword}
                        />
                    </div>
                </Modal>
            )}

            {/* Delete User Modal */}
            {modal === "delete" && selectedUser && (
                <Modal
                    title={`ลบผู้ใช้ — ${selectedUser.name}`}
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                            <p className="text-sm text-red-700 dark:text-red-400">
                                ⚠️ การลบผู้ใช้จะไม่สามารถกู้คืนได้
                                ข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบถาวร
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            คุณแน่ใจหรือไม่ที่จะลบ{" "}
                            <strong>{selectedUser.email}</strong>?
                        </p>
                        {actionError && <ErrorMsg msg={actionError} />}
                        <ModalActions
                            loading={actionLoading}
                            confirmLabel="ลบผู้ใช้"
                            variant="destructive"
                            onCancel={closeModal}
                            onConfirm={handleDeleteUser}
                        />
                    </div>
                </Modal>
            )}
        </div>
    )
}

// ============================================================
// Sub-components
// ============================================================

function DropdownItem({
    icon: Icon,
    label,
    onClick,
    className,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
    className?: string
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer",
                className
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    )
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string
    onClose: () => void
    children: React.ReactNode
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-6 shadow-2xl mx-4">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

function FormField({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
}: {
    label: string
    type?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 text-sm shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    )
}

function ErrorMsg({ msg }: { msg: string }) {
    return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {msg}
        </div>
    )
}

function ModalActions({
    loading,
    confirmLabel,
    variant = "default",
    onCancel,
    onConfirm,
}: {
    loading: boolean
    confirmLabel: string
    variant?: "default" | "destructive"
    onCancel: () => void
    onConfirm: () => void
}) {
    return (
        <div className="flex justify-end gap-2 pt-2">
            <button
                onClick={onCancel}
                disabled={loading}
                className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 text-sm font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer disabled:opacity-50"
            >
                ยกเลิก
            </button>
            <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium text-white shadow transition-colors cursor-pointer disabled:opacity-50",
                    variant === "destructive"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                )}
            >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
            </button>
        </div>
    )
}

```

**ขั้นตอนที่ 3: อัปเดต Sidebar ให้ /admin/users**

ใน `sidebar-data.ts` เปลี่ยน href จาก `/users` เป็น `/admin/users`:

```typescript
{
    title: "Admin",
    items: [
        { title: "Users", href: "/admin/users", icon: Users },  // ← อัปเดตตรงนี้
        { title: "Settings", href: "/settings", icon: Settings },
    ],
    allowedRoles: ["admin"],
},
```

**ฟีเจอร์หลักของ UsersManagement:**

1. **ตาราง Users** — แสดงชื่อ, อีเมล, avatar, role badge (แสดงหลาย badge สำหรับ multi-role เช่น `user,manager`), สถานะ (Active/Banned + วันหมดอายุแบน), วันที่สมัคร
2. **ค้นหา** — ค้นหาด้วยอีเมลผ่าน `searchField: "email"` + `searchOperator: "contains"`
3. **Pagination** — แสดงหน้าละ 10 คน, ปุ่มเลื่อนหน้า
4. **Dropdown Actions** — แต่ละ row มีปุ่ม `⋮` เปิด dropdown menu: แก้ไขข้อมูล, เปลี่ยน Role, เปลี่ยนรหัสผ่าน, แบน/ปลดแบน, Impersonate, ลบ
5. **Modal forms** — กรอก/ยืนยันข้อมูลก่อนทำ action ต่าง ๆ
6. **Multi-Role** — เลือก role ได้หลาย role ผ่าน checkbox (ทั้งตอนสร้างและเปลี่ยน role) เก็บเป็น comma-separated เช่น `"user,manager"`
7. **Ban Expiration** — กำหนดระยะเวลาแบนได้ (1 ชั่วโมง ถึง 90 วัน หรือถาวร) พร้อมแสดงวันหมดอายุในตาราง
8. **Impersonation Banner** — เมื่อ impersonate จะมีแถบสีเหลืองด้านบนแจ้งสถานะ + ปุ่ม "หยุด Impersonate"

> **หมายเหตุ:** โค้ดตัวอย่างด้านบนเป็นแบบย่อ ตัวเต็มมี Modal, error handling, loading states ครบ ดูได้ที่ `app/(main)/admin/users/UsersManagement.tsx`

> **⚠️ ข้อสังเกตสำคัญเกี่ยวกับ `impersonatedBy`:**  
> ฟิลด์ `impersonatedBy` อยู่ใน **Session model** (ไม่ใช่ User model)  
> ดังนั้นต้องอ่านจาก `session.session.impersonatedBy` ไม่ใช่ `session.user.impersonatedBy`

##### 10.10.6 Global Impersonation Banner — แจ้งสถานะ Impersonate ทุกหน้า

ปัญหา: Impersonation Banner ใน `UsersManagement.tsx` แสดงเฉพาะหน้า `/admin/users` เท่านั้น แต่เมื่อกด Impersonate แล้ว redirect ไปหน้า `/dashboard` จะไม่เห็น Banner และไม่รู้จะกด "หยุด Impersonate" ได้อย่างไร

แก้ไข: สร้าง Global Impersonation Banner ที่แสดงใน **Header ของทุกหน้า** เมื่อกำลัง Impersonate

**โครงสร้างไฟล์ที่อัปเดต:**

```
app/(main)/_components/header/
├── header.tsx                ← เพิ่ม <ImpersonationBanner />
├── impersonation-banner.tsx  ← 🆕 Global Banner
├── user-menu.tsx
└── index.ts                  ← เพิ่ม export ImpersonationBanner
```

**ขั้นตอนที่ 1: สร้าง `impersonation-banner.tsx`**

สร้างไฟล์ `app/(main)/_components/header/impersonation-banner.tsx`:

```tsx
"use client"

import { useSession, authClient } from "@/lib/auth-client"

export function ImpersonationBanner() {
    const { data: session } = useSession()

    // impersonatedBy อยู่ใน session object (ไม่ใช่ user)
    const isImpersonating = !!(
        session?.session as { impersonatedBy?: string } | undefined
    )?.impersonatedBy

    if (!isImpersonating) return null

    const handleStopImpersonating = async () => {
        try {
            await authClient.admin.stopImpersonating()
            window.location.href = "/admin/users"
        } catch {
            console.error("Stop impersonating failed")
        }
    }

    return (
        <div className="flex items-center justify-between bg-amber-500 dark:bg-amber-600 px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-950 dark:text-amber-50">
                <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <span>
                    กำลังเข้าใช้งานในนามของ{" "}
                    <strong>{session?.user?.name}</strong> (Impersonating)
                </span>
            </div>
            <button
                onClick={handleStopImpersonating}
                className="rounded-md bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-900 transition-colors cursor-pointer"
            >
                หยุด Impersonate
            </button>
        </div>
    )
}
```

**จุดสำคัญ:**
- ตรวจจับ impersonation จาก `session.session.impersonatedBy` (Session model) ไม่ใช่ `session.user.impersonatedBy`
- ถ้าไม่ได้ impersonate → return `null` (ไม่แสดงอะไร)
- แถบสีเหลืองเด่นชัด (`bg-amber-500`) แสดงชื่อ user ที่กำลังถูก impersonate
- ปุ่ม "หยุด Impersonate" เรียก `authClient.admin.stopImpersonating()` แล้ว redirect กลับไปหน้า admin

**ขั้นตอนที่ 2: อัปเดต `header.tsx` — เพิ่ม Banner เหนือ Header**

```tsx
// app/(main)/_components/header/header.tsx
"use client"

import { usePathname } from "next/navigation"
import { sidebarData, bottomNavItems } from "../sidebar/sidebar-data"
import { UserMenu } from "./user-menu"
import { ImpersonationBanner } from "./impersonation-banner"

export function Header() {
    const pathname = usePathname()

    // หน้าที่ไม่อยู่ใน sidebar แต่ต้องแสดง title
    const pageTitles: Record<string, string> = {
        "/profile": "โปรไฟล์ของฉัน",
    }

    // รวม items ทั้งหมดจาก sidebar แล้วหา title ที่ตรงกับ pathname
    const allItems = [
        ...sidebarData.flatMap((section) => section.items),
        ...bottomNavItems,
    ]
    const matched = allItems.find((item) => pathname === item.href)
    const title = pageTitles[pathname] ?? matched?.title ?? "Dashboard"

    return (
        <>
        {/* Impersonation Banner — แสดงเมื่อ Admin กำลัง Impersonate */}
        <ImpersonationBanner />

        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold text-foreground">
                    {title}
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <UserMenu />
            </div>
        </header>
        </>
    )
}
```

**การเปลี่ยนแปลง:**
- import `ImpersonationBanner` จากไฟล์ใหม่
- ใช้ `<> ... </>` (Fragment) ครอบทั้ง Banner และ Header
- `<ImpersonationBanner />` อยู่เหนือ `<header>` → แสดงแถบเหลืองด้านบนสุดทุกหน้าเมื่อ impersonate

**ขั้นตอนที่ 3: อัปเดต `index.ts` — เพิ่ม barrel export**

```typescript
// app/(main)/_components/header/index.ts
export { Header } from "./header"
export { UserMenu } from "./user-menu"
export { ImpersonationBanner } from "./impersonation-banner"
```

**ผลลัพธ์:**
- เมื่อ Admin กด **Impersonate** ที่หน้า `/admin/users` → redirect ไป `/dashboard`
- แถบสีเหลืองจะปรากฏด้านบนทุกหน้า แสดงชื่อ user ที่กำลังถูก impersonate
- กดปุ่ม **"หยุด Impersonate"** → เรียก `stopImpersonating()` แล้วกลับไปหน้า `/admin/users`
- Banner แสดงทุกหน้าภายใน `(main)` layout เพราะอยู่ใน `<Header />` ซึ่งอยู่ใน `layout.tsx`

##### 10.10.7 Update User Profile — แก้ไขโปรไฟล์ของตัวเอง

ผู้ใช้ทุก role สามารถแก้ไขโปรไฟล์ของตัวเองได้ (ชื่อ + เปลี่ยนรหัสผ่าน) ผ่านหน้า `/profile` ที่มีลิงก์จาก **User Menu → โปรไฟล์ของฉัน**

| ฟีเจอร์ | API ที่ใช้ | คำอธิบาย |
|---------|----------|----------|
| แก้ไขชื่อ | `authClient.updateUser({ name })` | อัปเดตชื่อผู้ใช้ (Better Auth built-in) |
| เปลี่ยนรหัสผ่าน | `authClient.changePassword({ currentPassword, newPassword })` | เปลี่ยนรหัสผ่านตัวเอง + revoke session อื่น |

> **หมายเหตุ:** `updateUser()` และ `changePassword()` เป็น API ของ **Better Auth core** (ไม่ใช่ Admin Plugin) ผู้ใช้ทุก role เรียกใช้ได้โดยไม่ต้องมีสิทธิ์ admin

**โครงสร้างไฟล์:**

```
app/(main)/profile/
├── page.tsx          ← Server Component (auth guard)
└── ProfileForm.tsx   ← Client Component (UI ทั้งหมด)
```

**ขั้นตอนที่ 1: สร้าง Server Page**

สร้างไฟล์ `app/(main)/profile/page.tsx`:

```tsx
import ProfileForm from "./ProfileForm"

export const metadata = {
    title: "โปรไฟล์ของฉัน",
}

export default function ProfilePage() {
    return <ProfileForm />
}
```

**ขั้นตอนที่ 2: สร้าง Client Component**

สร้างไฟล์ `app/(main)/profile/ProfileForm.tsx`:

```tsx
"use client"

import { useState } from "react"
import { authClient, useSession } from "@/lib/auth-client"
import { User, Mail, Save, Loader2, CheckCircle, AlertCircle, Lock, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function ProfileForm() {
    const { data: session, isPending } = useSession()

    // ── Profile State ──────────────────────────────────────
    const [name, setName] = useState("")
    const [nameInitialized, setNameInitialized] = useState(false)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState("")
    const [error, setError] = useState("")

    // ── Password State ─────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordSaving, setPasswordSaving] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState("")
    const [passwordError, setPasswordError] = useState("")

    // ── Initialize name from session ───────────────────────
    if (session && !nameInitialized) {
        setName(session.user?.name || "")
        setNameInitialized(true)
    }

    // ── Update Profile Handler ─────────────────────────────
    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            setError("กรุณากรอกชื่อ")
            return
        }

        setSaving(true)
        setError("")
        setSuccess("")

        try {
            const res = await authClient.updateUser({
                name: name.trim(),
            })

            if (res.error) {
                setError(res.error.message || "เกิดข้อผิดพลาด")
            } else {
                setSuccess("อัปเดตโปรไฟล์สำเร็จ!")
                setTimeout(() => setSuccess(""), 3000)
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการอัปเดต")
        } finally {
            setSaving(false)
        }
    }

    // ── Change Password Handler ────────────────────────────
    const handleChangePassword = async () => {
        setPasswordError("")
        setPasswordSuccess("")

        if (!currentPassword) {
            setPasswordError("กรุณากรอกรหัสผ่านปัจจุบัน")
            return
        }
        if (!newPassword || newPassword.length < 8) {
            setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("รหัสผ่านใหม่ไม่ตรงกัน")
            return
        }

        setPasswordSaving(true)

        try {
            const res = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true, // ล้าง session อื่นทั้งหมด
            })

            if (res.error) {
                setPasswordError(res.error.message || "เกิดข้อผิดพลาด")
            } else {
                setPasswordSuccess("เปลี่ยนรหัสผ่านสำเร็จ!")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setTimeout(() => setPasswordSuccess(""), 3000)
            }
        } catch {
            setPasswordError("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน")
        } finally {
            setPasswordSaving(false)
        }
    }

    if (isPending) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (!session) return null

    const initials = (session.user?.name || "U")
        .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    const userRole = (session.user as { role?: string })?.role || "user"

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* ── Profile Card ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-500" />
                    ข้อมูลโปรไฟล์
                </h2>

                {/* Avatar + Info */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    {session.user?.image ? (
                        <Image src={session.user.image} alt="Avatar" width={64} height={64}
                            className="w-16 h-16 rounded-full ring-2 ring-purple-200 dark:ring-purple-800" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-500 to-indigo-600
                            flex items-center justify-center ring-2 ring-purple-200 dark:ring-purple-800">
                            <span className="text-xl font-bold text-white">{initials}</span>
                        </div>
                    )}
                    <div>
                        <p className="text-base font-semibold text-foreground">{session.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                            bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            {userRole.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            <Mail className="w-4 h-4 inline mr-1.5 text-muted-foreground" />อีเมล
                        </label>
                        <input type="email" value={session.user?.email || ""} disabled
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted
                                text-muted-foreground text-sm cursor-not-allowed" />
                        <p className="text-xs text-muted-foreground mt-1">อีเมลไม่สามารถเปลี่ยนได้</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            <User className="w-4 h-4 inline mr-1.5 text-muted-foreground" />ชื่อ
                        </label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="กรอกชื่อของคุณ"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background
                                text-foreground text-sm focus:outline-none focus:ring-2
                                focus:ring-purple-500/50 focus:border-purple-500 transition" />
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 ... px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 text-sm text-green-600 ... px-3 py-2 rounded-lg">
                            <CheckCircle className="w-4 h-4 shrink-0" />{success}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button onClick={handleUpdateProfile} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700
                                disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Change Password Card ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-purple-500" />
                    เปลี่ยนรหัสผ่าน
                </h2>

                <div className="relative">
                    <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่านปัจจุบัน"
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                    />
                    <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
```

> **หมายเหตุ:** โค้ดตัวอย่างด้านบนเป็นแบบย่อ ตัวเต็มมี Password toggle (Eye/EyeOff), error handling, loading states ครบ ดูได้ที่ `app/(main)/profile/ProfileForm.tsx`

**จุดสำคัญ:**

1. **`authClient.updateUser()`** — Better Auth core API สำหรับอัปเดตข้อมูลตัวเอง (ไม่ใช่ `admin.updateUser()` ที่ใช้สำหรับ Admin แก้ไขคนอื่น)
2. **`authClient.changePassword()`** — รับ `currentPassword` + `newPassword` + `revokeOtherSessions`
   - `revokeOtherSessions: true` → ล้าง session อื่นทั้งหมด (เหลือเฉพาะ session ปัจจุบัน) เพื่อความปลอดภัย
3. **Email read-only** — อีเมลเปลี่ยนไม่ได้ (ต้องมีระบบ email verification แยก)
4. **Session auto-update** — หลัง `updateUser()` สำเร็จ `useSession()` จะ re-fetch ข้อมูลใหม่อัตโนมัติ ทำให้ UserMenu แสดงชื่อใหม่ทันที

**ความแตกต่าง `updateUser()` vs `admin.updateUser()`:**

| | `authClient.updateUser()` | `authClient.admin.updateUser()` |
|---|---|---|
| **ใครเรียก** | ผู้ใช้ทุก role | Admin เท่านั้น |
| **แก้ไขใคร** | ตัวเองเท่านั้น | user คนไหนก็ได้ |
| **ต้องส่ง userId** | ไม่ (ใช้ session ปัจจุบัน) | ใช่ (`userId`) |
| **Endpoint** | `POST /api/auth/update-user` | `POST /api/auth/admin/update-user` |

---

### 🎁 Bonus: Audit Log — แนวคิดและโครงสร้างสำหรับต่อยอด

ในระบบ Production จริง การบันทึก **Audit Log** (บันทึกการกระทำ) เป็นสิ่งจำเป็นสำหรับ:
- **ความปลอดภัย** — ตรวจสอบย้อนหลังว่าใครทำอะไร เมื่อไหร่
- **Compliance** — ปฏิบัติตามข้อกำหนดของ GDPR, SOC 2, HIPAA ฯลฯ
- **การ Debug** — ติดตามปัญหาที่เกิดขึ้นจากการกระทำของผู้ใช้หรือ Admin
- **Accountability** — ทุกคนรับผิดชอบต่อการกระทำของตัวเอง

> **⚠️ หมายเหตุ:** Section นี้เป็น **Bonus** สำหรับศึกษาเพิ่มเติม ไม่ได้ implement ใน Workshop นี้ แต่ให้แนวคิดและโครงสร้างพร้อมนำไปต่อยอดได้ทันที

#### B.1 ทำไมต้อง Audit Log ทุก Role?

หลายคนอาจคิดว่า Audit Log เก็บแค่การกระทำของ Admin ก็พอ แต่จริงๆ แล้วควรเก็บ **ทุก Role** เพราะ:

| เหตุผล | ตัวอย่าง |
|--------|----------|
| **Security Forensics** | ถ้าบัญชี user ถูก hack ต้องดูย้อนหลังว่ามี action อะไรผิดปกติ |
| **Business Analytics** | รู้ว่า user ใช้ฟีเจอร์อะไรบ่อย เพื่อปรับปรุง UX |
| **Legal Protection** | พิสูจน์ได้ว่าผู้ใช้ทำอะไรจริง (เช่น ลบข้อมูลตัวเอง) |
| **Debugging** | user แจ้งว่า "ข้อมูลหาย" → ตรวจสอบ log ได้ว่าใครลบ เมื่อไหร่ |
| **Admin Accountability** | ป้องกัน Admin ใช้อำนาจเกินไป (เช่น แอบ ban user โดยไม่มีเหตุผล) |

#### B.2 ประเภท Action ที่ควรเก็บ แบ่งตาม Role

##### Admin Actions (Critical — ต้องเก็บทุก action)

| Action | คำอธิบาย | Severity |
|--------|----------|----------|
| `admin.create_user` | สร้าง user ใหม่ | HIGH |
| `admin.update_user` | แก้ไขข้อมูล user | HIGH |
| `admin.delete_user` | ลบ user | CRITICAL |
| `admin.set_role` | เปลี่ยน role | CRITICAL |
| `admin.ban_user` | แบน user | HIGH |
| `admin.unban_user` | ปลดแบน user | HIGH |
| `admin.impersonate_start` | เริ่ม impersonate | CRITICAL |
| `admin.impersonate_stop` | หยุด impersonate | HIGH |
| `admin.set_password` | เปลี่ยนรหัสผ่าน user | CRITICAL |

##### Manager Actions (Important — ควรเก็บ)

| Action | คำอธิบาย | Severity |
|--------|----------|----------|
| `manager.update_project` | แก้ไข project | MEDIUM |
| `manager.create_project` | สร้าง project | MEDIUM |
| `manager.assign_member` | เพิ่มสมาชิกใน project | MEDIUM |

##### User Actions (Standard — เก็บเพื่อ analytics & security)

| Action | คำอธิบาย | Severity |
|--------|----------|----------|
| `user.login` | เข้าสู่ระบบ | LOW |
| `user.logout` | ออกจากระบบ | LOW |
| `user.login_failed` | เข้าสู่ระบบไม่สำเร็จ | MEDIUM |
| `user.update_profile` | แก้ไขข้อมูลส่วนตัว | LOW |
| `user.change_password` | เปลี่ยนรหัสผ่าน | MEDIUM |
| `user.create_project` | สร้าง project | LOW |
| `user.delete_project` | ลบ project | MEDIUM |

#### B.3 โครงสร้างตาราง Prisma สำหรับ Audit Log

เพิ่ม model ใน `prisma/schema.prisma`:

```prisma
// ============================================================
// Audit Log — บันทึกการกระทำทั้งหมดในระบบ
// ============================================================
model AuditLog {
    id          String   @id @default(cuid())
    
    // ── ใครทำ ──────────────────────────────────────────────
    userId      String               // ID ของผู้กระทำ
    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    userRole    String               // role ณ ขณะกระทำ (เก็บไว้เพราะ role อาจเปลี่ยนภายหลัง)
    
    // ── ทำอะไร ─────────────────────────────────────────────
    action      String               // เช่น "admin.ban_user", "user.login"
    severity    String   @default("LOW") // CRITICAL, HIGH, MEDIUM, LOW
    
    // ── กับใคร/อะไร ────────────────────────────────────────
    targetType  String?              // "user", "project", "session" ฯลฯ
    targetId    String?              // ID ของ target
    
    // ── รายละเอียดเพิ่มเติม ─────────────────────────────────
    metadata    Json?                // ข้อมูลเพิ่มเติม เช่น { oldRole: "user", newRole: "admin" }
    ipAddress   String?              // IP ของผู้กระทำ
    userAgent   String?              // Browser/Device info
    
    // ── เวลา ───────────────────────────────────────────────
    createdAt   DateTime @default(now())

    @@index([userId])
    @@index([action])
    @@index([severity])
    @@index([targetType, targetId])
    @@index([createdAt])
    @@map("audit_log")
}
```

> **ข้อสังเกต:**
> - `userRole` เก็บ role ตอนที่ทำ action (ไม่ใช่ role ปัจจุบัน) เพราะ role อาจถูกเปลี่ยนภายหลัง
> - `metadata` เป็น `Json` เพื่อเก็บข้อมูลที่แตกต่างกันตาม action เช่น ban เก็บ reason, set-role เก็บ old/new role
> - `@@index` สร้าง index สำหรับ query ที่ใช้บ่อย (ค้นตาม user, action, severity, target, วันที่)
> - ใช้ `@@map("audit_log")` เพื่อกำหนดชื่อตารางใน database เป็น snake_case

**อย่าลืมเพิ่ม relation ใน User model:**

```prisma
model User {
    // ... fields เดิม ...
    auditLogs   AuditLog[]
}
```

#### B.4 ตัวอย่าง Audit Logger Utility

สร้างไฟล์ `lib/audit.ts` สำหรับเรียกใช้ง่ายๆ:

```typescript
// lib/audit.ts
import { prisma } from "@/lib/prisma"

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

interface AuditLogInput {
    userId: string
    userRole: string
    action: string
    severity?: Severity
    targetType?: string
    targetId?: string
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
}

export async function logAudit(input: AuditLogInput) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: input.userId,
                userRole: input.userRole,
                action: input.action,
                severity: input.severity ?? "LOW",
                targetType: input.targetType,
                targetId: input.targetId,
                metadata: input.metadata ?? undefined,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            },
        })
    } catch (error) {
        // Audit log ไม่ควร throw error ที่ทำให้ main flow พัง
        console.error("[AuditLog] Failed to write:", error)
    }
}
```

> **Best Practice:** `logAudit()` ใช้ `try/catch` เพราะ Audit Log ไม่ควรทำให้ action หลักล้มเหลว — ถ้าเขียน log ไม่ได้ก็แค่ print error แล้วไปต่อ

#### B.5 ตัวอย่างการเรียกใช้ใน API Route

```typescript
// ตัวอย่าง: เก็บ log เมื่อ Admin เปลี่ยน role ของ user
import { logAudit } from "@/lib/audit"

// ... ภายใน API handler หลังจาก set-role สำเร็จ ...
await logAudit({
    userId: session.user.id,
    userRole: session.user.role ?? "admin",
    action: "admin.set_role",
    severity: "CRITICAL",
    targetType: "user",
    targetId: targetUserId,
    metadata: {
        oldRole: previousRole,
        newRole: newRole,
    },
    ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
})
```

```typescript
// ตัวอย่าง: เก็บ log เมื่อ Admin เริ่ม Impersonate
await logAudit({
    userId: session.user.id,
    userRole: "admin",
    action: "admin.impersonate_start",
    severity: "CRITICAL",
    targetType: "user",
    targetId: impersonatedUserId,
    metadata: {
        impersonatedUserName: targetUser.name,
        impersonatedUserEmail: targetUser.email,
    },
})
```

```typescript
// ตัวอย่าง: เก็บ log เมื่อ User login สำเร็จ
await logAudit({
    userId: user.id,
    userRole: user.role ?? "user",
    action: "user.login",
    severity: "LOW",
    ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
})
```

#### B.6 แนวทางการต่อยอด

เมื่อนำ Audit Log ไปใช้จริง ควรพิจารณาเพิ่มเติม:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Admin Dashboard** | สร้างหน้า `/admin/audit-logs` แสดงตาราง log พร้อม filter ตาม action, severity, user, ช่วงวันที่ |
| **Retention Policy** | กำหนดนโยบายลบ log เก่า เช่น เก็บ CRITICAL 1 ปี, LOW 30 วัน — ใช้ cron job |
| **Export** | รองรับ export เป็น CSV/JSON สำหรับ compliance report |
| **Real-time Alert** | ใช้ webhook/email แจ้งเตือนเมื่อเกิด CRITICAL action (เช่น delete user, impersonate) |
| **Immutability** | Audit log ควรเป็น **append-only** — ไม่ควรมี UPDATE หรือ DELETE (ยกเว้น retention cleanup) |
| **External Service** | ส่ง log ไปยัง external service เช่น Datadog, Sentry, AWS CloudWatch เพื่อ centralized logging |
| **Performance** | ใช้ queue (BullMQ, Inngest) สำหรับ write log แบบ async เพื่อไม่ให้กระทบ response time |

#### B.7 ER Diagram — AuditLog

```
┌──────────────────────────────────────────────────────────┐
│                        AuditLog                          │
├──────────────────────────────────────────────────────────┤
│ id          : String       (PK, cuid)                    │
│ userId      : String       (FK → User.id)                │
│ userRole    : String       (role ณ ขณะกระทำ)             │
│ action      : String       (เช่น "admin.ban_user")         │
│ severity    : String       (CRITICAL/HIGH/MEDIUM/LOW)    │
│ targetType  : String?      ("user", "project" ฯลฯ)       │
│ targetId    : String?      (ID ของ target)               │
│ metadata    : Json?        (ข้อมูลเพิ่มเติม)                   │
│ ipAddress   : String?      (IP ผู้กระทำ)                   │
│ userAgent   : String?      (Browser/Device)              │
│ createdAt   : DateTime     (auto)                        │
├──────────────────────────────────────────────────────────┤
│ @@index: userId, action, severity,                       │
│          (targetType + targetId), createdAt              │
└──────────────────────────────────────────────────────────┘
          │
          │ userId (FK)
          ▼
┌──────────────────────┐
│        User          │
├──────────────────────┤
│ id    : String (PK)  │
│ name  : String       │
│ email : String       │
│ role  : String       │
│ ...                  │
│ auditLogs: AuditLog[]│
└──────────────────────┘
```

> **สรุป:** Audit Log เป็นพื้นฐานสำคัญของระบบ Production ที่ช่วยให้ทีมพัฒนาและทีม Security ตรวจสอบการกระทำทั้งหมดในระบบได้ การวางโครงสร้างตั้งแต่เริ่มต้นจะทำให้ขยายระบบในอนาคตได้ง่ายขึ้นมาก

### Section 11: Multi-Factor Authentication (MFA) & Email Features

#### 11.1 อัปเดต Prisma Schema สำหรับ 2FA

Better Auth Two-Factor Plugin ต้องการ field `twoFactorEnabled` บน User model และ model `TwoFactor` สำหรับเก็บ TOTP secret + backup codes

**ติดตั้ง QR Code Library:**
```bash
pnpm install qrcode 
pnpm install -D @types/qrcode
```

**อัปเดต `prisma/schema.prisma`:**

เพิ่ม field ใน User model:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String    @default("user")
  banned        Boolean?
  banReason     String?
  banExpires    DateTime?
  twoFactorEnabled Boolean? @default(false) // ← เพิ่มใหม่
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions   Session[]
  accounts   Account[]
  twoFactors TwoFactor[] // ← เพิ่มใหม่

  @@map("user")
}
```

สร้าง TwoFactor model ใหม่:
```prisma
// ==========================================
// Better Auth Two-Factor Plugin
// ==========================================

model TwoFactor {
  id          String  @id @default(cuid())
  userId      String
  secret      String
  backupCodes String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("twoFactor")
}
```

**รัน Migration:**
```bash
npx prisma migrate dev --name add_two_factor
npx prisma generate
```

#### 11.2 ตั้งค่า Two-Factor Plugin (Server & Client)

**อัปเดต `lib/auth.ts` — เพิ่ม twoFactor plugin:**

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/lib/prisma"
import { admin as adminPlugin, twoFactor } from "better-auth/plugins"
import { ac, admin, manager, user } from "@/lib/permissions"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // ... socialProviders, account linking ...
  appName: "AI Native App", // ← ใช้เป็นชื่อใน Authenticator app
  plugins: [
    adminPlugin({
      ac,
      roles: { admin, manager, user },
    }),
    twoFactor({
      issuer: "AI Native App",         // ← ชื่อที่แสดงใน Authenticator
      skipVerificationOnEnable: false,  // ← บังคับยืนยัน OTP ก่อนเปิดใช้จริง
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 1 day
  },
})
```

> **สำคัญ:** `skipVerificationOnEnable: false` หมายความว่าหลังสร้าง QR Code ผู้ใช้ต้องใส่ OTP 6 หลักจากแอป Authenticator ให้ถูกต้องก่อน 2FA จะเปิดใช้งานจริง

**อัปเดต `lib/auth-client.ts` — เพิ่ม twoFactorClient:**

```typescript
import { createAuthClient } from "better-auth/react"
import { adminClient, twoFactorClient } from "better-auth/client/plugins"
import { ac, admin, manager, user } from "./permissions"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    adminClient({
      ac,
      roles: { admin, manager, user },
    }),
    twoFactorClient({
      onTwoFactorRedirect() {
        // เมื่อ Sign-in สำเร็จแต่ต้องยืนยัน 2FA → redirect ไปหน้า verify
        window.location.href = "/auth/verify-2fa"
      },
    }),
  ],
})

export const { signIn, signUp, signOut, useSession } = authClient
```

> **Flow:** เมื่อผู้ใช้ที่เปิด 2FA ไว้ทำการ Sign-in → Better Auth จะเรียก `onTwoFactorRedirect()` แทนที่จะให้ session ทันที → ผู้ใช้ต้องยืนยัน TOTP ก่อน

**Better Auth 2FA Client APIs:**
| API | ใช้เมื่อ |
|-----|---------|
| `authClient.twoFactor.enable({ password })` | เปิดใช้งาน 2FA → ได้ `totpURI` + `backupCodes` |
| `authClient.twoFactor.verifyTotp({ code })` | ยืนยัน OTP 6 หลัก (ตอน enable หรือตอน sign-in) |
| `authClient.twoFactor.disable({ password })` | ปิด 2FA |
| `authClient.twoFactor.verifyBackupCode({ code, trustDevice })` | ใช้ Backup Code เข้าสู่ระบบ |

#### 11.3 เพิ่ม TOTP UI ในหน้า Profile

ในไฟล์ `app/(main)/profile/ProfileForm.tsx` เพิ่ม Card ที่ 3 สำหรับจัดการ 2FA:

**เพิ่ม State สำหรับ TOTP:**
```tsx
import { ShieldCheck, ShieldOff, QrCode, Copy, KeyRound } from "lucide-react"
import QRCode from "qrcode"

// ── TOTP State ─────────────────────────────────────────
const [totpStep, setTotpStep] = useState<"idle" | "setup" | "verify" | "done">("idle")
const [totpPassword, setTotpPassword] = useState("")
const [qrDataUrl, setQrDataUrl] = useState("")
const [totpUri, setTotpUri] = useState("")
const [backupCodes, setBackupCodes] = useState<string[]>([])
const [verifyCode, setVerifyCode] = useState("")
const [totpLoading, setTotpLoading] = useState(false)
const [totpError, setTotpError] = useState("")
const [totpSuccess, setTotpSuccess] = useState("")
const [disablePassword, setDisablePassword] = useState("")
const [disableLoading, setDisableLoading] = useState(false)
```

**TOTP Handlers — Enable → Verify → Disable:**
```tsx
// ตรวจสอบสถานะ 2FA จาก session
const isTwoFactorEnabled =
  (session.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled === true

// ── เปิดใช้งาน 2FA ──
const handleEnableTotp = async () => {
  if (!totpPassword) {
    setTotpError("กรุณากรอกรหัสผ่านเพื่อเปิดใช้งาน 2FA")
    return
  }
  setTotpLoading(true)
  setTotpError("")

  try {
    const res = await authClient.twoFactor.enable({
      password: totpPassword,
    })

    if (res.error) {
        if(res.error.code === "INVALID_PASSWORD") {
            setTotpError("รหัสผ่านไม่ถูกต้อง")
            return
        }
        setTotpError(res.error.message || "เกิดข้อผิดพลาด")
        return
    }

    if (res.data?.totpURI) {
      // สร้าง QR Code จาก TOTP URI ด้วย qrcode library
      const dataUrl = await QRCode.toDataURL(res.data.totpURI, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
      setQrDataUrl(dataUrl)
      setTotpUri(res.data.totpURI)
      setBackupCodes(res.data.backupCodes ?? [])
      setTotpStep("verify") // ไปขั้นตอนยืนยัน OTP
    }
  } catch {
    setTotpError("เกิดข้อผิดพลาดในการเปิดใช้งาน 2FA")
  } finally {
    setTotpLoading(false)
  }
}

// ── ยืนยัน TOTP Code ──
const handleVerifyTotp = async () => {
  if (!verifyCode || verifyCode.length !== 6) {
    setTotpError("กรุณากรอกรหัส 6 หลักจากแอป Authenticator")
    return
  }
  setTotpLoading(true)
  setTotpError("")

  try {
    const res = await authClient.twoFactor.verifyTotp({
      code: verifyCode,
    })

    if (res.error) {
      setTotpError(res.error.message || "รหัสไม่ถูกต้อง")
      return
    }

    setTotpSuccess("เปิดใช้งาน 2FA สำเร็จ!")
    setTotpStep("done")
    setTimeout(() => {
      setTotpSuccess("")
      setTotpStep("idle")
      setTotpPassword("")
      setVerifyCode("")
      setQrDataUrl("")
      setTotpUri("")
    }, 5000)
  } catch {
    setTotpError("เกิดข้อผิดพลาดในการยืนยัน")
  } finally {
    setTotpLoading(false)
  }
}

// ── ปิด 2FA ──
const handleDisableTotp = async () => {
  if (!disablePassword) {
    setTotpError("กรุณากรอกรหัสผ่านเพื่อปิด 2FA")
    return
  }
  setDisableLoading(true)
  setTotpError("")

  try {
    const res = await authClient.twoFactor.disable({
      password: disablePassword,
    })

    if (res.error) {
      setTotpError(res.error.message || "เกิดข้อผิดพลาด")
      return
    }

    setTotpSuccess("ปิด 2FA สำเร็จ!")
    setDisablePassword("")
    setTimeout(() => setTotpSuccess(""), 3000)
  } catch {
    setTotpError("เกิดข้อผิดพลาดในการปิด 2FA")
  } finally {
    setDisableLoading(false)
  }
}
```

**2FA Card UI — สถานะ + เปิด/ปิด + QR Code + Backup Codes:**
```tsx
{/* ── Two-Factor Authentication Card ── */}
<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
    <ShieldCheck className="w-5 h-5 text-purple-500" />
    การยืนยันตัวตนสองขั้นตอน (2FA)
  </h2>

  {/* สถานะ */}
  <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-muted/50">
    {isTwoFactorEnabled ? (
      <>
        <ShieldCheck className="w-5 h-5 text-green-500" />
        <div>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">เปิดใช้งานแล้ว</p>
          <p className="text-xs text-muted-foreground">บัญชีของคุณได้รับการปกป้องด้วย 2FA</p>
        </div>
      </>
    ) : (
      <>
        <ShieldOff className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">ยังไม่เปิดใช้งาน</p>
          <p className="text-xs text-muted-foreground">เปิดใช้งาน 2FA เพื่อเพิ่มความปลอดภัย</p>
        </div>
      </>
    )}
  </div>

  {/* ── ยังไม่เปิด 2FA → ฟอร์มกรอก Password เพื่อเริ่มตั้งค่า ── */}
  {!isTwoFactorEnabled && totpStep === "idle" && (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        กรอกรหัสผ่านของคุณเพื่อเริ่มตั้งค่า 2FA ด้วยแอป Authenticator
      </p>
      {/* Password input + ปุ่ม "เปิดใช้งาน 2FA" */}
    </div>
  )}

  {/* ── QR Code + Backup Codes + Verify ── */}
  {totpStep === "verify" && (
    <div className="space-y-4">
      {/* QR Code Image */}
      {qrDataUrl && (
        <div className="inline-block p-3 bg-white rounded-xl shadow-sm border">
          <Image src={qrDataUrl} alt="TOTP QR Code" width={200} height={200} />
        </div>
      )}

      {/* Manual TOTP URI (คัดลอกได้) */}
      {/* Backup Codes (grid + copy all) */}
      {/* OTP 6-digit input + verify button */}
    </div>
  )}

  {/* ── เปิดอยู่แล้ว → ฟอร์มกรอก Password เพื่อปิด 2FA ── */}
  {isTwoFactorEnabled && totpStep === "idle" && (
    <div className="space-y-4">
      {/* Password input + ปุ่มสีแดง "ปิด 2FA" */}
    </div>
  )}
</div>
```

โค้ดเต็มของหน้า ProfileForm พร้อมฟีเจอร์ 2FA จะอยู่ในไฟล์ `app/(main)/profile/ProfileForm.tsx`

```tsx
"use client"

import { useState } from "react"
import { authClient, useSession } from "@/lib/auth-client"
import {
    User, Mail, Save, Loader2, CheckCircle, AlertCircle,
    Lock, Eye, EyeOff, ShieldCheck, ShieldOff, QrCode, Copy, KeyRound
} from "lucide-react"
import Image from "next/image"
import QRCode from "qrcode"

export default function ProfileForm() {
    const { data: session, isPending } = useSession()

    // ── Profile State ──────────────────────────────────────
    const [name, setName] = useState("")
    const [nameInitialized, setNameInitialized] = useState(false)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState("")
    const [error, setError] = useState("")

    // ── Password State ─────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordSaving, setPasswordSaving] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState("")
    const [passwordError, setPasswordError] = useState("")

    // ── TOTP State ─────────────────────────────────────────
    const [totpStep, setTotpStep] = useState<"idle" | "setup" | "verify" | "done">("idle")
    const [totpPassword, setTotpPassword] = useState("")
    const [showTotpPassword, setShowTotpPassword] = useState(false)
    const [qrDataUrl, setQrDataUrl] = useState("")
    const [totpUri, setTotpUri] = useState("")
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [verifyCode, setVerifyCode] = useState("")
    const [totpLoading, setTotpLoading] = useState(false)
    const [totpError, setTotpError] = useState("")
    const [totpSuccess, setTotpSuccess] = useState("")
    const [disablePassword, setDisablePassword] = useState("")
    const [showDisablePassword, setShowDisablePassword] = useState(false)
    const [disableLoading, setDisableLoading] = useState(false)

    // ── Initialize name from session ───────────────────────
    if (session && !nameInitialized) {
        setName(session.user?.name || "")
        setNameInitialized(true)
    }

    // ── Handlers ───────────────────────────────────────────
    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            setError("กรุณากรอกชื่อ")
            return
        }

        setSaving(true)
        setError("")
        setSuccess("")

        try {
            const res = await authClient.updateUser({
                name: name.trim(),
            })

            if (res.error) {
                setError(res.error.message || "เกิดข้อผิดพลาด")
            } else {
                setSuccess("อัปเดตโปรไฟล์สำเร็จ!")
                setTimeout(() => setSuccess(""), 3000)
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการอัปเดต")
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async () => {
        setPasswordError("")
        setPasswordSuccess("")

        if (!currentPassword) {
            setPasswordError("กรุณากรอกรหัสผ่านปัจจุบัน")
            return
        }
        if (!newPassword) {
            setPasswordError("กรุณากรอกรหัสผ่านใหม่")
            return
        }
        if (newPassword.length < 8) {
            setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("รหัสผ่านใหม่ไม่ตรงกัน")
            return
        }

        setPasswordSaving(true)

        try {
            const res = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            })

            if (res.error) {
                setPasswordError(res.error.message || "เกิดข้อผิดพลาด")
            } else {
                setPasswordSuccess("เปลี่ยนรหัสผ่านสำเร็จ!")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setTimeout(() => setPasswordSuccess(""), 3000)
            }
        } catch {
            setPasswordError("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน")
        } finally {
            setPasswordSaving(false)
        }
    }

    // ── TOTP Handlers ──────────────────────────────────────
    const handleEnableTotp = async () => {
        if (!totpPassword) {
            setTotpError("กรุณากรอกรหัสผ่านเพื่อเปิดใช้งาน 2FA")
            return
        }

        setTotpLoading(true)
        setTotpError("")

        try {
            const res = await authClient.twoFactor.enable({
                password: totpPassword,
            })

            if (res.error) {
                if(res.error.code === "INVALID_PASSWORD") {
                    setTotpError("รหัสผ่านไม่ถูกต้อง")
                    return
                }
                setTotpError(res.error.message || "เกิดข้อผิดพลาด")
                return
            }

            if (res.data?.totpURI) {
                // สร้าง QR Code จาก TOTP URI
                const dataUrl = await QRCode.toDataURL(res.data.totpURI, {
                    width: 200,
                    margin: 2,
                    color: { dark: "#000000", light: "#ffffff" },
                })
                setQrDataUrl(dataUrl)
                setTotpUri(res.data.totpURI)
                setBackupCodes(res.data.backupCodes ?? [])
                setTotpStep("verify")
            }
        } catch {
            setTotpError("เกิดข้อผิดพลาดในการเปิดใช้งาน 2FA")
        } finally {
            setTotpLoading(false)
        }
    }

    const handleVerifyTotp = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            setTotpError("กรุณากรอกรหัส 6 หลักจากแอป Authenticator")
            return
        }

        setTotpLoading(true)
        setTotpError("")

        try {
            const res = await authClient.twoFactor.verifyTotp({
                code: verifyCode,
            })

            if (res.error) {
                if(res.error.code === "INVALID_CODE") {
                    setTotpError("รหัส 2FA ไม่ถูกต้อง")
                    return
                }
                setTotpError(res.error.message || "รหัสไม่ถูกต้อง")
                return
            }

            setTotpSuccess("เปิดใช้งาน 2FA สำเร็จ!")
            setTotpStep("done")
            setTimeout(() => {
                setTotpSuccess("")
                setTotpStep("idle")
                setTotpPassword("")
                setVerifyCode("")
                setQrDataUrl("")
                setTotpUri("")
            }, 5000)
        } catch {
            setTotpError("เกิดข้อผิดพลาดในการยืนยัน")
        } finally {
            setTotpLoading(false)
        }
    }

    const handleDisableTotp = async () => {
        if (!disablePassword) {
            setTotpError("กรุณากรอกรหัสผ่านเพื่อปิด 2FA")
            return
        }

        setDisableLoading(true)
        setTotpError("")

        try {
            const res = await authClient.twoFactor.disable({
                password: disablePassword,
            })

            if (res.error) {
                if(res.error.code === "INVALID_PASSWORD") {
                    setTotpError("รหัสผ่านไม่ถูกต้อง")
                    return
                }
                setTotpError(res.error.message || "เกิดข้อผิดพลาด")
                return
            }

            setTotpSuccess("ปิด 2FA สำเร็จ!")
            setDisablePassword("")
            setTimeout(() => setTotpSuccess(""), 3000)
        } catch {
            setTotpError("เกิดข้อผิดพลาดในการปิด 2FA")
        } finally {
            setDisableLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    // ── Loading ────────────────────────────────────────────
    if (isPending) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (!session) return null

    const initials = (session.user?.name || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    const userRole = (session.user as { role?: string })?.role || "user"
    const isTwoFactorEnabled = (session.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled === true

    // ── Render ─────────────────────────────────────────────
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* ── Profile Card ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-500" />
                    ข้อมูลโปรไฟล์
                </h2>

                {/* Avatar + Info */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    {session.user?.image ? (
                        <Image
                            src={session.user.image}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full ring-2 ring-purple-200 dark:ring-purple-800"
                            width={64}
                            height={64}
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-2 ring-purple-200 dark:ring-purple-800">
                            <span className="text-xl font-bold text-white">{initials}</span>
                        </div>
                    )}
                    <div>
                        <p className="text-base font-semibold text-foreground">{session.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            {userRole.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            <Mail className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
                            อีเมล
                        </label>
                        <input
                            type="email"
                            value={session.user?.email || ""}
                            disabled
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">อีเมลไม่สามารถเปลี่ยนได้</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            <User className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
                            ชื่อ
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="กรอกชื่อของคุณ"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                        />
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleUpdateProfile}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Change Password Card ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-purple-500" />
                    เปลี่ยนรหัสผ่าน
                </h2>

                <div className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            รหัสผ่านปัจจุบัน
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="กรอกรหัสผ่านปัจจุบัน"
                                className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                            >
                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            รหัสผ่านใหม่
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            ยืนยันรหัสผ่านใหม่
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Password Messages */}
                    {passwordError && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            {passwordSuccess}
                        </div>
                    )}

                    {/* Change Password Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleChangePassword}
                            disabled={passwordSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                        >
                            {passwordSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            {passwordSaving ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Two-Factor Authentication Card ── */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-500" />
                    การยืนยันตัวตนสองขั้นตอน (2FA)
                </h2>

                {/* สถานะปัจจุบัน */}
                <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-muted/50">
                    {isTwoFactorEnabled ? (
                        <>
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">เปิดใช้งานแล้ว</p>
                                <p className="text-xs text-muted-foreground">บัญชีของคุณได้รับการปกป้องด้วย 2FA</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <ShieldOff className="w-5 h-5 text-amber-500" />
                            <div>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">ยังไม่เปิดใช้งาน</p>
                                <p className="text-xs text-muted-foreground">เปิดใช้งาน 2FA เพื่อเพิ่มความปลอดภัย</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Messages */}
                {totpError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {totpError}
                    </div>
                )}
                {totpSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg mb-4">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {totpSuccess}
                    </div>
                )}

                {/* ── ยังไม่เปิด 2FA → แสดงฟอร์มเปิด ── */}
                {!isTwoFactorEnabled && totpStep === "idle" && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            กรอกรหัสผ่านของคุณเพื่อเริ่มตั้งค่า 2FA ด้วยแอป Authenticator (เช่น Google Authenticator, Authy)
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">รหัสผ่าน</label>
                            <div className="relative">
                                <input
                                    type={showTotpPassword ? "text" : "password"}
                                    value={totpPassword}
                                    onChange={(e) => setTotpPassword(e.target.value)}
                                    placeholder="กรอกรหัสผ่านของคุณ"
                                    className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTotpPassword(!showTotpPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                                >
                                    {showTotpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleEnableTotp}
                                disabled={totpLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                            >
                                {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                {totpLoading ? "กำลังสร้าง QR Code..." : "เปิดใช้งาน 2FA"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── สแกน QR Code + ยืนยัน ── */}
                {totpStep === "verify" && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground mb-3">
                                สแกน QR Code ด้วยแอป Authenticator
                            </p>
                            {qrDataUrl && (
                                <div className="inline-block p-3 bg-white rounded-xl shadow-sm border border-border">
                                    <Image src={qrDataUrl} alt="TOTP QR Code" width={200} height={200} />
                                </div>
                            )}
                        </div>

                        {/* Manual URI */}
                        {totpUri && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">หรือกรอก Secret Key ด้วยตนเอง:</p>
                                <div className="flex gap-2">
                                    <code className="flex-1 px-2 py-1.5 bg-muted rounded text-xs break-all font-mono">
                                        {totpUri}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(totpUri)}
                                        className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition"
                                        title="คัดลอก"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Backup Codes */}
                        {backupCodes.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                    <KeyRound className="w-4 h-4" />
                                    Backup Codes — บันทึกไว้ในที่ปลอดภัย!
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                                    ใช้สำหรับเข้าสู่ระบบเมื่อไม่มีแอป Authenticator แต่ละรหัสใช้ได้ครั้งเดียว
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {backupCodes.map((code, i) => (
                                        <code key={i} className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs font-mono text-center">
                                            {code}
                                        </code>
                                    ))}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(backupCodes.join("\n"))}
                                    className="mt-2 text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                                >
                                    <Copy className="w-3 h-3" /> คัดลอกทั้งหมด
                                </button>
                            </div>
                        )}

                        {/* Verify Code */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                กรอกรหัส 6 หลักจากแอป Authenticator
                            </label>
                            <input
                                type="text"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                            />
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => { setTotpStep("idle"); setTotpError(""); setVerifyCode("") }}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleVerifyTotp}
                                disabled={totpLoading || verifyCode.length !== 6}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                            >
                                {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                {totpLoading ? "กำลังยืนยัน..." : "ยืนยันและเปิดใช้งาน"}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── เปิดอยู่แล้ว → แสดงปุ่มปิด ── */}
                {isTwoFactorEnabled && totpStep === "idle" && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            กรอกรหัสผ่านเพื่อปิดการยืนยันตัวตนสองขั้นตอน
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">รหัสผ่าน</label>
                            <div className="relative">
                                <input
                                    type={showDisablePassword ? "text" : "password"}
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    placeholder="กรอกรหัสผ่านของคุณ"
                                    className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDisablePassword(!showDisablePassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                                >
                                    {showDisablePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleDisableTotp}
                                disabled={disableLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                            >
                                {disableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                                {disableLoading ? "กำลังปิด..." : "ปิด 2FA"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
```

> **Flow สรุป:**
> 1. ผู้ใช้กรอก Password → คลิก "เปิดใช้งาน 2FA"
> 2. ระบบเรียก `twoFactor.enable({ password })` → ได้ TOTP URI + Backup Codes
> 3. สร้าง QR Code ด้วย `QRCode.toDataURL()` → แสดงให้สแกน
> 4. ผู้ใช้สแกน QR ด้วย Google Authenticator / Authy → กรอกรหัส 6 หลัก
> 5. เรียก `twoFactor.verifyTotp({ code })` → เปิดใช้งานสำเร็จ
> 6. Backup Codes แสดงเป็น grid ให้บันทึกไว้ (ใช้ได้ครั้งเดียวต่อรหัส)

#### 11.4 สร้างหน้า Verify 2FA (Sign-in Flow)

เมื่อผู้ใช้ที่เปิด 2FA ทำการ Sign-in → `twoFactorClient` จะเรียก `onTwoFactorRedirect()` → redirect มาที่หน้านี้

สร้างไฟล์ `app/(auth)/auth/verify-2fa/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { ShieldCheck, Loader2, AlertCircle, KeyRound } from "lucide-react"
import Link from "next/link"

export default function Verify2FAPage() {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [useBackupCode, setUseBackupCode] = useState(false)

    const handleVerifyTotp = async () => {
        if (!code) {
            setError("กรุณากรอกรหัส")
            return
        }

        setLoading(true)
        setError("")

        try {
            const res = await authClient.twoFactor.verifyTotp({
                code,
                trustDevice: true,
            })

            if (res.error) {
                if(res.error.code === "INVALID_CODE") {
                    setError("รหัส 2FA ไม่ถูกต้อง")
                    return
                }
                setError(res.error.message || "รหัสไม่ถูกต้อง")
            } else {
                window.location.href = "/dashboard"
            }
        } catch {
            setError("เกิดข้อผิดพลาด")
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyBackupCode = async () => {
        if (!code) {
            setError("กรุณากรอก Backup Code")
            return
        }

        setLoading(true)
        setError("")

        try {
            const res = await authClient.twoFactor.verifyBackupCode({
                code,
                trustDevice: true,
            })

            if (res.error) {
                if(res.error.code === "INVALID_BACKUP_CODE") {
                    setError("Backup Code ไม่ถูกต้อง")
                    return
                }
                setError(res.error.message || "Backup Code ไม่ถูกต้อง")
            } else {
                window.location.href = "/dashboard"
            }
        } catch {
            setError("เกิดข้อผิดพลาด")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="max-w-md w-full p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                        {useBackupCode ? (
                            <KeyRound className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                        ) : (
                            <ShieldCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {useBackupCode ? "Backup Code" : "ยืนยันตัวตน 2FA"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {useBackupCode
                            ? "กรอก Backup Code ที่คุณบันทึกไว้"
                            : "กรอกรหัส 6 หลักจากแอป Authenticator"
                        }
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => {
                            if (useBackupCode) {
                                setCode(e.target.value)
                            } else {
                                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                        }}
                        placeholder={useBackupCode ? "Backup Code" : "000000"}
                        maxLength={useBackupCode ? 20 : 6}
                        autoFocus
                        className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                useBackupCode ? handleVerifyBackupCode() : handleVerifyTotp()
                            }
                        }}
                    />

                    <button
                        onClick={useBackupCode ? handleVerifyBackupCode : handleVerifyTotp}
                        disabled={loading || !code}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {loading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
                    </button>

                    <div className="text-center">
                        <button
                            onClick={() => { setUseBackupCode(!useBackupCode); setCode(""); setError("") }}
                            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                        >
                            {useBackupCode ? "ใช้รหัสจากแอป Authenticator แทน" : "ใช้ Backup Code แทน"}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/auth/signin" className="text-sm text-muted-foreground hover:text-foreground transition">
                            กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

> **`trustDevice: true`** — หลังยืนยัน 2FA สำเร็จ อุปกรณ์นี้จะถูกจดจำไว้ ไม่ต้องยืนยัน 2FA อีกในครั้งถัดไป


#### 11.5 Verify Email ผ่าน Gmail (Email Provider)

**ติดตั้ง Nodemailer:**
```bash
pnpm install nodemailer 
pnpm add -D @types/nodemailer
```

**สร้าง Gmail App Password:**
1. ไปที่ https://myaccount.google.com/security
2. เปิดใช้งาน **2-Step Verification**
3. ไปที่ **App passwords** → สร้าง App Password ใหม่ ไปที่ลิงก์นี้ก็ได้: https://myaccount.google.com/apppasswords
4. คัดลอก Password ที่ได้ไปใส่ใน `.env` (GMAIL_APP_PASSWORD)

**เพิ่มตัวแปรใน `.env`:**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
GMAIL_USER="your@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

**อัปเดต `lib/auth.ts` — เพิ่ม Nodemailer + Email Verification:**

เพิ่ม import nodemailer และสร้าง SMTP transporter ที่ด้านบนของไฟล์:

```typescript
import nodemailer from "nodemailer"

// สร้าง SMTP transporter สำหรับ Gmail
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
})
```

จากนั้นเพิ่ม `emailVerification` block ใน Better Auth config:

```typescript
export const auth = betterAuth({
    // ... database, emailAndPassword config ...
    emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            await transporter.sendMail({
                from: `"AI Native App" <${process.env.GMAIL_USER}>`,
                to: user.email,
                subject: "ยืนยันอีเมลของคุณ - AI Native App",
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                        <h1 style="color: #7c3aed; font-size: 24px;">ยืนยันอีเมล</h1>
                        <p>สวัสดีคุณ ${user.name},</p>
                        <p>คลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
                        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">
                            ยืนยันอีเมล
                        </a>
                        <p style="color: #9ca3af; font-size: 12px;">หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยอีเมลนี้</p>
                    </div>
                `,
            })
        },
    },
    // ... socialProviders, plugins, session ...
})
```

> **`sendOnSignUp: true`** — ส่งอีเมลยืนยันอัตโนมัติเมื่อสมัครสมาชิกใหม่

**เพิ่ม Email Verification Card ใน `ProfileForm.tsx`:**

เพิ่ม import icons:
```tsx
import { MailCheck, MailX, Send } from "lucide-react"
```

เพิ่ม state สำหรับ Email Verification:
```tsx
// ── Email Verification State ───────────────────────────
const [emailVerifySending, setEmailVerifySending] = useState(false)
const [emailVerifySuccess, setEmailVerifySuccess] = useState("")
const [emailVerifyError, setEmailVerifyError] = useState("")
```

เพิ่ม handler สำหรับส่งอีเมลยืนยัน:
```tsx
// ── Email Verification Handler ─────────────────────────
const handleSendVerificationEmail = async () => {
    setEmailVerifySending(true)
    setEmailVerifyError("")
    setEmailVerifySuccess("")

    try {
        const res = await authClient.sendVerificationEmail({
            email: session?.user?.email || "",
            callbackURL: "/auth/verify-email",
        })

        if (res.error) {
            setEmailVerifyError(res.error.message || "เกิดข้อผิดพลาด")
        } else {
            setEmailVerifySuccess("ส่งอีเมลยืนยันสำเร็จ! กรุณาตรวจสอบอีเมลของคุณ")
            setTimeout(() => setEmailVerifySuccess(""), 5000)
        }
    } catch {
        setEmailVerifyError("เกิดข้อผิดพลาดในการส่งอีเมล")
    } finally {
        setEmailVerifySending(false)
    }
}
```

เพิ่ม derived state:
```tsx
const isEmailVerified = session.user?.emailVerified === true
```

เพิ่ม Email Verification Card (ระหว่าง Profile Card กับ Change Password Card):

```tsx
{/* ── Email Verification Card ── */}
<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Mail className="w-5 h-5 text-purple-500" />
        สถานะยืนยันอีเมล
    </h2>

    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
        {isEmailVerified ? (
            <>
                <MailCheck className="w-5 h-5 text-green-500" />
                <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">ยืนยันอีเมลแล้ว</p>
                    <p className="text-xs text-muted-foreground">อีเมล {session.user?.email} ได้รับการยืนยันแล้ว</p>
                </div>
            </>
        ) : (
            <>
                <MailX className="w-5 h-5 text-amber-500" />
                <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">ยังไม่ได้ยืนยันอีเมล</p>
                    <p className="text-xs text-muted-foreground">กรุณายืนยันอีเมลเพื่อเปิดใช้งานฟีเจอร์ทั้งหมด</p>
                </div>
            </>
        )}
    </div>

    {/* ถ้ายังไม่ verify → แสดงปุ่มส่งอีเมลยืนยัน */}
    {!isEmailVerified && (
        <div className="flex justify-end">
            <button
                onClick={handleSendVerificationEmail}
                disabled={emailVerifySending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
                {emailVerifySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {emailVerifySending ? "กำลังส่ง..." : "ส่งอีเมลยืนยัน"}
            </button>
        </div>
    )}
</div>
```

> **Flow:** กดปุ่ม "ส่งอีเมลยืนยัน" → `authClient.sendVerificationEmail()` → เซิร์ฟเวอร์เรียก `sendVerificationEmail` ใน auth.ts → ส่ง Gmail พร้อมลิงก์ verify → ผู้ใช้คลิกลิงก์ → redirect ไปหน้า `/auth/verify-email?token=xxx`

---

#### 11.6 สร้างหน้า Verify Email

สร้างไฟล์ `app/(auth)/auth/verify-email/page.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { MailCheck, Loader2, AlertCircle, Sparkles } from "lucide-react"
import Link from "next/link"

export default function VerifyEmailPage() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        // อ่าน token จาก URL query parameter
        const params = new URLSearchParams(window.location.search)
        const token = params.get("token")

        if (!token) {
            setStatus("error")
            setErrorMessage("ไม่พบ Token สำหรับยืนยันอีเมล")
            return
        }

        // เรียก Better Auth verify email
        authClient.verifyEmail({ query: { token } }).then((res) => {
            if (res.error) {
                setStatus("error")
                setErrorMessage(res.error.message || "ไม่สามารถยืนยันอีเมลได้")
            } else {
                setStatus("success")
            }
        }).catch(() => {
            setStatus("error")
            setErrorMessage("เกิดข้อผิดพลาดในการยืนยันอีเมล")
        })
    }, [])

    return (
        <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold">AI Native App</span>
            </div>

            {status === "loading" && (
                <div className="flex flex-col items-center space-y-4 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                    <h1 className="text-2xl font-semibold tracking-tight">
                        กำลังยืนยันอีเมล...
                    </h1>
                    <p className="text-sm text-muted-foreground">กรุณารอสักครู่</p>
                </div>
            )}

            {status === "success" && (
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                        <MailCheck className="h-8 w-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        ยืนยันอีเมลสำเร็จ!
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
                    >
                        ไปหน้า Dashboard
                    </Link>
                </div>
            )}

            {status === "error" && (
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        ยืนยันอีเมลไม่สำเร็จ
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {errorMessage}
                    </p>
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
                    >
                        กลับไปหน้าโปรไฟล์
                    </Link>
                </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
                <Link
                    href="/auth/signin"
                    className="font-medium text-purple-500 hover:text-purple-400"
                >
                    กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </p>
        </div>
    )
}
```

> **Flow:** ผู้ใช้คลิกลิงก์ในอีเมล → Redirect มาที่ `/auth/verify-email?token=xxx` → `useEffect` อ่าน token → `authClient.verifyEmail({ query: { token } })` → แสดง Loading → Success (MailCheck สีเขียว) หรือ Error (AlertCircle สีแดง)

> หน้านี้อยู่ภายใต้ `(auth)` route group → ใช้ Auth Layout (split-screen กับ AuthBranding)

---

#### 11.7 Forgot Password ผ่าน Gmail

**เพิ่ม `sendResetPassword` ใน `emailAndPassword` config ของ `lib/auth.ts`:**

```typescript
emailAndPassword: {
  enabled: true,
  sendResetPassword: async ({ user, url }) => {
      await transporter.sendMail({
          from: `"AI Native App" <${process.env.GMAIL_USER}>`,
          to: user.email,
          subject: "รีเซ็ตรหัสผ่าน - AI Native App",
          html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h1 style="color: #7c3aed; font-size: 24px;">รีเซ็ตรหัสผ่าน</h1>
                  <p>สวัสดีคุณ ${user.name},</p>
                  <p>เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
                  <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0;">
                      ตั้งรหัสผ่านใหม่
                  </a>
                  <p style="color: #6b7280; font-size: 14px;">ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</p>
                  <p style="color: #9ca3af; font-size: 12px;">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>
              </div>
          `,
      })
  },
},
```

**Client API ที่ใช้:** `authClient.requestPasswordReset()` (ไม่ใช่ `forgetPassword`)

```tsx
const res = await authClient.requestPasswordReset({
    email,
    redirectTo: "/auth/reset-password",
})
```

> **`sendResetPassword`** — เมื่อ client เรียก `requestPasswordReset({ email })` เซิร์ฟเวอร์จะเรียก callback นี้ → ส่ง Gmail พร้อมลิงก์ reset → ลิงก์จะ redirect ไป `/auth/reset-password?token=xxx`

---

#### 11.8 สร้างหน้า Forgot Password & Reset Password

**อัปเดต `app/(auth)/auth/forgot-password/ForgotPasswordForm.tsx`:**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const res = await authClient.requestPasswordReset({
                email,
                redirectTo: "/auth/reset-password",
            })

            if (res.error) {
                setError(res.error.message || "เกิดข้อผิดพลาด")
            } else {
                setIsSubmitted(true)
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการส่งอีเมล")
        } finally {
            setIsLoading(false)
        }
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
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

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

> **สำคัญ:** Client API ที่ถูกต้องคือ `authClient.requestPasswordReset()` ไม่ใช่ `forgetPassword()`

**สร้างหน้า Reset Password — `app/(auth)/auth/reset-password/page.tsx`:**

```tsx
import { Metadata } from "next"
import ResetPasswordForm from "./ResetPasswordForm"

export const metadata: Metadata = {
    title: "ตั้งรหัสผ่านใหม่",
    description:
        "ตั้งรหัสผ่านใหม่ AI Native App — กรอกรหัสผ่านใหม่เพื่อเข้าสู่ระบบอีกครั้ง",
}

export default function ResetPasswordPage() {
    return <ResetPasswordForm />
}

```

**สร้าง `app/(auth)/auth/reset-password/ResetPasswordForm.tsx`:**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export default function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState(token ? "" : "ลิงก์ไม่ถูกต้องหรือหมดอายุ")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (password.length < 8) {
            setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
            return
        }

        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน")
            return
        }

        setIsLoading(true)

        try {
            const res = await authClient.resetPassword({
                newPassword: password,
                token: token!,
            })

            if (res.error) {
                setError(res.error.message || "เกิดข้อผิดพลาด")
            } else {
                setIsSuccess(true)
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่")
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
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
                        ตั้งรหัสผ่านใหม่สำเร็จ!
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว
                    </p>
                </div>

                <Link href="/auth/signin">
                    <Button className="w-full bg-purple-600 py-5 text-white hover:bg-purple-700">
                        ไปหน้าเข้าสู่ระบบ
                    </Button>
                </Link>
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
                    ตั้งรหัสผ่านใหม่
                </h1>
                <p className="text-sm text-muted-foreground">
                    กรอกรหัสผ่านใหม่ของคุณ
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="password">รหัสผ่านใหม่</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                    <div className="relative">
                        <Input
                            id="confirm-password"
                            type={showConfirm ? "text" : "password"}
                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                        >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-purple-600 py-5 text-white hover:bg-purple-700"
                    disabled={isLoading}
                >
                    {isLoading ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
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

> **Flow ทั้งหมดของ Forgot Password:**
> 1. ผู้ใช้ไปที่ `/auth/forgot-password` → กรอกอีเมล → กด "รีเซ็ตรหัสผ่าน"
> 2. Client เรียก `authClient.requestPasswordReset({ email, redirectTo: "/auth/reset-password" })`
> 3. Server เรียก `sendResetPassword` → ส่ง Gmail พร้อมลิงก์
> 4. ผู้ใช้คลิกลิงก์ในอีเมล → Redirect มาที่ `/auth/reset-password?token=xxx`
> 5. `useSearchParams()` อ่าน token → กรอกรหัสผ่านใหม่ → `authClient.resetPassword({ newPassword, token })`
> 6. สำเร็จ → แสดงข้อความ + ลิงก์ไปหน้า Sign In

### สรุป Day 5

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **RBAC** | Role-based Access Control ด้วย Admin Plugin + Seed Script |
| **Sidebar Layout** | Main Layout ด้วย Sidebar + Top Header + Dark Mode |
| **User Profile** | Self-edit Profile, Change Password |
| **2FA (TOTP)** | Two-Factor Authentication ด้วย QR Code + Backup Codes |
| **Email Verify** | Verify Email ผ่าน Gmail + Nodemailer SMTP |
| **Forgot Password** | Reset Password ผ่าน Gmail + Forgot/Reset Password Pages |

**ไฟล์สำคัญที่สร้างในวันนี้:**

- `lib/auth.ts` — เพิ่ม RBAC, 2FA, Email Verification, Forgot Password
- `app/(auth)/dashboard/page.tsx` — Dashboard สำหรับ Admin/User
- `app/(auth)/profile/page.tsx` — User Profile Page
- `app/(auth)/auth/verify-email/page.tsx` — หน้า Verify Email
- `app/(auth)/auth/forgot-password/ForgotPasswordForm.tsx` — หน้า Forgot Password
- `app/(auth)/auth/reset-password/page.tsx` + `ResetPasswordForm.tsx` — หน้า Reset Password
- `app/layout.tsx` — Main Layout พร้อม Sidebar + Header

> **Next:** ใน Day 6 เราจะเรียนรู้การสร้างฐานความรู้ AI ด้วย Vector Database (pgVector) และ Ingestion Pipeline สำหรับการทำ RAG (Retrieval-Augmented Generation) เพื่อให้แอปของเราสามารถตอบคำถามจากข้อมูลที่เราเตรียมไว้ได้อย่างแม่นยำและรวดเร็ว!