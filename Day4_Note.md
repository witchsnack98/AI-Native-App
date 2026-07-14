## Next.js 16: The AI-Native Developer Masterclass - Day 4

8. [Section 8: Social Login (Google, GitHub, LINE, Facebook)](#section-8-social-login-google-github-line-facebook)
    - ตั้งค่า GitHub OAuth App
    - ตั้งค่า Google OAuth 2.0 Client
    - ตั้งค่า LINE Login Channel
    - ตั้งค่า Facebook Login App
    - เพิ่มปุ่ม Social Login ใน UI

9. [Section 9: Update Main Layout & Dashboard](#section-9-update-main-layout--dashboard)
    - เพิ่ม Sidebar ใน Main Layout
    - ปรับปรุง Main Layout ให้รองรับการแสดงผลที่ดีขึ้น

---

### Section 8: Social Login (Google, GitHub, LINE)

#### ตั้งค่า Better Auth ให้ทำการ "เชื่อมโยงบัญชีอัตโนมัติ"

**ปัญหาคลาสสิกของระบบที่มีทั้งระบบ Login ด้วย Social และ Email/Password ผสมกัน**

**กรณีที่ 1: ผู้ใช้เคยสมัครด้วย Email/Password ไว้ก่อน แล้ววันนึงมากด "Login ด้วย Google/GitHub/LINE"**
- **ผลลัพธ์:** ระบบจะเด้ง Error account_not_linked ขึ้นมา
- **สาเหตุ:** เพราะระบบเจออีเมลในฐานข้อมูล แต่เห็นว่ามาจากคนละ Provider (อันเก่าเป็น Credential/Password แต่อันใหม่เป็น LINE) ระบบจึงบล็อกไว้เพื่อป้องกันคนอื่นเนียนใช้บัญชี LINE มาสวมรอยอีเมลเรา

**กรณีที่ 2: ผู้ใช้เคย Login ด้วย Google/GitHub/LINE ไว้ก่อน แล้วมา "สมัครสมาชิกใหม่" ด้วย Email/Password**
- **ผลลัพธ์:** ระบบจะ Error (มักจะแจ้งเตือนว่า Email already in use หรือ User already exists)
- **สาเหตุ:** เพราะระบบเจออีเมลในฐานข้อมูล แต่เห็นว่ามาจากคนละ Provider (อันเก่าเป็น Credential/Password แต่อันใหม่เป็น Google/GitHub/LINE) ระบบจึงบล็อกไว้เพื่อป้องกันคนอื่นเนียนใช้บัญชี Google/GitHub/LINE มาสวมรอยอีเมลเรา

> หากพบ ข้อผิดพลาด `account_not_linked` เป็นระบบรักษาความปลอดภัยพื้นฐานของไลบรารีจัดการ Authentication (เช่น Better Auth, NextAuth) เพื่อป้องกันไม่ให้บัญชีโซเชียลที่ไม่ได้รับอนุญาตเชื่อมโยงกับบัญชีผู้ใช้ที่มีอยู่แล้วโดยไม่ได้ตั้งใจ แต่เราสามารถตั้งค่าให้ระบบทำการ "เชื่อมโยงบัญชีอัตโนมัติ" ได้เมื่อพบว่าบัญชีโซเชียลที่พยายามเข้าสู่ระบบมีอีเมลตรงกับบัญชีผู้ใช้ที่มีอยู่แล้วในระบบของเรา โดยไม่ต้องแสดงข้อผิดพลาด account_not_linked และให้ผู้ใช้สามารถเข้าสู่ระบบได้ทันที

แก้ไขไฟล์ `lib/auth.ts` เพิ่ม Option การทำ Account Linking:

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
    // เพิ่มส่วนนี้เพื่ออนุญาตให้เชื่อมบัญชีอัตโนมัติเมื่ออีเมลตรงกัน
    account: {
      accountLinking: {
          enabled: true, 
          trustedProviders: ["google", "github", "line"], // ยอมรับให้อีเมลจาก 3 เจ้านี้ผูกกับบัญชีหลักได้
      }
    },
    plugins: [admin()],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
})
```

#### 8.1 ตั้งค่า GitHub OAuth

1. ไปที่ [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. คลิก **New OAuth App**
3. กรอกข้อมูล:
   - **Application name:** AI Native App
   - **Homepage URL:** http://localhost:3000
   - **Application description:** (ไม่จำเป็น)
   - **Authorization callback URL:**
```
http://localhost:3000/api/auth/callback/github
```
4. คัดลอก **Client ID** และ **Client Secret** ไปใส่ในไฟล์ `.env`
```env
# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```
5. แก้ไข `lib/auth.ts` เพิ่ม GitHub เป็น Social Provider
```typescript
socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
},
```
6. แก้ไขหน้า LoginForm เพื่อเพิ่มปุ่มเข้าสู่ระบบด้วย GitHub
แก้ไขไฟล์ `app/(auth)/auth/signin/LoginForm.tsx`:

