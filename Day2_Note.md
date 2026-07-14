## Next.js 16: The AI-Native Developer Masterclass - Day 2

3. [Section 3: รู้จัก Better Auth พื้นฐาน](#section-3-รู้จัก-better-auth-พื้นฐาน)
    - Better Auth คืออะไร? ทำไมเลือกใช้?
    - สถาปัตยกรรมการทำงานของ Better Auth
    - Core Schema (4 ตาราง: User, Session, Account, Verification)
    - Database Adapters & CLI

4. [Section 4: รู้จัก Prisma ORM พื้นฐาน](#section-4-รู้จัก-prisma-orm-พื้นฐาน)
    - ORM คืออะไร? ทำไมต้องใช้?
    - Prisma คืออะไร? องค์ประกอบหลัก
    - เปรียบเทียบ Prisma vs Drizzle ORM
    - Prisma CLI Commands & Workflow

5. [Section 5: Prisma & Neon Setup](#section-5-prisma--neon-setup)
    - การเชื่อมต่อ PostgreSQL บน Neon Serverless
    - การทำ Database Schema สำหรับ Better Auth
    - การ Push Schema และ Prisma Studio

---

### Section 3: รู้จัก Better Auth พื้นฐาน

#### 3.1 Better Auth คืออะไร?

**Better Auth** เป็น Authentication Library สำหรับ TypeScript/JavaScript ที่ออกแบบมาเพื่อเป็นทางเลือกที่ดีกว่า NextAuth.js (Auth.js) โดยเน้นที่:

- 🔒 **ความปลอดภัยสูง** — รองรับ MFA, RBAC, Session Management
- 🚀 **Developer Experience** — API ที่ง่ายและ Type-safe
- 🔌 **Plugin System** — เพิ่มความสามารถด้วย Plugins
- 🗄️ **Database Agnostic** — รองรับได้หลาย Database ผ่าน Adapters
- 📱 **Framework Agnostic** — ใช้กับ Next.js, Nuxt, SvelteKit, Express ฯลฯ

**เปรียบเทียบ Better Auth vs NextAuth.js (Auth.js):**

| คุณสมบัติ | Better Auth | NextAuth.js (Auth.js) |
|-----------|-------------|----------------------|
| **Email/Password** | ✅ Built-in | ⚠️ ต้องใช้ Credentials Provider |
| **Social Login** | ✅ Built-in (30+ providers) | ✅ Built-in |
| **MFA / 2FA** | ✅ Plugin | ❌ ต้องทำเอง |
| **RBAC** | ✅ Plugin | ❌ ต้องทำเอง |
| **Organization / Team** | ✅ Plugin | ❌ |
| **Passkey/WebAuthn** | ✅ Plugin | ⚠️ Experimental |
| **Type Safety** | ✅ End-to-end | ⚠️ บางส่วน |
| **Database Control** | ✅ Full control | ⚠️ จำกัด |
| **Session Strategy** | JWT + Database | JWT หรือ Database |

#### 3.2 สถาปัตยกรรมการทำงาน

```
┌──────────────────────────────────────────────────┐
│                  Client (Browser)                │
│  ┌────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ Login Form │  │ Social Btn  │  │ useSession│  │
│  └──────┬─────┘  └──────┬──────┘  └─────┬─────┘  │
│         │               │               │        │
│   auth-client.ts    auth-client.ts   auth-client │
└─────────┼───────────────┼───────────────┼────────┘
          │               │               │
    ┌─────▼───────────────▼───────────────▼─────┐
    │          /api/auth/[...all]/route.ts      │
    │          (Better Auth API Handler)        │
    └──────────────────┬────────────────────────┘
                       │
    ┌──────────────────▼────────────────────────┐
    │              lib/auth.ts                  │
    │         (Better Auth Server Config)       │
    │  ┌─────────┐ ┌─────────┐ ┌──────────────┐ │
    │  │Email/PW │ │ Social  │ │   Plugins    │ │
    │  │  Auth   │ │Providers│ │(MFA, RBAC..) │ │
    │  └─────────┘ └─────────┘ └──────────────┘ │
    └──────────────────┬────────────────────────┘
                       │
    ┌──────────────────▼────────────────────────┐
    │          Prisma Adapter                   │
    │            ↓                              │
    │    Neon PostgreSQL Database               │
    │  ┌──────┐ ┌───────┐ ┌───────┐ ┌────────┐  │
    │  │ user │ │session│ │account│ │verify  │  │
    │  └──────┘ └───────┘ └───────┘ └────────┘  │
    └───────────────────────────────────────────┘
```

**การทำงานแบบ Step-by-step:**
1. **ผู้ใช้** กรอกข้อมูลบน Login Form (Client Component)
2. **auth-client.ts** ส่ง request ไปยัง `/api/auth/[...all]`
3. **Better Auth Handler** ตรวจสอบข้อมูลและจัดการ Authentication
4. **Prisma Adapter** อ่าน/เขียนข้อมูลลง PostgreSQL
5. **Session** ถูกสร้างและส่งกลับไปยัง Client

#### 3.3 Better Auth Core Schema

Better Auth ต้องการ **4 ตารางหลัก** ในฐานข้อมูล (อ้างอิงจาก [Better Auth Official Docs](https://www.better-auth.com/docs/concepts/database#core-schema)):

##### ตาราง 1: User

Table Name: `user`

| Field Name | Type | Key | Description |
|------------|------|-----|-------------|
| id | string | 🔑 PK | Unique identifier for each user |
| name | string | | User's chosen display name |
| email | string | | User's email address for communication and login |
| emailVerified | boolean | | Whether the user's email is verified |
| image | string | ? (optional) | User's image url |
| createdAt | Date | | Timestamp of when the user account was created |
| updatedAt | Date | | Timestamp of the last update to the user's information |

##### ตาราง 2: Session

Table Name: `session`

| Field Name | Type | Key | Description |
|------------|------|-----|-------------|
| id | string | 🔑 PK | Unique identifier for each session |
| userId | string | 🔗 FK → user.id | The ID of the user |
| token | string | | The unique session token |
| expiresAt | Date | | The time when the session expires |
| ipAddress | string | ? (optional) | The IP address of the device |
| userAgent | string | ? (optional) | The user agent information of the device |
| createdAt | Date | | Timestamp of when the session was created |
| updatedAt | Date | | Timestamp of when the session was updated |

##### ตาราง 3: Account

Table Name: `account`

| Field Name | Type | Key | Description |
|------------|------|-----|-------------|
| id | string | 🔑 PK | Unique identifier for each account |
| userId | string | 🔗 FK → user.id | The ID of the user |
| accountId | string | | The ID of the account as provided by the SSO or equal to userId |
| providerId | string | | The ID of the provider (e.g. "google", "github", "credential") |
| accessToken | string | ? (optional) | The access token of the account. Returned by the provider |
| refreshToken | string | ? (optional) | The refresh token of the account. Returned by the provider |
| accessTokenExpiresAt | Date | ? (optional) | The time when the access token expires |
| refreshTokenExpiresAt | Date | ? (optional) | The time when the refresh token expires |
| scope | string | ? (optional) | The scope of the account |
| idToken | string | ? (optional) | The ID token returned by the provider |
| password | string | ? (optional) | The hashed password (for credential provider only) |
| createdAt | Date | | Timestamp of when the account was created |
| updatedAt | Date | | Timestamp of when the account was updated |

> **อธิบาย:** ตาราง Account แยกจาก User เพราะ 1 User สามารถมีหลาย Account ได้ เช่น login ด้วย Email/Password (providerId = "credential") และ login ด้วย Google (providerId = "google")

##### ตาราง 4: Verification

Table Name: `verification`

| Field Name | Type | Key | Description |
|------------|------|-----|-------------|
| id | string | 🔑 PK | Unique identifier for each verification |
| identifier | string | | The identifier for the verification request (e.g. email address) |
| value | string | | The value to be verified (e.g. OTP code, token) |
| expiresAt | Date | | The time when the verification request expires |
| createdAt | Date | | Timestamp of when the verification was created |
| updatedAt | Date | | Timestamp of when the verification was updated |

> **อธิบาย:** ตาราง Verification ใช้สำหรับ Email verification, Password reset tokens, OTP codes ต่างๆ

#### 3.4 ER Diagram ของ Core Schema

```
┌──────────────────┐         ┌──────────────────┐
│      user        │         │    session       │
├──────────────────┤         ├──────────────────┤
│ id          (PK) │◄────┐   │ id          (PK) │
│ name             │     │   │ userId      (FK) │──┐
│ email            │     │   │ token            │  │
│ emailVerified    │     │   │ expiresAt        │  │
│ image            │     │   │ ipAddress        │  │
│ createdAt        │     │   │ userAgent        │  │
│ updatedAt        │     │   │ createdAt        │  │
└──────────────────┘     │   │ updatedAt        │  │
       ▲                 │   └──────────────────┘  │
       │                 └─────────────────────────┘
       │
       │           ┌──────────────────┐
       │           │    account       │
       │           ├──────────────────┤
       └───────────│ userId      (FK) │
                   │ id          (PK) │
                   │ accountId        │
                   │ providerId       │   ┌──────────────────┐
                   │ accessToken      │   │  verification    │
                   │ refreshToken     │   ├──────────────────┤
                   │ password         │   │ id          (PK) │
                   │ createdAt        │   │ identifier       │
                   │ updatedAt        │   │ value            │
                   └──────────────────┘   │ expiresAt        │
                                          │ createdAt        │
                                          │ updatedAt        │
                                          └──────────────────┘
```

> **หมายเหตุ:** นี่คือ Core Schema พื้นฐานของ Better Auth เมื่อเพิ่ม Plugin (เช่น Admin Plugin) จะมี field เพิ่มเติม ดูรายละเอียดในหัวข้อ 5.5

**ความสัมพันธ์ระหว่างตาราง:**
- **User → Session** = 1:N (1 User มีได้หลาย Sessions)
- **User → Account** = 1:N (1 User มีได้หลาย Accounts / Providers)
- **Verification** = ไม่มี FK กับ User (ใช้ identifier field แทน)

#### 3.5 Database Adapters ที่ Better Auth รองรับ

Better Auth เชื่อมต่อกับ Database ผ่าน **Adapters** หลายประเภท:

| Adapter | Database |
|---------|----------|
| `prismaAdapter` | PostgreSQL, MySQL, SQLite (ผ่าน Prisma) |
| `drizzleAdapter` | PostgreSQL, MySQL, SQLite (ผ่าน Drizzle ORM) |
| `kyselyAdapter` | PostgreSQL, MySQL, SQLite (ผ่าน Kysely) |
| `mongodbAdapter` | MongoDB |
| Built-in | PostgreSQL, MySQL, SQLite (ใช้ connection string โดยตรง) |

**ตัวอย่างการใช้ Prisma Adapter (ที่เราจะใช้ในคอร์สนี้):**
```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
})
```

#### 3.6 Better Auth CLI

Better Auth มี CLI ช่วยจัดการ Database:

```bash
# Generate schema สำหรับ database adapter ที่ใช้
npx @better-auth/cli generate

# Run database migrations (สร้าง/อัปเดตตาราง)
npx @better-auth/cli migrate
```

> **หมายเหตุ:** ในคอร์สนี้เราจะใช้ **Prisma** จัดการ schema เอง (ผ่าน `prisma db push`) แทนการใช้ Better Auth CLI เพราะเราต้องการ customize schema เพิ่มเติม (เช่น เพิ่ม field `role`)

---

### Section 4: รู้จัก Prisma ORM พื้นฐาน

#### 4.1 ORM คืออะไร?

**ORM (Object-Relational Mapping)** คือเครื่องมือที่เป็นตัวกลางระหว่างโค้ดโปรแกรม (TypeScript/JavaScript) กับ Database (SQL) ช่วยให้เราทำงานกับ Database ด้วยโค้ดแทนการเขียน SQL ตรงๆ

**ไม่ใช้ ORM (เขียน SQL ตรง):**
```sql
SELECT * FROM user WHERE email = 'test@example.com';
INSERT INTO user (name, email) VALUES ('John', 'john@email.com');
```

**ใช้ ORM (เขียนเป็น TypeScript):**
```typescript
// ค้นหา user
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' }
})

// สร้าง user ใหม่
const newUser = await prisma.user.create({
  data: { name: 'John', email: 'john@email.com' }
})
```

**ข้อดีของการใช้ ORM:**
- ✅ **Type-safe** — IDE ช่วย autocomplete และเช็ค type ให้
- ✅ **ป้องกัน SQL Injection** — ORM จัดการ parameterized queries ให้
- ✅ **เปลี่ยน Database ง่าย** — เปลี่ยนจาก PostgreSQL เป็น MySQL โดยแก้โค้ดน้อย
- ✅ **อ่านง่าย** — โค้ดเป็น TypeScript ไม่ต้องสลับภาษา

#### 4.2 Prisma คืออะไร?

**Prisma** เป็น **Next-generation ORM** สำหรับ TypeScript/JavaScript ที่ได้รับความนิยมมากที่สุดตัวหนึ่ง โดยมีแนวทางที่แตกต่างจาก ORM ดั้งเดิม (เช่น TypeORM, Sequelize) คือใช้ **Schema-first approach** — นิยาม Database ด้วยไฟล์ schema แล้ว generate client อัตโนมัติ

**องค์ประกอบหลักของ Prisma:**

```
┌─────────────────────────────────────────────────┐
│                  Prisma ORM                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐   ┌──────────────┐             │
│  │   Prisma    │   │   Prisma     │             │
│  │   Schema    │─▶│   Client     │             │
│  │ (.prisma)   │   │ (Generated)  │             │
│  └─────────────┘   └──────┬───────┘             │
│                           │                     │
│  ┌─────────────┐   ┌──────▼───────┐             │
│  │   Prisma    │   │   Prisma     │             │
│  │   Studio    │   │   Migrate    │             │
│  │ (GUI Tool)  │   │ (Schema Sync)│             │
│  └─────────────┘   └──────┬───────┘             │
│                           │                     │
│                    ┌──────▼───────┐             │
│                    │  PostgreSQL  │             │
│                    │  MySQL, etc. │             │
│                    └──────────────┘             │
└─────────────────────────────────────────────────┘
```

| องค์ประกอบ | หน้าที่ |
|-----------|--------|
| **Prisma Schema** | ไฟล์ `.prisma` ที่นิยามโครงสร้าง Database (Models, Relations) |
| **Prisma Client** | TypeScript client ที่ถูก generate จาก schema — ใช้ query database |
| **Prisma Migrate** | เครื่องมือจัดการ Migration (สร้าง/เปลี่ยนแปลงตาราง) |
| **Prisma Studio** | GUI สำหรับดูและแก้ไขข้อมูลใน Database ผ่าน Web Browser |

#### 4.3 Prisma Schema ภาพรวม

ไฟล์ `prisma/schema.prisma` คือหัวใจของ Prisma ประกอบด้วย 3 ส่วน:

```prisma
// ─── ส่วนที่ 1: Generator ───
// กำหนดว่าจะ generate อะไร (ปกติคือ Prisma Client)
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

// ─── ส่วนที่ 2: Datasource ───
// กำหนดว่าเชื่อมต่อ Database อะไร
datasource db {
  provider = "postgresql"      // หรือ "mysql", "sqlite"
}

// ─── ส่วนที่ 3: Models ───
// นิยามตาราง (1 model = 1 table)
model User {
  id        String   @id @default(cuid())  // Primary Key
  name      String                          // Required field
  email     String   @unique                // Unique constraint
  image     String?                         // Optional field (? = nullable)
  role      String   @default("user")       // Default value
  createdAt DateTime @default(now())        // Auto timestamp
  updatedAt DateTime @updatedAt             // Auto update timestamp

  posts     Post[]                          // Relation: 1 User มีหลาย Posts

  @@map("user")                             // ตั้งชื่อตารางใน DB เป็น "user"
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  userId    String                          // Foreign Key

  user      User     @relation(fields: [userId], references: [id])

  @@map("post")
}
```

**อธิบาย Decorators สำคัญ:**

| Decorator | ความหมาย | ตัวอย่าง |
|-----------|----------|----------|
| `@id` | Primary Key | `id String @id` |
| `@default()` | ค่าเริ่มต้น | `@default(cuid())`, `@default(now())` |
| `@unique` | Unique constraint | `email String @unique` |
| `@updatedAt` | อัปเดตอัตโนมัติเมื่อแก้ไข | `updatedAt DateTime @updatedAt` |
| `@relation()` | กำหนดความสัมพันธ์ | `@relation(fields: [userId], references: [id])` |
| `?` (optional) | Nullable field | `image String?` |
| `@@map()` | เปลี่ยนชื่อตารางใน DB | `@@map("user")` |

#### 4.4 Prisma Client — ตัวอย่าง CRUD

หลังจาก generate Prisma Client แล้ว สามารถใช้งานได้ดังนี้:

```typescript
import { prisma } from "@/lib/prisma"

// ─── CREATE ───
const user = await prisma.user.create({
  data: {
    name: "สมชาย",
    email: "somchai@email.com",
  },
})

// ─── READ (ค้นหา 1 รายการ) ───
const foundUser = await prisma.user.findUnique({
  where: { email: "somchai@email.com" },
})

// ─── READ (ค้นหาหลายรายการ) ───
const allUsers = await prisma.user.findMany({
  where: { role: "admin" },
  orderBy: { createdAt: "desc" },
  take: 10,  // จำกัด 10 รายการ
})

// ─── UPDATE ───
const updated = await prisma.user.update({
  where: { id: "some-id" },
  data: { name: "สมชาย Updated" },
})

// ─── DELETE ───
const deleted = await prisma.user.delete({
  where: { id: "some-id" },
})

// ─── RELATION (ดึงข้อมูลพร้อม relation) ───
const userWithPosts = await prisma.user.findUnique({
  where: { id: "some-id" },
  include: { posts: true },  // รวมข้อมูล posts ด้วย
})
```

> **สังเกต:** ทุก method มี **autocomplete** และ **type checking** ทั้งหมด — ถ้า field ไม่มีใน schema จะไม่สามารถใช้ได้

#### 4.5 เปรียบเทียบ Prisma vs Drizzle ORM

ในโลก TypeScript มี ORM ที่นิยม 2 ตัวหลักคือ **Prisma** และ **Drizzle ORM** มาดูข้อเปรียบเทียบกัน:

| คุณสมบัติ | Prisma | Drizzle ORM |
|-----------|--------|-------------|
| **แนวทาง** | Schema-first (ไฟล์ `.prisma`) | Code-first (TypeScript ล้วน) |
| **Schema Definition** | ภาษา Prisma Schema Language | TypeScript objects |
| **Type Safety** | ✅ Generated types | ✅ Inferred types |
| **Learning Curve** | ง่าย (schema อ่านง่าย) | ปานกลาง (ต้องรู้ SQL) |
| **Query Style** | Object-based API | SQL-like API |
| **Performance** | ดี (ผ่าน Rust engine) | ดีมาก (lightweight, ไม่มี engine) |
| **Bundle Size** | ใหญ่กว่า (~2-5MB engine) | เล็กกว่า (~50KB) |
| **Raw SQL** | รองรับ (`$queryRaw`) | รองรับ (native) |
| **Migrations** | `prisma migrate` (auto) | `drizzle-kit` (auto) |
| **GUI Tool** | Prisma Studio ✅ | Drizzle Studio ✅ |
| **Serverless** | ✅ (ต้องตั้งค่า) | ✅ (เหมาะกว่า — เล็กกว่า) |
| **Community** | ใหญ่กว่า, mature | เติบโตเร็ว, ใหม่กว่า |
| **Better Auth Support** | ✅ `prismaAdapter` | ✅ `drizzleAdapter` |

**ตัวอย่างเปรียบเทียบ Schema:**

**Prisma Schema:**
```prisma
model User {
  id    String @id @default(cuid())
  name  String
  email String @unique
  posts Post[]
}
```

**Drizzle Schema:**
```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
})
```

**ตัวอย่างเปรียบเทียบ Query:**

**Prisma Query:**
```typescript
const users = await prisma.user.findMany({
  where: { role: "admin" },
  orderBy: { createdAt: "desc" },
})
```

**Drizzle Query:**
```typescript
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.role, "admin"))
  .orderBy(desc(usersTable.createdAt))
```

> **สรุป:** ทั้ง Prisma และ Drizzle เป็น ORM ที่ดี แต่ในคอร์สนี้เราเลือกใช้ **Prisma** เพราะ:
> 1. **Schema อ่านง่าย** — เหมาะสำหรับผู้เริ่มต้น
> 2. **Prisma Studio** — มี GUI ให้ดูข้อมูล
> 3. **Community ใหญ่** — หาคำตอบง่าย
> 4. **Better Auth** — มี official `prismaAdapter` รองรับ

#### 4.6 Prisma CLI Commands ที่ใช้บ่อย

| คำสั่ง | หน้าที่ |
|--------|--------|
| `npx prisma init` | สร้างไฟล์ `prisma/schema.prisma` และ `.env` |
| `npx prisma generate` | Generate Prisma Client จาก schema |
| `npx prisma db push` | Push schema ไปยัง Database (ไม่สร้าง migration file) |
| `npx prisma migrate dev` | สร้าง migration file + push ไปยัง Database |
| `npx prisma migrate deploy` | Deploy migrations สำหรับ production |
| `npx prisma studio` | เปิด GUI สำหรับดู/แก้ไขข้อมูล |
| `npx prisma validate` | ตรวจสอบ schema ว่าถูกต้องหรือไม่ |
| `npx prisma format` | จัดรูปแบบไฟล์ schema |
| `npx prisma db seed` | รัน seed script เพื่อเพิ่มข้อมูลตัวอย่าง |

**`db push` vs `migrate dev` — ใช้อะไรดี?**

| | `prisma db push` | `prisma migrate dev` |
|---|---|---|
| **สร้าง Migration file** | ❌ ไม่สร้าง | ✅ สร้าง (เก็บประวัติ) |
| **เหมาะกับ** | Prototyping เบื้องต้น | Development & Production |
| **ข้อดี** | เร็ว, ง่าย | มีประวัติการเปลี่ยนแปลง, ย้อนกลับได้ |
| **ข้อเสีย** | ไม่มี migration history, อาจลบข้อมูล | ช้ากว่าเล็กน้อย |
| **ต่อยอด Production** | ❌ ไม่เหมาะ | ✅ ใช้ `migrate deploy` ได้เลย |

> **ในคอร์สนี้:** เราจะใช้ **`prisma migrate dev`** ตั้งแต่เริ่มต้น เพื่อฝึกแนวปฏิบัติที่ถูกต้อง สามารถต่อยอดไปสู่ production ได้ทันทีด้วย `prisma migrate deploy` โดยไม่ต้องปรับเปลี่ยน workflow

---

### Section 5: Prisma & Neon Setup

#### 5.1 เตรียม Database บน Neon

1. สมัครใช้งานที่ https://neon.tech
2. สร้าง Project ใหม่ → เลือก Database เป็น **Postgres**
3. เลือก Region ที่ใกล้ที่สุด (เช่น Singapore)
4. คัดลอก **Connection String** เก็บไว้

#### 5.2 ติดตั้ง Dependencies ที่จำเป็น สำหรับ Prisma
```bash
npm install @prisma/client @prisma/adapter-pg
npm install -D prisma
```

#### 5.3 ตั้งค่า Prisma

**Initialize Prisma (ใช้ Prisma v7 ตามแนวทาง [Prisma Postgres Quickstart](https://www.prisma.io/docs/prisma-orm/quickstart/prisma-postgres)):**
```bash
npx prisma init --output ../app/generated/prisma
```
> **หมายเหตุ:** `--output ../app/generated/prisma` กำหนดให้ Prisma Client ถูก generate ไปที่ `app/generated/prisma/` แทนที่จะอยู่ใน `node_modules/`

**แก้ไขไฟล์ `prisma/schema.prisma`:**

> **สำคัญ (Prisma v7):**
> - `provider = "prisma-client"` (ไม่ใช่ `prisma-client-js` แบบเดิม)
> - `output` กำหนด path ที่ generate client ไป
> - `datasource` ไม่ต้องมี `url` (ใช้ Driver Adapter แทน)

#### 5.4 การตั้งค่า Environment Variables ในไฟล์ `.env`:
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-pooler.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```
**ความรู้เพิ่มเติมเกี่ยวกับ Neon**
การเพิ่มพารามิเตอร์ต่อท้าย Connection String สำหรับ Neon ในสภาพแวดล้อม Serverless มีความหมายที่สำคัญต่อความปลอดภัยและการจัดการทรัพยากร ดังนี้:

**`sslmode=require`**: บังคับให้การเชื่อมต่อฐานข้อมูลต้องใช้ SSL/TLS Encryption เพื่อความปลอดภัย

> **คำแนะนำเพิ่มเติม:** หากแอปพลิเคชันของคุณเริ่มมีผู้ใช้งานเยอะขึ้น แนะนำให้ใช้ Connection Pooling ของ Neon (โดยใช้ URL ที่มีคำว่า -pooler) ซึ่งจะช่วยจัดการเรื่องนี้ให้มีประสิทธิภาพกว่าการจำกัดที่ตัวแปร connection_limit เพียงอย่างเดียว

#### 5.5 สร้าง Prisma Schema ตาม Better Auth Core Schema

```prisma
// Prisma Schema for AI Native App
// Better Auth + PostgreSQL (Neon)

generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ==========================================
// Better Auth Core Schema
// ==========================================

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String    @default("user") // "user" | "admin"
  banned        Boolean?
  banReason     String?
  banExpires    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions Session[]
  accounts Account[]

  @@map("user")
}

model Session {
  id              String   @id @default(cuid())
  userId          String
  token           String   @unique
  expiresAt       DateTime
  ipAddress       String?
  userAgent       String?
  impersonatedBy  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("account")
}

model Verification {
  id         String    @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@map("verification")
}
```

> **จุดสังเกตุ Prisma v7:**
> - `banned`, `banReason`, `banExpires` คือ field ที่ Better Auth admin plugin ต้องการในตาราง **User** สำหรับฟีเจอร์ Ban/Unban
> - `impersonatedBy` คือ field ที่ Better Auth admin plugin ต้องการในตาราง **Session** สำหรับฟีเจอร์ **Impersonate User** — เก็บ ID ของ admin ที่กำลัง impersonate อยู่
> - `datasource` ไม่มี `url` เพราะใช้ Driver Adapter (`@prisma/adapter-pg`) ในการเชื่อมต่อแทน

#### 5.5.1 ER Diagram ของ Schema ทั้งหมด (Core + Admin Plugin)

เมื่อรวม field จาก Admin Plugin เข้ากับ Core Schema แล้ว จะได้ ER Diagram ดังนี้:

```
┌─────────────────────────┐         ┌─────────────────────────┐
│          user           │         │        session          │
├─────────────────────────┤         ├─────────────────────────┤
│ id               (PK)   │◄────┐   │ id               (PK)   │
│ name                    │     │   │ userId           (FK)   │──┐
│ email                   │     │   │ token                   │  │
│ emailVerified           │     │   │ expiresAt               │  │
│ image                   │     │   │ ipAddress               │  │
│ role           ★       │     │   │ userAgent               │  │
│ banned         ★       │     │   │ impersonatedBy  ★      │  │
│ banReason      ★       │     │   │ createdAt               │  │
│ banExpires     ★       │     │   │ updatedAt               │  │
│ createdAt               │     │   └─────────────────────────┘ │
│ updatedAt               │     │                               │
└─────────────────────────┘     └───────────────────────────────┘
       ▲
       │
       │           ┌─────────────────────────┐
       │           │        account          │
       │           ├─────────────────────────┤
       └───────────│ userId           (FK)   │
                   │ id               (PK)   │
                   │ accountId               │
                   │ providerId              │   ┌─────────────────────────┐
                   │ accessToken             │   │      verification       │
                   │ refreshToken            │   ├─────────────────────────┤
                   │ accessTokenExpiresAt    │   │ id               (PK)   │
                   │ refreshTokenExpiresAt   │   │ identifier              │
                   │ scope                   │   │ value                   │
                   │ idToken                 │   │ expiresAt               │
                   │ password                │   │ createdAt               │
                   │ createdAt               │   │ updatedAt               │
                   │ updatedAt               │   └─────────────────────────┘
                   └─────────────────────────┘
```

> **★ = field ที่เพิ่มมาจาก Admin Plugin** ไม่อยู่ใน Core Schema ดั้งเดิม
> - **User**: `role`, `banned`, `banReason`, `banExpires` — สำหรับจัดการ Role-based Access Control และ Ban/Unban
> - **Session**: `impersonatedBy` — สำหรับ Impersonate User (admin สร้าง session สวมรอยเป็น user อื่นเพื่อ debug/support ได้ โดย session จะหมดอายุใน 1 ชั่วโมง)

#### 5.6 Migrate Schema ไปยัง Database

**สร้าง Migration ครั้งแรก:**
```bash
npx prisma migrate dev --name init
```

> **อธิบายคำสั่ง:**
> - `migrate dev` — สร้าง migration file + apply ไปยัง database + generate Prisma Client
> - `--name init` — ตั้งชื่อ migration ว่า "init" (ตั้งชื่อตามการเปลี่ยนแปลงที่ทำ)

ผลลัพธ์ที่ได้:
```
Applying migration `20260227_init`

The following migration(s) have been created and applied:

migrations/
  └─ 20260227070000_init/
    └─ migration.sql

✔ Generated Prisma Client to ./node_modules/@prisma/client
```

**โครงสร้างไฟล์ Migration ที่ถูกสร้าง:**
```
prisma/
├── schema.prisma
└── migrations/
    ├── 20260227070000_init/
    │   └── migration.sql      ← SQL จริงที่ถูก apply
    └── migration_lock.toml    ← ล็อค database provider
```

**ดู SQL ที่ถูกสร้าง** (ไฟล์ `migration.sql`):
```sql
-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" ( ... );
CREATE TABLE "account" ( ... );
CREATE TABLE "verification" ( ... );

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
```

> **สำคัญ:** ไฟล์ migration เหล่านี้ควร **commit เข้า Git** ด้วย เพราะเป็นประวัติการเปลี่ยนแปลง database

**เปิด Prisma Studio เพื่อดูข้อมูลใน Database:**
```bash
npx prisma studio
```
เข้าถึงได้ที่ http://localhost:5555

**การ Generate Prisma Client ใหม่หลังจากแก้ไข schema:**
```bash
npx prisma generate
```
> **หมายเหตุ:** `prisma generate` จะสร้าง Prisma Client ใหม่ตาม schema ที่แก้ไข แต่จะไม่ apply การเปลี่ยนแปลงไปยัง database — ต้องใช้ `prisma migrate dev` เพื่อสร้าง migration และ apply ไปยัง database ด้วย

#### 5.7 สร้าง Prisma Client Instance (ใช้ Driver Adapter)

สร้างไฟล์ `lib/prisma.ts`:

> **Prisma v7** ใช้ **Driver Adapter** แทนการใส่ `url` ใน datasource — เชื่อมต่อ database ผ่าน `@prisma/adapter-pg` โดยตรง

```typescript
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/app/generated/prisma/client"

const connectionString = `${process.env.DATABASE_URL}`

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({ connectionString })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma
}
```

> **อธิบายความแตกต่างจาก Prisma v6:**
> - `PrismaClient` import จาก `@/app/generated/prisma/client` (ไม่ใช่ `@prisma/client`)
> - ใช้ `PrismaPg` adapter เพื่อเชื่อมต่อ PostgreSQL
> - `PrismaClient({ adapter })` ส่ง adapter เข้าไปแทนการใส่ URL ตรง
> - Singleton pattern ป้องกันการสร้าง PrismaClient หลายตัวในโหมด development (hot reload)

#### 5.8 Migration Workflow — เมื่อต้องแก้ไข Schema

เมื่อต้องการเพิ่ม/แก้ไข/ลบ field หรือ model ให้ทำตามขั้นตอนนี้:

```
1. แก้ไข prisma/schema.prisma
         │
         ▼
2. npx prisma migrate dev --name <ชื่อการเปลี่ยนแปลง>
         │
         ▼
3. ตรวจสอบ migration.sql ที่สร้างขึ้น
         │
         ▼
4. git add & commit (เก็บ migration files)
```

**ตัวอย่างเมื่อเพิ่ม field ใหม่:**

```prisma
// แก้ไข schema — เพิ่ม field "phone"
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  phone         String?                  // ← เพิ่มใหม่!
  emailVerified Boolean   @default(false)
  // ... fields อื่นๆ
}
```

จากนั้นรัน:
```bash
npx prisma migrate dev --name add_phone_to_user
```

Prisma จะสร้าง migration file ใหม่:
```sql
-- AlterTable
ALTER TABLE "user" ADD COLUMN "phone" TEXT;
```

> **ข้อดี:** ไม่มีข้อมูลหาย! เพราะเป็น `ALTER TABLE` ไม่ใช่ `DROP TABLE` + `CREATE TABLE`

#### 5.9 ⚠️ Migration Best Practices สำหรับ Production

##### ปัญหา: ข้อมูลหายเมื่อ Migrate

ในช่วง development ถ้า migration ถูก reset (เช่น ใช้ `prisma migrate reset`) ข้อมูลทั้งหมดจะถูกลบ ซึ่งตอน dev ไม่เป็นไร แต่ใน **production ต้องระวังมาก**

**สถานการณ์ที่ข้อมูลอาจหาย:**

| สถานการณ์ | ข้อมูลหาย? | วิธีป้องกัน |
|-----------|:---------:|------------|
| เพิ่ม field ใหม่ (optional) | ❌ ปลอดภัย | ใช้ `String?` (nullable) |
| เพิ่ม field ใหม่ (required) | ⚠️ อาจ error | ต้องมี `@default()` หรือ ทำ 2 ขั้นตอน |
| ลบ field | ⚠️ ข้อมูลใน field นั้นหาย | Backup ก่อน, ลบทีหลัง |
| เปลี่ยนชื่อ field | ⚠️ เหมือนลบ+เพิ่มใหม่ | ใช้ `@map()` แทน |
| เปลี่ยน type ของ field | ⚠️ อาจ error | Migrate ทีละขั้น |
| ลบ model (table) ทั้งตาราง | ❌ ข้อมูลหาย! | Backup + ยืนยันก่อนลบ |
| `prisma migrate reset` | ❌ ข้อมูลหาย! | ❌ ห้ามใช้ใน production |
| `prisma db push` (force) | ❌ ข้อมูลอาจหาย! | ❌ ห้ามใช้ใน production |

##### กฎ 5 ข้อสำหรับ Production Migration

**กฎ 1: Backup ก่อน Migrate เสมอ**
```bash
# สำหรับ Neon — ใช้ Branching (ดีที่สุด)
# Neon จะสร้าง copy ของ database ใหม่ให้ทดสอบ migration ก่อน

# สำหรับ PostgreSQL ทั่วไป — ใช้ pg_dump
pg_dump -h <host> -U <user> -d <dbname> > backup_before_migrate.sql
```

**กฎ 2: เพิ่ม field ใหม่ที่เป็น required ต้องทำ 2 ขั้นตอน**
```
❌ ผิด: เพิ่ม field ที่เป็น required โดยไม่มี default
   → Error: column cannot be null for existing rows

✅ ถูก: ทำ 2 ขั้นตอน
   1. เพิ่ม field เป็น optional ก่อน (String?)
   2. เขียน script อัปเดตข้อมูลเดิม
   3. เปลี่ยน field เป็น required (String)
```

**ตัวอย่างขั้นตอนที่ 1 — เพิ่มเป็น optional:**
```prisma
model User {
  // ...
  phone String?   // ← optional ก่อน
}
```
```bash
npx prisma migrate dev --name add_phone_optional
```

**ตัวอย่างขั้นตอนที่ 2 — อัปเดตข้อมูลเดิม:**
```typescript
// scripts/backfill-phone.ts
import { prisma } from "../lib/prisma"

async function main() {
  await prisma.user.updateMany({
    where: { phone: null },
    data: { phone: "N/A" },  // ใส่ค่า default ให้ข้อมูลเดิม
  })
  console.log("Backfill completed!")
}

main()
```

**ตัวอย่างขั้นตอนที่ 3 — เปลี่ยนเป็น required:**
```prisma
model User {
  // ...
  phone String    // ← required แล้ว (ลบ ? ออก)
}
```
```bash
npx prisma migrate dev --name make_phone_required
```

**กฎ 3: เปลี่ยนชื่อ field — 2 วิธีที่ปลอดภัย**

> **⚠️ สำคัญ:** Prisma ปัจจุบัน**ยังไม่ฉลาดพอ**ที่จะรู้ว่าคุณต้องการ "เปลี่ยนชื่อ" field — มันจะเข้าใจว่าคุณ **"ลบอันเก่าทิ้งแล้วสร้างอันใหม่"** เสมอ ซึ่งจะทำให้ข้อมูลหาย!

```prisma
// ❌ อันตราย: เปลี่ยนชื่อ field ตรงๆ → ข้อมูลหาย!
// เดิม: name String
// ใหม่: fullName String  ← Prisma จะ DROP name + CREATE fullName
```

---

**วิธีที่ 1: ใช้ `@map()` — เปลี่ยนชื่อเฉพาะใน TypeScript (แนะนำ ถ้าทำได้)**

ถ้าไม่จำเป็นต้องเปลี่ยนชื่อ column ใน Database จริงๆ ให้ใช้ `@map()` จะง่ายและปลอดภัยที่สุด:

```prisma
model User {
  fullName String @map("name")  // TypeScript ใช้ fullName, DB ยังเป็น column "name"
}
```
> **ผลลัพธ์:** ในโค้ด TypeScript คุณใช้ `user.fullName` แต่ใน Database ชื่อ column ยังเป็น `name` เหมือนเดิม — ข้อมูลไม่หาย, ไม่ต้อง migrate

---

**วิธีที่ 2: Manual Migration — เปลี่ยนชื่อ Column ใน Database จริงๆ**

ถ้าคุณต้องการเปลี่ยนชื่อ column ใน Database จริงๆ (เช่น จาก `name` เป็น `fullName`) โดยที่ข้อมูลไม่หาย คุณต้องทำ **Manual Migration** (แก้ไขไฟล์ Migration ด้วยมือ):

**ขั้นตอนที่ 1: แก้ไข Schema**
```prisma
// schema.prisma — เปลี่ยนชื่อ field ตรงๆ (ไม่ต้องมี @map)
model User {
  fullName String    // ← เปลี่ยนจาก name เป็น fullName
  // ... fields อื่นๆ
}
```

**ขั้นตอนที่ 2: สร้าง Migration แบบ Draft (ยังไม่รันจริง)**
```bash
# ใช้ --create-only เพื่อสร้างไฟล์ SQL มาให้เราแก้ก่อน
npx prisma migrate dev --create-only --name rename_name_to_fullname
```
> **`--create-only`** = สร้างไฟล์ migration.sql แต่**ยังไม่ apply** ลง database ให้เราตรวจสอบและแก้ไขก่อน

**ขั้นตอนที่ 3: แก้ไขไฟล์ SQL**

เปิดไฟล์ `prisma/migrations/2026xxxx_rename_name_to_fullname/migration.sql`

```sql
/* ❌ SQL ที่ Prisma สร้างมาเอง (อันตราย! ข้อมูลจะหาย) */
ALTER TABLE "user" DROP COLUMN "name";
ALTER TABLE "user" ADD COLUMN "fullName" TEXT NOT NULL;
```

ให้**ลบ**บรรทัดด้านบนทิ้ง แล้ว**เขียนคำสั่ง RENAME แทน**:

```sql
/* ✅ แก้เป็นแบบนี้ — สำหรับ PostgreSQL */
ALTER TABLE "user" RENAME COLUMN "name" TO "fullName";
```

```sql
/* ✅ แก้เป็นแบบนี้ — สำหรับ MySQL */
ALTER TABLE `user` CHANGE `name` `fullName` VARCHAR(191) NOT NULL;
```

**ขั้นตอนที่ 4: สั่งรัน Migration**
```bash
# Apply migration ที่แก้ไขแล้ว
npx prisma migrate dev
```

> **ผลลัพธ์:** Column ใน Database เปลี่ยนชื่อจาก `name` เป็น `fullName` จริงๆ และข้อมูลเก่ายังอยู่ครบ!

**สรุปเปรียบเทียบ 2 วิธี:**

| | วิธีที่ 1: `@map()` | วิธีที่ 2: Manual Migration |
|---|---|---|
| **ชื่อ Column ใน DB** | ไม่เปลี่ยน (ยังเป็น `name`) | เปลี่ยนจริง (เป็น `fullName`) |
| **ชื่อใน TypeScript** | เปลี่ยน (เป็น `fullName`) | เปลี่ยน (เป็น `fullName`) |
| **ความยาก** | ง่ายมาก | ปานกลาง (ต้องแก้ SQL) |
| **ความเสี่ยง** | ไม่มี | ต่ำ (ถ้าแก้ SQL ถูกต้อง) |
| **เมื่อไหร่ใช้** | ต้องการแค่เปลี่ยนชื่อใน code | ต้องการ column ชื่อใหม่จริงๆ |

**กฎ 4: Deploy ใน Production ใช้ `migrate deploy`**
```bash
# ❌ ห้ามใช้ใน production
npx prisma migrate dev       # interactive, อาจ reset ข้อมูล
npx prisma migrate reset     # ลบข้อมูลทั้งหมด!
npx prisma db push           # ไม่มี migration history

# ✅ ใช้ใน production
npx prisma migrate deploy    # apply migrations ที่ยังไม่ได้ apply
```

**กฎ 5: ใช้ Neon Branching สำหรับทดสอบ Migration**

Neon มีฟีเจอร์ **Database Branching** ที่เหมาะกับการทดสอบ migration:

```
┌──────────────────────────────────────────────┐
│              Neon Branching                  │
│                                              │
│   main (production)                          │
│   ─────────────────────────────────          │
│         │                                    │
│         ├── dev/feature-x  ← ทดสอบ migration │
│         │   (copy ของ main)                  │
│         │                                    │
│         └── dev/feature-y  ← ทดสอบ migration │
│             (copy ของ main)                  │
│                                              │
│   ✅ ถ้า migration ผ่าน → merge เข้า main        │
│   ❌ ถ้า migration พัง → ลบ branch ทิ้ง          │
└──────────────────────────────────────────────┘
```

**วิธีใช้:**
1. สร้าง branch ใหม่ใน Neon Console
2. ใช้ connection string ของ branch ใน `.env`
3. รัน `prisma migrate dev` ทดสอบ
4. ถ้าโอเค → apply migration เข้า main branch

##### สรุป Production Migration Workflow

```
┌──────────────────────────────────────────────────────────┐
│               Production Migration Workflow              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 🔀 สร้าง Neon Branch (หรือ backup database)            │
│         │                                                │
│  2. ✏️  แก้ไข prisma/schema.prisma                       │
│         │                                                │
│  3. 🧪 npx prisma migrate dev --name <ชื่อ>               │
│         │  (ทดสอบบน dev branch)                         │
│         │                                                │
│  4. 👀 ตรวจสอบ migration.sql ที่สร้าง                       │
│         │  (ดูว่ามี DROP หรือ destructive operation ไหม)     │
│         │                                                │
│  5. 📦 git add + commit migration files                  │
│         │                                                │
│  6. 🚀 npx prisma migrate deploy                         │
│         │  (apply บน production)                         │
│         │                                                │
│  7. ✅ ตรวจสอบว่าระบบทำงานปกติ                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

> **Tips:** ก่อน deploy migration ใน production ให้เปิดดูไฟล์ `migration.sql` ทุกครั้ง ถ้าเห็นคำสั่ง `DROP` ต้องระวังเป็นพิเศษ!

---

### สรุป Day 2

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Prisma & Neon** | เชื่อมต่อ PostgreSQL Serverless และสร้าง Database Schema |
| **Prisma Client** | ใช้ Prisma Client ในการทำ CRUD และจัดการความสัมพันธ์ |
| **Migration Best Practices** | วิธีการแก้ไข Schema โดยไม่ทำให้ข้อมูลหาย และการใช้ Neon Branching ในการทดสอบ migration ก่อน deploy จริง |


ในวันพรุ่งนี้เราเรียนรู้เรื่อง Basic Next.js RestAPI, Better Auth Integration และ Social Login (Google, GitHub, LINE, Facebook) กัน