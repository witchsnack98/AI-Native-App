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