```tsx
export default function LoginForm() {
  // Sign in with Social Providers
    const loginWithSocial = async (provider: "google" | "github" | "line") => {
        setIsLoading(true)
        setError("")
        try {
            const result = await signIn.social({
                provider,
                callbackURL: "/dashboard",
            })
            if (result.error) {
                setError(result.error.message || "เข้าสู่ระบบไม่สำเร็จ")
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
        <div className="space-y-3">
               <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => loginWithSocial("github")}
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Sign in with GitHub
                </Button>
        </div>
    )
}
```

7. แก้ไขไฟล์ next.config.js แสดงรูป avatar จาก GitHub ได้
```javascript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
```

#### 8.2 ตั้งค่า Google OAuth 2.0

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. ไปที่ **APIs & Services → Credentials**
4. คลิก **Create Credentials → OAuth 2.0 Client ID**
5. เลือก **Web application**
6. กรอกข้อมูล:
   - **Name:** AI Native App Google OAuth
   - **Authorized JavaScript origins:**
```http://localhost:3000
```                     
   - **Authorized redirect URIs:**
```http://localhost:3000/api/auth/callback/google
```
7. คัดลอก **Client ID** และ **Client Secret** ไปใส่ในไฟล์ `.env`
```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```
8. แก้ไข `lib/auth.ts` เพิ่ม Google เป็น Social Provider
```typescript
socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
}
```
9. แก้ไขหน้า LoginForm เพื่อเพิ่มปุ่มเข้าสู่ระบบด้วย Google
แก้ไขไฟล์ `app/(auth)/auth/signin/LoginForm.tsx`:

```tsx
export default function LoginForm() {
  // Sign in with Social Providers
    const loginWithSocial = async (provider: "google" | "github" | "line") => {
        setIsLoading(true)
        setError("")
        try {
            const result = await signIn.social({
                provider,
                callbackURL: "/dashboard",
            })
            if (result.error) {
                setError(result.error.message || "เข้าสู่ระบบไม่สำเร็จ")
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
        <div className="space-y-3">
                <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => loginWithSocial("google")}
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                </Button>
        </div>
    )
}
```


10. แก้ไขไฟล์ next.config.js แสดงรูป avatar จาก Google ได้
```javascript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      }
    ],
  },
}
```

#### 8.3 ตั้งค่า LINE Login

1. ไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง Provider ใหม่ (ถ้ายังไม่มี) ตัวอย่างชื่อ Provider: AI Native App
3. สร้าง **LINE Login Channel**
   - กรอกข้อมูล:
   - **Channel type:** LINE Login
   - **Provider:** เลือก Provider ที่สร้างไว้
   - **Region to provide the service:** Thailand
   - **Company or owner's country or region:** Thailand
   - **Chanel icon:** (ไม่จำเป็น)
   - **Channel name:** AI Native App Login
   - **Channel description:** LINE Login for AI Native App
   - **App types:** Web app
   - **Require two-factor authentication:** No
   - **Email address:** (กรอกอีเมลของคุณ)
   - **Privacy policy URL:** (ถ้ามี)
   - **Terms of use URL:** (ถ้ามี)
4. ไปที่ Tab **LINE Login** → ตั้งค่า **Callback URL:**
```
http://localhost:3000/api/auth/callback/line
```
5. คัดลอก **Channel ID** และ **Channel Secret** ไปใส่ในไฟล์ `.env`
```env
# LINE Login
LINE_CLIENT_ID="your-line-channel-id"
LINE_CLIENT_SECRET="your-line-channel-secret"
```

6. แก้ไข `lib/auth.ts` เพิ่ม LINE เป็น Social Provider
```typescript
socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    line: {
        clientId: process.env.LINE_CLIENT_ID as string,
        clientSecret: process.env.LINE_CLIENT_SECRET as string,
    },
},
```

7. แก้ไขหน้า LoginForm เพื่อเพิ่มปุ่มเข้าสู่ระบบด้วย LINE
แก้ไขไฟล์ `app/(auth)/auth/signin/LoginForm.tsx`:

```tsx
export default function LoginForm() {
  // Sign in with Social Providers
    const loginWithSocial = async (provider: "google" | "github" | "line") => {
        setIsLoading(true)
        setError("")
        try {
            const result = await signIn.social({
                provider,
                callbackURL: "/dashboard",
            })
            if (result.error) {
                setError(result.error.message || "เข้าสู่ระบบไม่สำเร็จ")
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
        <div className="space-y-3">
               <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => loginWithSocial("line")}
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 10.304c0-5.231-5.381-9.486-12-9.486S0 5.073 0 10.304c0 4.689 4.269 8.621 10.044 9.358.391.084.922.258 1.056.594.12.302.079.775.038 1.08l-.164 1.02c-.05.303-.24 1.186 1.037.647 1.278-.54 6.889-4.059 9.39-6.953.011-.01.011-.01.022-.02 1.625-1.897 2.577-4.133 2.577-6.63zM8.332 13.911H6.04a.5.5 0 01-.5-.5V7.126a.5.5 0 01.5-.5h.352a.5.5 0 01.5.5v5.88h1.44a.5.5 0 01.5.5v.352a.5.5 0 01-.51.5zm2.744 0h-.352a.5.5 0 01-.5-.5V7.126a.5.5 0 01.5-.5h.352a.5.5 0 01.5.5v6.285a.5.5 0 01-.5.5zm5.176 0h-.35a.5.5 0 01-.502-.429l-1.828-4.992v4.921a.5.5 0 01-.5.5h-.352a.5.5 0 01-.5-.5V7.126a.5.5 0 01.5-.5h.364a.5.5 0 01.5.39l1.823 4.978V7.126a.5.5 0 01.5-.5h.352a.5.5 0 01.5.5v6.285a.5.5 0 01-.5.5zm4.004-3.344h-.942v.8h.942a.5.5 0 01.5.5v.352a.5.5 0 01-.5.5h-1.8a.5.5 0 01-.5-.5V7.126a.5.5 0 01.5-.5h1.8a.5.5 0 01.5.5v.352a.5.5 0 01-.5.5h-.942v.8h.942a.5.5 0 01.5.5v.352a.5.5 0 01-.5.5z"/>
                    </svg>
                    Sign in with LINE
                </Button>
        </div>
    )
}
```

8. แก้ไขไฟล์ next.config.js แสดงรูป avatar จาก LINE ได้
```javascript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
}

```

#### 8.4 ตั้งค่า Facebook Login

1. เข้าสู่ระบบ Meta for Developers
   - ไปที่ [Meta for Developers](https://developers.facebook.com)
   - ล็อกอินด้วยบัญชี Facebook ส่วนตัวของคุณ (แนะนำให้ใช้บัญชีที่มีการยืนยันตัวตนหรือผูกเบอร์โทรศัพท์แล้ว เพื่อป้องกันการโดนบล็อกระหว่างการพัฒนา)
2. สร้างแอปใหม่
   - คลิกที่ "My Apps (แอพของฉัน)" บนเมนูด้านบนซ้าย
   - คลิก "Create App (สร้างแอพ)" ตั้งชื่อแอพ เช่น "AI Native App" กำหนดอีเมลติดต่อ
   - กรณีการใช้งาน: เลือก "ยืนตัวตนด้วย Facebook" (หรือ "Consumer" ถ้าไม่มีตัวเลือกนี้)
   - ธุรกิจ: เลือก "ฉันยังไม่ต้องการเชื่อมต่อพอร์ตโฟิโอของฉันกับธุรกิจ"
3. คัดลอก App ID และ App Secret ไปใส่ในไฟล์ `.env`
```env
# Facebook Login
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
```
4. แก้ไข `lib/auth.ts` เพิ่ม Facebook เป็น Social Provider
```typescript
socialProviders: {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    line: {
        clientId: process.env.LINE_CLIENT_ID as string,
        clientSecret: process.env.LINE_CLIENT_SECRET as string,
    },
    facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID as string,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    },
},
// เพิ่มส่วนนี้เพื่ออนุญาตให้เชื่อมบัญชีอัตโนมัติเมื่ออีเมลตรงกัน
account: {
  accountLinking: {
      enabled: true, 
      trustedProviders: ["google", "github", "line", "facebook"], // ยอมรับให้อีเมลจาก 4 เจ้านี้ผูกกับบัญชีหลักได้
  }
},
```
5. แก้ไขหน้า LoginForm เพื่อเพิ่มปุ่มเข้าสู่ระบบด้วย Facebook
แก้ไขไฟล์ `app/(auth)/auth/signin/LoginForm.tsx`:

```tsx
export default function LoginForm() {
  // Sign in with Social Providers
    const loginWithSocial = async (provider: "google" | "github" | "line" | "facebook") => {
        setIsLoading(true)
        setError("")
        try {
            const result = await signIn.social({
                provider,
                callbackURL: "/dashboard",
            })
            if (result.error) {
                setError(result.error.message || "เข้าสู่ระบบไม่สำเร็จ")
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
        <div className="space-y-3">
               <Button
                    variant="outline"
                    className="w-full justify-center gap-3 py-5"
                    onClick={() => loginWithSocial("facebook")}
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.495v-9.294H9.691v-3.622h3.129V8.413c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.464.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.763v2.312h3.591l-.467 3.622h-3.124V24h6.116C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z"/>
                    </svg>
                    Sign in with Facebook
                </Button>
        </div>
    )
}
```
6. แก้ไขไฟล์ next.config.js แสดงรูป avatar จาก Facebook ได้
```javascript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
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

#### 8.5 ดักจับ Error แจ้งเตือนผู้ใช้ (ฝั่ง Frontend / หน้า Sign Up)
สำหรับกรณีที่เคยใช้ Social Login แล้วมากดสมัครสมาชิกใหม่ ระบบ Account Linking มักจะไม่ทำงานย้อนกลับในจังหวะ Sign up ครับ สิ่งที่คุณต้องทำคือฝั่งหน้าเว็บ (React/Next.js) ต้องดัก Error จาก Better Auth แล้วขึ้นข้อความบอกผู้ใช้ตรงๆ

แก้ไขไฟล์ `app/(auth)/auth/signup/SignUpForm.tsx`:

```tsx
...
try {
    const result = await signUp.email({
        name,
        email,
        password,
    })

    if(result.error?.code === 'USER_ALREADY_EXISTS' || result.error?.message?.includes('already exists')) {
        setError("อีเมลนี้มีอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่าน หรือใช้ Google/GitHub/LINE Login แทน")
    } 
    else {
        router.push("/dashboard")
    }
} catch {
    setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
} finally {
    setIsLoading(false);
}

...
```

#### 8.6 ทำ Redirect ไม่ให้ผู้ใช้ที่ Login แล้วเข้ามาเห็นหน้า Login/Register ซ้ำ
แก้ไขไฟล์ `app/(auth)/auth/layout.tsx`:

```tsx
...

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {

    // ดึงข้อมูล Session จากฝั่ง Server
    const session = await auth.api.getSession({
        headers: await headers() 
    });

    // ถ้ามี Session (Login แล้ว) ให้เตะไปหน้า Dashboard ทันที
    if (session) {
        redirect("/dashboard");
    }
}

...
```
---

### Section 9: Update Main Layout & Dashboard

#### 9.1 เพิ่ม Sidebar ใน Main Layout
สร้าง ข้อมูลเมนูใน Sidebar ใหม่ใน `app/(main)/_components/sidebar/sidebar-data.ts`:

```typescript
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
}

export const sidebarData: NavSectionType[] = [
    {
        items: [
            { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        title: "AI & Data",
        items: [
            { title: "Chat", href: "/chat", icon: MessageCircle },
        ],
    },
    {
        title: "Management",
        items: [
            { title: "Projects", href: "/management/projects", icon: PanelsTopLeft },
            { title: "Teams", href: "/management/teams", icon: Component },
            { title: "Leads", href: "/management/lead", icon: ClipboardList },
        ],
    },
    {
        title: "Admin",
        items: [
            { title: "Users", href: "/admin/users", icon: Users },
            { title: "Knowledge", href: "/admin/knowledge", icon: LibraryBig },
            { title: "LINE Groups", href: "/admin/line-groups", icon: MessagesSquare },
            { title: "Settings", href: "/admin/settings", icon: Settings },
        ],
    },
]

export const bottomNavItems: NavItemType[] = [
    { title: "Help", href: "/help", icon: HelpCircle },
]
```

#### 9.2 สร้าง nav-item component ใน `app/(main)/_components/sidebar/nav-item.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItemType } from "./sidebar-data"

interface NavItemProps {
    item: NavItemType
    collapsed?: boolean
}

export function NavItem({ item, collapsed }: NavItemProps) {
    const pathname = usePathname()
    const isActive = pathname === item.href
    const Icon = item.icon

    return (
        <Link
            href={item.href}
            title={collapsed ? item.title : undefined}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                collapsed && "justify-center px-2"
            )}
        >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
            {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {item.badge}
                </span>
            )}
        </Link>
    )
}
```

#### 9.3 สร้าง nav-section component ใน `app/(main)/_components/sidebar/nav-section.tsx`:

```tsx
"use client"

import { useState } from "react"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavSectionType } from "./sidebar-data"
import { NavItem } from "./nav-item"

interface NavSectionProps {
    section: NavSectionType
    collapsed?: boolean
    defaultOpen?: boolean
}

export function NavSection({ section, collapsed, defaultOpen = true }: NavSectionProps) {
    const [open, setOpen] = useState(defaultOpen)

    // ถ้าไม่มี title (เช่น Dashboard) แสดง items ปกติ
    if (!section.title) {
        return (
            <nav className="space-y-1">
                {section.items.map((item) => (
                    <NavItem key={item.href} item={item} collapsed={collapsed} />
                ))}
            </nav>
        )
    }

    // ถ้า collapsed แสดงเฉพาะ icons
    if (collapsed) {
        return (
            <nav className="space-y-1">
                {section.items.map((item) => (
                    <NavItem key={item.href} item={item} collapsed={collapsed} />
                ))}
            </nav>
        )
    }

    // แสดงเป็น collapsible section
    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
                <span>{section.title}</span>
                <ChevronUp
                    className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        !open && "rotate-180"
                    )}
                />
            </button>
            {open && (
                <nav className="mt-1 space-y-1">
                    {section.items.map((item) => (
                        <NavItem key={item.href} item={item} collapsed={collapsed} />
                    ))}
                </nav>
            )}
        </div>
    )
}
```

#### 9.4 สร้าง sidebar component ใน `app/(main)/_components/sidebar/sidebar.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { PanelLeftClose, PanelLeft, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { sidebarData, bottomNavItems } from "./sidebar-data"
import { NavSection } from "./nav-section"
import { NavItem } from "./nav-item"

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                "flex h-screen flex-col border-r border-border bg-background transition-all duration-300 overflow-hidden",
                collapsed ? "w-13" : "w-64",
                className
            )}
        >
            {/* Header: Logo + Collapse Toggle */}
            <div
                className={cn(
                    "flex h-14 shrink-0 items-center border-b border-border",
                    collapsed ? "justify-center px-2" : "justify-between px-4"
                )}
            >
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-600 to-indigo-600 shadow-md">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground">
                            AI Native
                        </span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? (
                        <PanelLeft className="h-4 w-4" />
                    ) : (
                        <PanelLeftClose className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto">
                <div className={cn("py-4", collapsed ? "px-1" : "px-3")}>
                    <div className="space-y-2">
                        {sidebarData.map((section, index) => (
                            <NavSection
                                key={index}
                                section={section}
                                collapsed={collapsed}
                                defaultOpen={true}
                            />
                        ))}
                    </div>

                    {/* Bottom Navigation */}
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

#### 9.5 สร้าง index.ts สำหรับ export component ใน `app/(main)/_components/sidebar/index.ts`:

```typescript
export { Sidebar } from "./sidebar"
export { NavItem } from "./nav-item"
export { NavSection } from "./nav-section"
export { sidebarData, bottomNavItems } from "./sidebar-data"
export type { NavItemType, NavSectionType } from "./sidebar-data"
```

#### 9.6 สร้าง Header Component ใน `app/(main)/_components/header/header.tsx`:

รวม PageTitle (dynamic title จาก pathname) กับ UserMenu ไว้ใน Header component เดียว:

```tsx
"use client"

import { usePathname } from "next/navigation"
import { sidebarData, bottomNavItems } from "../sidebar/sidebar-data"
import { UserMenu } from "./user-menu"

export function Header() {
    const pathname = usePathname()

    // รวม items ทั้งหมดจาก sidebar แล้วหา title ที่ตรงกับ pathname
    const allItems = [
        ...sidebarData.flatMap((section) => section.items),
        ...bottomNavItems,
    ]
    const matched = allItems.find((item) => pathname === item.href)
    const title = matched?.title ?? "Dashboard"

    return (
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
    )
}
```

> **อธิบาย:** `Header` ใช้ `usePathname()` เทียบกับข้อมูลเมนูใน sidebar เพื่อแสดง title ให้ตรงกับหน้าที่ผู้ใช้อยู่ และรวม `UserMenu` ไว้ด้านขวา

#### 9.7 สร้าง index.ts สำหรับ export component ใน `app/(main)/_components/header/index.ts`:

```typescript
export { Header } from "./header"
export { UserMenu } from "./user-menu"
```

#### 9.8 ปรับปรุง Main Layout ใน `app/(main)/layout.tsx`:

```tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Sidebar } from "@/app/(main)/_components/sidebar"
import { Header } from "@/app/(main)/_components/header"

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
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    )
}
```

> **อธิบาย:** Layout ตอนนี้ใช้ `<Header />` แทนการเขียน `<header>` inline — ทำให้โค้ดสะอาดขึ้น และ Header จะแสดง title แบบ dynamic ตาม pathname อัตโนมัติ โดยไม่ต้อง hardcode ชื่อหน้า

---

### สรุป Day 4

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| 8.1 ตั้งค่า Google OAuth | สร้าง Credential ใน Google Cloud Console แล้วเชื่อมต่อกับ Better Auth |
| 8.2 ตั้งค่า GitHub OAuth | สร้าง OAuth App ใน GitHub แล้วเชื่อมต่อกับ Better Auth |
| 8.3 ตั้งค่า LINE Login | สร้าง LINE Login Channel ใน LINE Developers Console แล้วเชื่อมต่อกับ Better Auth |
| 8.4 ตั้งค่า Facebook Login | สร้างแอปใน Meta for Developers แล้วเชื่อมต่อกับ Better Auth |
| 8.5 ดักจับ Error แจ้งเตือนผู้ใช้ | แก้ไขหน้า Sign Up เพื่อดักจับกรณีอีเมลซ้ำแล้วมีบัญชีอยู่ และแสดงข้อความแจ้งเตือนที่เข้าใจง่าย |
| 8.6 ทำ Redirect ไม่ให้ผู้ใช้ที่ Login แล้วเข้ามาเห็นหน้า Login/Register ซ้ำ | แก้ไข Layout ของหน้า Auth เพื่อเช็ค Session และ Redirect ไปหน้า Dashboard ทันทีถ้ามี Session อยู่แล้ว |
| 9.1 เพิ่ม Sidebar ใน Main Layout | สร้างข้อมูลเมนูและโครงสร้าง Sidebar ใหม่ |
| 9.2 สร้าง nav-item component | สร้าง NavItem component สำหรับแสดงแต่ละเมนูใน Sidebar |
| 9.3 สร้าง nav-section component | สร้าง NavSection component สำหรับจัดกลุ่มเมนูใน Sidebar |
| 9.4 สร้าง sidebar component | สร้าง Sidebar component ที่รวม NavSection และ NavItem เข้าด้วยกัน พร้อมฟีเจอร์ย่อ/ขยาย |
| 9.5 สร้าง index.ts สำหรับ export component ใน Sidebar | สร้างไฟล์ index.ts เพื่อรวม export component ใน Sidebar |
| 9.6 สร้าง Header Component | สร้าง Header component ที่แสดงชื่อหน้าแบบ dynamic และรวม UserMenu ไว้ด้วย |
| 9.7 สร้าง index.ts สำหรับ export component ใน Header | สร้างไฟล์ index.ts เพื่อรวม export component ใน Header |
| 9.8 ปรับปรุง Main Layout | แก้ไข Main Layout เพื่อใช้ Header component และแสดง Sidebar ตลอดเวลา |