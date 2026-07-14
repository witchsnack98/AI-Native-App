## Next.js 16: AI-Native Developer Masterclass - Day 8

1. [Section 1: Full Chat Page](#section-1-full-chat-page)
    - สร้างหน้า Chat เต็มรูปแบบ
    - การจัดการ Chat Sessions
    - Workshop: ทดสอบระบบ Chat ทั้งหมด

2. [Section 2: LINE Webhook & Messaging API](#section-2-line-webhook--messaging-api)
    - ตั้งค่า LINE Messaging API Channel
    - สร้าง Webhook API สำหรับรับข้อความจาก LINE
    - เทคนิคการส่งข้อความตอบกลับจาก AI ไปยัง LINE

3. [Section 3: LINE Bot Features](#section-3-line-bot-features)
    - Keyword Triggers สำหรับ LINE Group
    - Rich Messages (Flex Message)

4. [Section 4: Lead Database & LINE Group Alert](#section-4-lead-database--line-group-alert)
    - เพิ่ม Prisma Model สำหรับเก็บข้อมูล Lead ใน PostgreSQL
    - Auto-register Group ID เมื่อ Bot เข้ากลุ่ม (บันทึกลง DB อัตโนมัติ)
    - สร้าง Lead Capture Form บนหน้า Landing Page
    - การส่งการแจ้งเตือนผ่าน LINE Messaging API (ส่งเข้ากลุ่ม)
    - สร้างหน้าจัดการ Lead สำหรับ Admin/Manager
    - สร้างหน้า Admin จัดการกลุ่ม LINE (เปิด/ปิดแจ้งเตือน, เพิ่มกลุ่มด้วยมือ)


### Section 1: Full Chat Page

> **สรุป:** ระบบ Chat เต็มรูปแบบ รองรับ Session Management, Memory (server-side history), Streaming (SSE), และ Chat History Sidebar

#### 1.1 Chat Client Library — `lib/chat-client.ts`

สร้าง Streaming client ที่เรียก `/api/chat/stream` ผ่าน SSE พร้อมส่ง `sessionId` เพื่อให้ server โหลด history จาก DB:

สร้างไฟล์ `lib/chat-client.ts`:

```typescript
/**
 * Chat Client Library
 * ใช้ Streaming (SSE) เรียก /api/chat/stream พร้อมรองรับ sessionId
 */

export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  onChunk: (accumulatedContent: string) => void
): Promise<string> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${res.status}`)
  }

  if (!res.body) {
    throw new Error("No response body")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ""
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE lines
    const lines = buffer.split("\n")
    buffer = lines.pop() || "" // เก็บ incomplete line ไว้

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim()
        if (data === "[DONE]") continue

        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            fullContent += parsed.content
            onChunk(fullContent)
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  }

  return fullContent
}
```

> **หมายเหตุ:** `sendChatMessage` รับ `sessionId` (ไม่ใช่ message history array) — server จะโหลด history จาก DB เอง (20 messages ล่าสุด)

#### 1.2 Chat Session API — `api/chat/sessions/[id]/route.ts`

สร้าง API สำหรับจัดการ session รายตัว (GET messages, PUT title, DELETE):

สร้างไฟล์ `app/api/chat/sessions/[id]/route.ts`:

```typescript
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// GET — ดึง messages ของ session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const chatSession = await prisma.chatSession.findUnique({
    where: { id, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!chatSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  return NextResponse.json({ session: chatSession })
}

// PUT — อัปเดต title ของ session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { title } = await request.json()

  const chatSession = await prisma.chatSession.update({
    where: { id, userId: session.user.id },
    data: { title },
  })

  return NextResponse.json({ session: chatSession })
}

// DELETE — ลบ session พร้อม messages (Cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  await prisma.chatSession.delete({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ message: "Deleted" })
}
```

#### 1.3 สร้างหน้า Chat เต็มรูปแบบ

ติดตั้ง dependencies สำหรับ Markdown rendering:

```bash
npm install react-markdown remark-gfm
```

สร้างไฟล์ `app/(main)/chat/ChatContent.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { sendChatMessage } from "@/lib/chat-client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string | null
  updatedAt: string
  messages?: { id: string; role: string; content: string; createdAt: string }[]
}
    
export default function ChatContent() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSidebar, setActiveSidebar] = useState(true)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Redirect ถ้าไม่ได้ล็อกอิน
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // โหลด Sessions
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const res = await fetch("/api/chat/sessions")
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error("Failed to load sessions:", error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    if (session) loadSessions()
  }, [session, loadSessions])

  // โหลด Messages ของ Session ที่เลือก
  async function loadSessionMessages(sessionId: string) {
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`)
      const data = await res.json()

      if (data.session?.messages) {
        const loadedMessages: Message[] = data.session.messages.map(
          (msg: { id: string; role: string; content: string; createdAt: string }) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.createdAt),
          })
        )
        setMessages(loadedMessages)
        setActiveSessionId(sessionId)
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // สร้าง Session ใหม่
  async function createNewSession(title?: string): Promise<string | null> {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "สนทนาใหม่" }),
      })
      const data = await res.json()
      if (data.session) {
        await loadSessions()
        return data.session.id
      }
    } catch (error) {
      console.error("Failed to create session:", error)
    }
    return null
  }

  // อัพเดท title ของ session
  async function updateSessionTitle(sessionId: string, title: string) {
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      await loadSessions()
    } catch (error) {
      console.error("Failed to update session title:", error)
    }
  }

  // ลบ Session
  async function deleteSession(sessionId: string) {
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" })
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setMessages([])
      }
      await loadSessions()
    } catch (error) {
      console.error("Failed to delete session:", error)
    }
  }

  // เริ่มสนทนาใหม่
  function handleNewChat() {
    setActiveSessionId(null)
    setMessages([])
    setInput("")
    inputRef.current?.focus()
  }

  // ส่งข้อความ
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userText = input.trim()

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date(),
    }

    const aiMsgId = `ai_${Date.now()}`
    const aiMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput("")
    setIsLoading(true)

    try {
      // สร้าง session ใหม่ถ้ายังไม่มี
      let currentSessionId = activeSessionId
      if (!currentSessionId) {
        // ใช้ข้อความแรกเป็น title (ตัดไม่เกิน 50 ตัวอักษร)
        const title = userText.length > 50 ? userText.substring(0, 50) + "..." : userText
        currentSessionId = await createNewSession(title)
        if (currentSessionId) {
          setActiveSessionId(currentSessionId)
        }
      }

      // ส่งข้อความผ่าน Streaming API
      await sendChatMessage(
        userText,
        currentSessionId,
        (updatedContent) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, content: updatedContent } : msg
            )
          )
        }
      )

      // รีโหลด sessions เพื่ออัปเดต updatedAt
      await loadSessions()
    } catch (error: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, content: `❌ เกิดข้อผิดพลาด: ${error.message}` }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100%+3rem)] -m-6 bg-gray-50 dark:bg-gray-950">
      {/* Sidebar — ประวัติการสนทนา */}
      <div
        className={`${
          activeSidebar ? "w-72" : "w-0"
        } bg-gray-900 dark:bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* New Chat Button */}
        <div className="p-4 shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สนทนาใหม่
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="text-xs text-gray-400 px-2 mb-2">ประวัติการสนทนา</p>

          {isLoadingSessions && sessions.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-4">กำลังโหลด...</div>
          )}

          {sessions.length === 0 && !isLoadingSessions && (
            <div className="text-xs text-gray-500 text-center py-4">ยังไม่มีประวัติ</div>
          )}

          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center rounded-lg transition ${
                activeSessionId === s.id
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
              }`}
            >
              <button
                onClick={() => loadSessionMessages(s.id)}
                className="flex-1 text-left px-3 py-2.5 text-sm truncate"
                title={s.title || "สนทนาใหม่"}
              >
                <span className="mr-2">💬</span>
                {s.title || "สนทนาใหม่"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(s.id)
                }}
                className="opacity-0 group-hover:opacity-100 px-2 py-1 text-gray-400 hover:text-red-400 transition"
                title="ลบสนทนา"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500 shrink-0">
          {sessions.length} สนทนา
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSidebar(!activeSidebar)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-semibold text-lg text-gray-900 dark:text-white">AI Chatbot</h1>
            {activeSessionId && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                ● เชื่อมต่อแล้ว
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {session?.user?.name}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Loading Session Messages */}
          {isLoadingMessages && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400 flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังโหลดข้อความ...
              </div>
            </div>
          )}

          {/* Empty State */}
          {messages.length === 0 && !isLoadingMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-300">AI Assistant</h2>
              <p className="mt-2 max-w-md dark:text-gray-400">
                ถามอะไรเกี่ยวกับเอกสารบริษัทได้เลยครับ
                <br />
                <span className="text-sm">ระบบจะจดจำบทสนทนาและใช้ข้อมูลจาก Knowledge Base ในการตอบ</span>
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "นโยบายการคืนสินค้าเป็นอย่างไร?",
                  "สินค้าขายดีมีอะไรบ้าง?",
                  "ข้อมูลบริษัทคืออะไร?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                      inputRef.current?.focus()
                    }}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-start gap-3 max-w-2xl">
                {/* Avatar */}
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm">
                    🤖
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`rounded-2xl px-5 py-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-3">
                              <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm border border-gray-300 dark:border-gray-600">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700">{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-200 text-sm">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                              {children}
                            </td>
                          ),
                          tr: ({ children }) => (
                            <tr className="even:bg-gray-50 dark:even:bg-gray-700/50 hover:bg-blue-50/40 dark:hover:bg-gray-700/70 transition-colors">
                              {children}
                            </tr>
                          ),
                          p: ({ children }) => (
                            <p className="my-2 leading-relaxed">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
                          ),
                          code: ({ children, className }) => {
                            const isBlock = className?.includes("language-")
                            return isBlock ? (
                              <code className={`${className} block bg-gray-900 text-green-300 rounded-lg p-3 my-2 text-xs overflow-x-auto`}>
                                {children}
                              </code>
                            ) : (
                              <code className="bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-400 rounded px-1.5 py-0.5 text-xs font-mono">
                                {children}
                              </code>
                            )
                          },
                          pre: ({ children }) => (
                            <pre className="my-2">{children}</pre>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 my-3">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 my-2">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 my-2">{children}</h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 my-2 italic text-gray-600 dark:text-gray-300 rounded-r">
                              {children}
                            </blockquote>
                          ),
                          a: ({ children, href }) => (
                            <a href={href} className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          hr: () => <hr className="my-3 border-gray-200 dark:border-gray-600" />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1.5 ${
                      message.role === "user" ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Avatar */}
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 text-sm">
                    👤
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && messages.length > 0 && !messages[messages.length - 1]?.content && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-sm">
                  🤖
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="พิมพ์คำถามของคุณ..."
              disabled={isLoading}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              ส่ง
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
            AI อาจตอบผิดพลาดได้ กรุณาตรวจสอบข้อมูลสำคัญอีกครั้ง
          </p>
        </div>
      </div>
    </div>
  )
}
```

สร้างไฟล์ `app/(main)/chat/page.tsx`:

```tsx
import ChatContent from '@/app/(main)/chat/ChatContent'

import { Metadata } from "next"

export const metadata: Metadata = {
    title: "AI Chat",
    description:
        "AI Chat — ระบบแชท AI ครบวงจร รองรับ Session Management, Memory (server-side history), Streaming (SSE), และ Chat History Sidebar ที่ใช้งานง่ายและมีประสิทธิภาพ เหมาะสำหรับการสร้างแชทบอท, ผู้ช่วยส่วนตัว, หรือระบบตอบคำถามอัจฉริยะ",
    keywords: [
        "AI Chat",
        "แชท AI",
        "AI Native App",
        "ศูนย์กลางการจัดการ",
        "Knowledge Base",
        "AI Chat",
        "สถิติการใช้งาน",
        "ระบบจัดการ AI",
    ],
}

export default function page() {
  return <ChatContent />
}
```

#### 1.4 สรุป Chat System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                     Chat System Flow                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. ผู้ใช้พิมพ์ข้อความแรก                                              │
│     └─→ สร้าง ChatSession ใหม่ (POST /api/chat/sessions)          │
│     └─→ ใช้ข้อความแรกเป็น title                                     │
│                                                                   │
│  2. ส่งข้อความ (ทุกครั้ง)                                              │
│     └─→ sendChatMessage(message, sessionId, onChunk)              │
│     └─→ POST /api/chat/stream { message, sessionId }             │
│                                                                   │
│  3. Server-side (stream route)                                    │
│     └─→ โหลด history จาก DB (20 messages ล่าสุด)                    │
│     └─→ ค้นหา context จาก Vector DB (RAG)                         │
│     └─→ OpenAI Streaming → SSE Response                          │
│     └─→ บันทึก user + assistant messages ลง DB                    │
│                                                                   │
│  4. คลิก Session เก่าใน Sidebar                                     │
│     └─→ GET /api/chat/sessions/{id} → โหลด messages ทั้งหมด         │
│                                                                   │
│  5. ลบ Session                                                    │
│     └─→ DELETE /api/chat/sessions/{id} → Cascade ลบ messages      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

#### 1.5 สรุปไฟล์ทั้งหมด

| ไฟล์ | ประเภท | รายละเอียด |
|------|--------|-----------|
| `lib/chat-client.ts` | สร้างใหม่ | Streaming SSE client, ส่ง `sessionId` |
| `app/api/chat/sessions/[id]/route.ts` | สร้างใหม่ | GET messages / PUT title / DELETE session |
| `app/(main)/chat/page.tsx` | สร้างใหม่ | Full Chat UI + Session Management + Markdown Rendering + Dark Mode |

**Dependencies เพิ่มเติม:**

| Package | เวอร์ชัน | รายละเอียด |
|---------|---------|------------|
| `react-markdown` | latest | Render Markdown content (table, heading, list, code, blockquote ฯลฯ) |
| `remark-gfm` | latest | Plugin สำหรับ GitHub Flavored Markdown (tables, strikethrough, autolink) |

#### 1.6 หมายเหตุสำคัญ

1. **Memory ฝั่ง Server:** `sendChatMessage` ส่งแค่ `sessionId` — server โหลด history จาก DB เอง (ไม่ส่ง message array จาก client)
2. **Auto Session:** สร้าง session อัตโนมัติเมื่อส่งข้อความแรก, ไม่ต้องกดปุ่มสร้างเอง
3. **Cascade Delete:** ลบ session จะลบ messages ทั้งหมดด้วย (Prisma `onDelete: Cascade`)
4. **Streaming:** ใช้ SSE (`/api/chat/stream`) แสดงผลแบบ real-time ไม่ต้องรอคำตอบทั้งหมด
5. **Markdown Rendering:** ใช้ `react-markdown` + `remark-gfm` เฉพาะ assistant messages — รองรับตาราง (มีขอบ, header gradient, striped rows), code blocks (syntax highlight สี), headings, bold, italic, lists, blockquote, links, hr ฯลฯ
6. **UI/UX:** หน้า chat เต็มรูปแบบพร้อม sidebar สำหรับประวัติการสนทนา, responsive, dark mode, และ typing indicator

---

### Section 2: LINE Webhook & Messaging API

#### 2.1 ภาพรวมของ LINE Messaging API และ Webhook

**Line Messaging API** เป็นชุดเครื่องมือที่ LINE ให้บริการสำหรับนักพัฒนาในการสร้างแอปพลิเคชันที่สามารถสื่อสารกับผู้ใช้ผ่าน LINE ได้ เช่น การสร้าง Chatbot, การส่งข้อความอัตโนมัติ, การตอบกลับข้อความ ฯลฯ

**Webhook** คือ URL ที่ LINE จะส่งข้อมูล (เช่น ข้อความที่ผู้ใช้ส่งมา) เมื่อเกิดเหตุการณ์ต่างๆ เช่น ผู้ใช้ส่งข้อความมาที่ Bot, ผู้ใช้เพิ่ม Bot เป็นเพื่อน ฯลฯ เราจะสร้าง Webhook API ใน Next.js เพื่อรับข้อมูลเหล่านี้และประมวลผลตามต้องการ

#### 2.2 ตั้งค่า LINE Messaging API Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง **Provider** ใหม่ (ถ้ายังไม่มี)
3. สร้าง **Messaging API Channel**
4. ไปที่ Tab **Messaging API**:
   - คัดลอก **Channel Access Token** (กดออก Long-lived token)
   - ไปที่ **Webhook settings** → เปิดใช้งาน Webhook
   - ใส่ **Webhook URL:** `https://your-domain.com/api/line/webhook`
5. ไปที่ Tab **Basic settings**:
   - คัดลอก **Channel Secret**
6. ปิด **Auto-reply messages** (ตอบกลับอัตโนมัติ) ใน LINE Official Account Manager

#### 2.3 สร้าง LINE Webhook API

สร้างไฟล์ `app/api/line/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateRAGResponse } from "@/lib/rag-service"

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

// ตรวจสอบ Signature จาก LINE
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64")
  return hash === signature
}

// ส่งข้อความตอบกลับไปยัง LINE
async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature") || ""

    // 1. ตรวจสอบ Signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data = JSON.parse(body)

    // 2. วนลูปประมวลผล Events
    for (const event of data.events) {

      // --- ส่วนที่เพิ่มใหม่: ตรวจสอบและแสดง Group ID ---
      if (event.source && event.source.groupId) {
        console.log("🎯 พบ Group ID:", event.source.groupId); // ดูค่าได้ที่ Terminal
      }

      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text
        const replyToken = event.replyToken

        // 3. สร้างคำตอบด้วย RAG
        try {
          const response = await generateRAGResponse(userMessage, [], 3)

          // 4. ส่งคำตอบกลับ
          let replyText = response.answer

          // เพิ่มแหล่งอ้างอิง (ถ้ามี)
          if (response.sources.length > 0) {
            replyText += "\n\n📎 แหล่งอ้างอิง:"
            response.sources.slice(0, 2).forEach((source) => {
              replyText += `\n• ${source.metadata?.source || "N/A"}`
            })
          }

          await replyMessage(replyToken, replyText)
        } catch (error) {
          await replyMessage(
            replyToken,
            "ขออภัยครับ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง"
          )
        }
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error: any) {
    console.error("LINE Webhook Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

#### 2.4 ทดสอบ Webhook ด้วย ngrok

สำหรับทดสอบ webhook บน localhost:

```bash
# ติดตั้ง ngrok
npm install -g ngrok

# รัน ngrok
ngrok http 3000
```

คัดลอก URL ที่ได้ (เช่น `https://xxxx.ngrok.io`) ไปตั้งค่าใน LINE Developers Console:

```
Webhook URL: https://xxxx.ngrok.io/api/line/webhook
```

#### 2.5 ตรวจสอบการทำงาน
1. ส่งข้อความไปยัง LINE Bot (ผ่าน 1:1 หรือ Group)
2. ดูคำตอบที่ได้รับ
3. ดู Log ใน Terminal เพื่อเช็ค Group ID (ถ้าอยู่ใน Group)

> **หมายเหตุ:** ในการพัฒนาและทดสอบบน localhost, ngrok จะช่วยให้ LINE สามารถส่ง webhook มาที่เครื่องของคุณได้โดยไม่ต้อง deploy จริงไปยัง server ภายนอก
> **Group ID:** ถ้าคุณส่งข้อความใน Group, คุณจะเห็น Group ID ใน Log ของ Terminal ซึ่งสามารถนำไปใช้สำหรับการตั้งค่าเพิ่มเติม เช่น การตอบเฉพาะข้อความที่มี keyword ใน Group ได้ในขั้นตอนถัดไป

---

### Section 3: LINE Bot Features

#### 3.1 Keyword Triggers สำหรับ LINE Group

เมื่อ Bot อยู่ใน Group ไม่ควรตอบทุกข้อความ ควรตอบเฉพาะเมื่อมี keyword:

แก้ไขไปที่ webhook route (`app/api/line/webhook/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateRAGResponse } from "@/lib/rag-service"

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

// Keyword สำหรับเรียก Bot ใน Group
const TRIGGER_KEYWORDS = ["/bot", "!ask", "/ถาม", "@bot"]

// ตรวจสอบ Signature จาก LINE
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64")
  return hash === signature
}

// ส่งข้อความตอบกลับไปยัง LINE
async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature") || ""

    // 1. ตรวจสอบ Signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data = JSON.parse(body)

    // 2. วนลูปประมวลผล Events
    for (const event of data.events) {

      // ตรวจสอบและแสดง Group ID ถ้าเป็นข้อความจาก Group (ใช้สำหรับ Debug)
      if (event.source && event.source.groupId) {
        console.log("🎯 พบ Group ID:", event.source.groupId); // ดูค่าได้ที่ Terminal
      }

      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text
        const replyToken = event.replyToken
        const isGroup = event.source.type === "group" || event.source.type === "room"

        // ใน Group: ตอบเฉพาะเมื่อมี keyword
        if (isGroup) {
          const hasTrigger = TRIGGER_KEYWORDS.some((keyword) =>
            userMessage.toLowerCase().startsWith(keyword.toLowerCase())
          )

          if (!hasTrigger) continue // ข้ามข้อความนี้

          // ลบ keyword ออกจากข้อความ
          let cleanMessage = userMessage
          for (const keyword of TRIGGER_KEYWORDS) {
            cleanMessage = cleanMessage
              .replace(new RegExp(`^${keyword}\\s*`, "i"), "")
              .trim()
          }

          // สร้างคำตอบด้วย RAG
          try {
            const response = await generateRAGResponse(cleanMessage, [], 3)

            let replyText = response.answer
            if (response.sources.length > 0) {
              replyText += "\n\n📎 แหล่งอ้างอิง:"
              response.sources.slice(0, 2).forEach((source) => {
                replyText += `\n• ${source.metadata?.source || "N/A"}`
              })
            }

            await replyMessage(replyToken, replyText)
          } catch (error) {
            await replyMessage(
              replyToken,
              "ขออภัยครับ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง"
            )
          }
        } else {
          // Chat 1:1: ตอบทุกข้อความ
          try {
            const response = await generateRAGResponse(userMessage, [], 3)

            let replyText = response.answer
            if (response.sources.length > 0) {
              replyText += "\n\n📎 แหล่งอ้างอิง:"
              response.sources.slice(0, 2).forEach((source) => {
                replyText += `\n• ${source.metadata?.source || "N/A"}`
              })
            }

            await replyMessage(replyToken, replyText)
          } catch (error) {
            await replyMessage(
              replyToken,
              "ขออภัยครับ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง"
            )
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error: any) {
    console.error("LINE Webhook Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

#### 3.2 Rich Messages (Flex Message)

**Flex Message** คือรูปแบบข้อความที่สามารถปรับแต่งได้อย่างยืดหยุ่น เช่น มี header, body, footer, รูปภาพ, ปุ่ม ฯลฯ ซึ่งช่วยให้การตอบกลับดูน่าสนใจและมีข้อมูลครบถ้วนมากขึ้น

**หมายเหตุ:** การใช้ Flex Message ต้องส่งข้อมูลในรูปแบบ JSON ที่กำหนดตามโครงสร้างของ LINE Messaging API และต้องตั้งค่า `type: "flex"` และ `altText` (ข้อความสำรองสำหรับกรณีที่ Flex Message ไม่สามารถแสดงได้)

ตัวอย่างการส่ง Flex Message แทนข้อความธรรมดา:

แก้ไขฟังก์ชัน `replyMessage` เป็น `replyFlexMessage` เพื่อส่ง Flex Message:

```typescript
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateRAGResponse } from "@/lib/rag-service"

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

// Keyword สำหรับเรียก Bot ใน Group
const TRIGGER_KEYWORDS = ["/bot", "!ask", "/ถาม", "@bot"]

// ตรวจสอบ Signature จาก LINE
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64")
  return hash === signature
}

// ส่งข้อความตอบกลับไปยัง LINE (แบบ text ธรรมดา สำหรับ error)
async function replyMessage(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  })
}

// ส่ง Flex Message ตอบกลับไปยัง LINE
async function replyFlexMessage(
  replyToken: string,
  answer: string,
  sources: Array<{ source: string; similarity: number }>
) {
  const flexMessage = {
    type: "flex",
    altText: answer.substring(0, 100),
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🤖 AI Assistant",
            weight: "bold",
            size: "lg",
            color: "#1a56db",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: answer,
            wrap: true,
            size: "sm",
          },
          ...(sources.length > 0
            ? [
                {
                  type: "separator" as const,
                  margin: "md",
                },
                {
                  type: "text" as const,
                  text: "📎 แหล่งอ้างอิง",
                  size: "xs" as const,
                  color: "#999999",
                  margin: "md",
                },
                ...sources.slice(0, 2).map((s) => ({
                  type: "text" as const,
                  text: `• ${s.source} (${Math.round(s.similarity * 100)}%)`,
                  size: "xs" as const,
                  color: "#999999",
                })),
              ]
            : []),
        ],
      },
    },
  }

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [flexMessage],
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature") || ""

    // 1. ตรวจสอบ Signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data = JSON.parse(body)

    // 2. วนลูปประมวลผล Events
    for (const event of data.events) {

      // ตรวจสอบและแสดง Group ID ถ้าเป็นข้อความจาก Group (ใช้สำหรับ Debug)
      if (event.source && event.source.groupId) {
        console.log("🎯 พบ Group ID:", event.source.groupId); // ดูค่าได้ที่ Terminal
      }

      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text
        const replyToken = event.replyToken
        const isGroup = event.source.type === "group" || event.source.type === "room"

        // ใน Group: ตอบเฉพาะเมื่อมี keyword
        if (isGroup) {
          const hasTrigger = TRIGGER_KEYWORDS.some((keyword) =>
            userMessage.toLowerCase().startsWith(keyword.toLowerCase())
          )

          if (!hasTrigger) continue // ข้ามข้อความนี้

          // ลบ keyword ออกจากข้อความ
          let cleanMessage = userMessage
          for (const keyword of TRIGGER_KEYWORDS) {
            cleanMessage = cleanMessage
              .replace(new RegExp(`^${keyword}\\s*`, "i"), "")
              .trim()
          }

          // สร้างคำตอบด้วย RAG
          try {
            const response = await generateRAGResponse(cleanMessage, [], 3)
            const sources = response.sources.map((s) => ({
              source: s.metadata?.source || "N/A",
              similarity: s.similarity ?? 0,
            }))
            await replyFlexMessage(replyToken, response.answer, sources)
          } catch (error) {
            await replyMessage(
              replyToken,
              "ขออภัยครับ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง"
            )
          }
        } else {
          // Chat 1:1: ตอบทุกข้อความ
          try {
            const response = await generateRAGResponse(userMessage, [], 3)
            const sources = response.sources.map((s) => ({
              source: s.metadata?.source || "N/A",
              similarity: s.similarity ?? 0,
            }))
            await replyFlexMessage(replyToken, response.answer, sources)
          } catch (error) {
            await replyMessage(
              replyToken,
              "ขออภัยครับ ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง"
            )
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error: any) {
    console.error("LINE Webhook Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

---


### Section 4: Lead Database & LINE Group Alert

#### 4.1 LINE Messaging API สำหรับส่งแจ้งเตือน

เราใช้ **LINE Messaging API (Push Message)** ที่ตั้งค่าไว้แล้วส่งข้อความแจ้งเตือนเข้ากลุ่มโดยตรง

**สิ่งที่ต้องใช้:**
- `LINE_CHANNEL_ACCESS_TOKEN` — ได้จาก LINE Developers Console (Messaging API Channel)
- `LINE_GROUP_ID` — ได้จากการดู Log ที่ Terminal เมื่อ Bot ถูกเชิญเข้ากลุ่ม (ดูจาก `console.log("🎯 พบ Group ID:", event.source.groupId)` ใน webhook route)

**💰 ค่าใช้จ่าย LINE Messaging API:**

| ประเภทข้อความ | ค่าใช้จ่าย |
|--------------|-----------|
| **Reply Message** (ตอบกลับใน Webhook) | ✅ **ฟรีไม่จำกัด** |
| **Push Message** (ส่งออกไปเอง) | นับตามโควตาของแผน |

| แผน | ข้อความบรอดแคสต์/เดือน | ราคา | ค่าข้อความเพิ่มเติม |
|-----|----------------------|------|-------------------|
| **ฟรี (Communication)** | 300 ข้อความ | ฟรี | - |
| **เบสิก (Basic)** | 15,000 ข้อความ | ฿1,280/เดือน | 0.10 บาท/ข้อความ |
| **โปร (Pro)** | 35,000 ข้อความ | ฿1,780/เดือน | 0.06 บาท/ข้อความ |

> **สำคัญ:**
> - **Reply Message** (ที่ใช้ใน LINE Bot Webhook) = **ฟรีไม่จำกัด** ไม่นับโควตา
> - **Push Message / Broadcast** (ที่ใช้ส่งแจ้งเตือน Lead เข้ากลุ่มในบทนี้) = **นับโควตา** ตามแผนที่เลือก
> - แผนฟรีได้ 300 ข้อความบรอดแคสต์/เดือน เพียงพอสำหรับการทดสอบและใช้งานเบื้องต้น
> - แผนเบสิก/โปร สามารถซื้อข้อความเพิ่มเติมได้ในราคาข้างต้น
> - ราคาอ้างอิงจาก [LINE for Business](https://lineforbusiness.com/th/service/line-oa-features/broadcast-message)

**ทดสอบส่งข้อความเข้ากลุ่ม:**
```bash
curl -X POST https://api.line.me/v2/bot/message/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN" \
  -d '{
    "to": "YOUR_GROUP_ID",
    "messages": [{ "type": "text", "text": "ทดสอบการแจ้งเตือนเข้ากลุ่ม" }]
  }'
```

> **ข้อดีของ LINE Messaging API:**
> - ✅ ใช้ Channel Access Token ตัวเดียวกับ LINE Bot ที่ตั้งไว้แล้ว
> - ✅ รองรับ Flex Message ได้ (สวยกว่า text ธรรมดา)
> - ✅ ส่งได้ทั้ง 1:1 และ Group

#### 4.2 เพิ่ม Prisma Model สำหรับ Lead และ LINE Group

เพิ่ม Model `Lead` และ `LineGroup` ใน `prisma/schema.prisma`:

```prisma
// ==========================================
// Lead Capture Table
// ==========================================
model Lead {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  company   String?
  interest  String?
  source    String   @default("website")
  status    String   @default("new")  // new, contacted, qualified, converted
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("lead")
}

// ==========================================
// LINE Group Registration Table
// ==========================================
model LineGroup {
  id        String   @id @default(cuid())
  groupId   String   @unique          // LINE Group ID (เช่น Cf224170d...)
  groupName String?                   // ชื่อกลุ่ม (ดึงจาก LINE API)
  active    Boolean  @default(true)   // true = ส่งแจ้งเตือน, false = หยุดส่ง
  joinedAt  DateTime @default(now())  // วันที่ Bot เข้ากลุ่ม
  updatedAt DateTime @updatedAt

  @@map("line_group")
}
```

จากนั้น Migrate:

```bash
npx prisma migrate dev --name add_lead
หรือ
npx prisma db push
npx prisma generate
```

#### 4.3 กำหนด Environment Variables สำหรับ n8n Webhook
เพิ่มใน `.env`:

```env
LINE_GROUP_IDS="your-group-id-1,your-group-id-2" # ใช้สำหรับส่งข้อความไปยังกลุ่ม LINE (ถ้ามีหลายกลุ่ม ให้คั่นด้วยเครื่องหมายจุลภาค)
```

#### 4.4 สร้าง line-push.ts — ส่งข้อความเข้ากลุ่ม LINE (ดึงจาก DB อัตโนมัติ)

สร้างไฟล์ `lib/line-push.ts`:

```typescript
// lib/line-push.ts
// ส่ง Push Message ไปยังกลุ่ม LINE ผ่าน LINE Messaging API
// รองรับหลายกลุ่มพร้อมกัน — ดึง Group IDs จาก Database (auto-register)
// fallback ไปใช้ ENV ถ้า DB ยังไม่มีข้อมูล

import { prisma } from "@/lib/prisma"

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

/**
 * ดึง Group IDs ทั้งหมดที่ active จาก Database (ตาราง line_group)
 * ถ้าใน DB ยังไม่มี → fallback ไปอ่านจาก ENV (LINE_GROUP_IDS / LINE_GROUP_ID)
 */
async function getGroupIds(): Promise<string[]> {
  try {
    // 1. ดึงจาก Database ก่อน (กลุ่มที่ active)
    const groups = await prisma.lineGroup.findMany({
      where: { active: true },
      select: { groupId: true },
    })

    if (groups.length > 0) {
      return groups.map((g) => g.groupId)
    }
  } catch (error) {
    console.warn("⚠️ ไม่สามารถดึง Group IDs จาก DB:", error)
  }

  // 2. Fallback: อ่านจาก ENV
  const ids = process.env.LINE_GROUP_IDS || process.env.LINE_GROUP_ID || ""
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

/**
 * ส่ง Push Message ไปยัง target เดียว (userId / groupId)
 */
async function pushMessage(to: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error(`❌ LINE Push Message Error (${to}):`, res.status, error)
    throw new Error(`LINE Push Message failed: ${res.status} → ${to}`)
  }

  console.log("✅ LINE Push Message ส่งสำเร็จ →", to)
}

/**
 * ส่ง Push Message (text) ไปยังทุกกลุ่ม LINE ที่ active ใน DB
 * - ส่งพร้อมกันทุกกลุ่มด้วย Promise.allSettled
 * - Push Message นับโควตาตามแผน LINE OA
 */
export async function pushMessageToGroup(text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN ยังไม่ได้ตั้งค่า — ข้ามการส่งแจ้งเตือน")
    return
  }

  const groupIds = await getGroupIds()
  if (groupIds.length === 0) {
    console.warn("⚠️ ไม่พบกลุ่ม LINE ที่ active — ข้ามการส่งแจ้งเตือน")
    return
  }

  const results = await Promise.allSettled(
    groupIds.map((groupId) => pushMessage(groupId, text))
  )

  const success = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length

  if (failed > 0) {
    console.warn(`⚠️ LINE Push: สำเร็จ ${success}/${groupIds.length} กลุ่ม (ล้มเหลว ${failed})`)
  } else {
    console.log(`✅ LINE Push: ส่งสำเร็จทั้ง ${success} กลุ่ม`)
  }
}

export async function pushMessageTo(to: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("⚠️ LINE_CHANNEL_ACCESS_TOKEN ยังไม่ได้ตั้งค่า")
    return
  }
  await pushMessage(to, text)
}
```

> **การทำงาน:**
> 1. `getGroupIds()` ดึงจาก DB (ตาราง `line_group` ที่ `active = true`) ก่อน
> 2. ถ้า DB ยังไม่มี → fallback ไปอ่านจาก ENV (`LINE_GROUP_IDS` / `LINE_GROUP_ID`)
> 3. `pushMessageToGroup()` ส่งไปทุกกลุ่มพร้อมกัน กลุ่มใดล้มเหลวไม่กระทบกลุ่มอื่น
> 4. ไม่ต้องเพิ่ม Group ID ใน ENV ด้วยมือ — แค่เชิญ Bot เข้ากลุ่ม ระบบจะบันทึกให้อัตโนมัติ (ดูข้อ 3.4.1)

#### 4.4.1 Auto-register Group ID เมื่อ Bot เข้ากลุ่ม

**ปัญหาเดิม:** ต้อง `console.log` ดู Group ID แล้วมาใส่ใน ENV ด้วยมือ — ใช้ได้ตอน dev แต่ไม่เหมาะกับ production

**แนวทางใหม่:** เมื่อ Bot ถูกเชิญเข้ากลุ่ม LINE จะส่ง **`join` event** มาที่ Webhook → เราดัก event นี้แล้วบันทึก Group ID ลง Database อัตโนมัติ

```
เชิญ Bot เข้ากลุ่ม → LINE ส่ง join event → Webhook ดัก → บันทึกลง DB → line-push.ts ดึงจาก DB
```

แก้ไข `app/api/line/webhook/route.ts` — เพิ่ม import Prisma และ helper functions:

```typescript
import { prisma } from "@/lib/prisma"

// ดึงชื่อกลุ่มจาก LINE API
async function getGroupName(groupId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/summary`,
      { headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` } }
    )
    if (res.ok) {
      const data = await res.json()
      return data.groupName || null
    }
    return null
  } catch {
    return null
  }
}

// บันทึก Group ID ลง Database เมื่อ Bot ถูกเชิญเข้ากลุ่ม
async function registerGroup(groupId: string) {
  const groupName = await getGroupName(groupId)
  await prisma.lineGroup.upsert({
    where: { groupId },
    update: { active: true, groupName },
    create: { groupId, groupName, active: true },
  })
  console.log(`✅ บันทึกกลุ่ม LINE: ${groupName || groupId}`)
}

// ปิดการแจ้งเตือนกลุ่มเมื่อ Bot ถูกเตะออก
async function unregisterGroup(groupId: string) {
  await prisma.lineGroup.update({
    where: { groupId },
    data: { active: false },
  }).catch(() => {}) // ถ้ายังไม่มี record ก็ข้ามไป
  console.log(`🚫 Bot ออกจากกลุ่ม: ${groupId}`)
}
```

แก้ไข event loop ใน `POST()` — เพิ่มการจัดการ `join` / `leave` event:

```typescript
    for (const event of data.events) {

      // ===== Event: Bot เข้ากลุ่ม → บันทึก Group ID อัตโนมัติ =====
      if (event.type === "join" && event.source?.groupId) {
        await registerGroup(event.source.groupId)
        await replyMessage(
          event.replyToken,
          "สวัสดีครับ! 🤖 ผมพร้อมตอบคำถามแล้ว\n\nพิมพ์ @bot ตามด้วยคำถาม เช่น:\n@bot สินค้ามีอะไรบ้าง"
        )
        continue
      }

      // ===== Event: Bot ถูกเตะออก → ปิดการแจ้งเตือน =====
      if (event.type === "leave" && event.source?.groupId) {
        await unregisterGroup(event.source.groupId)
        continue
      }

      // ===== Event: ข้อความ =====
      if (event.type === "message" && event.message.type === "text") {
        // ...

        // Auto-register: ถ้ามีข้อความจากกลุ่มที่ยังไม่ได้บันทึก → บันทึกเลย
        if (isGroup && event.source.groupId) {
          registerGroup(event.source.groupId).catch(() => {})
        }
        // ... keyword triggers + RAG response เหมือนเดิม ...
      }
    }
```

**การทำงาน:**

| Event | การจัดการ |
|-------|----------|
| `join` | Bot ถูกเชิญเข้ากลุ่ม → `registerGroup()` บันทึกลง DB + ส่งข้อความต้อนรับ |
| `leave` | Bot ถูกเตะออก → `unregisterGroup()` ตั้ง `active = false` |
| `message` (group) | Auto-register ถ้ากลุ่มนี้ยังไม่ได้บันทึก (กรณี Bot อยู่ในกลุ่มก่อนระบบ auto-register จะถูกเพิ่ม) |

> **ข้อดี:**
> - ✅ ไม่ต้องดู console.log หา Group ID อีกต่อไป
> - ✅ ใช้งานได้ทั้ง dev และ production
> - ✅ ดึงชื่อกลุ่มจาก LINE API มาแสดงด้วย
> - ✅ Bot ถูกเตะออก → หยุดส่งแจ้งเตือนอัตโนมัติ (ไม่ลบ record เพื่อเก็บประวัติ)
> - ✅ มี API จัดการกลุ่ม (`/api/line/groups`) สำหรับ Admin ดู/เปิด/ปิดกลุ่มได้

#### 4.4.2 LINE Groups Management API

สร้าง API สำหรับ Admin จัดการกลุ่ม LINE:

**`app/api/line/groups/route.ts`** — ดึงรายการ + เพิ่มด้วยมือ:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ดึงรายการกลุ่ม LINE ทั้งหมด
export async function GET() {
  const groups = await prisma.lineGroup.findMany({
    orderBy: { joinedAt: "desc" },
  })
  return NextResponse.json(groups)
}

// เพิ่มกลุ่มด้วยมือ (กรณี migrate จาก ENV เดิม)
export async function POST(request: NextRequest) {
  const { groupId, groupName } = await request.json()
  const group = await prisma.lineGroup.upsert({
    where: { groupId },
    update: { active: true, groupName: groupName || undefined },
    create: { groupId, groupName: groupName || null, active: true },
  })
  return NextResponse.json(group)
}
```

**`app/api/line/groups/[id]/route.ts`** — เปิด/ปิดการแจ้งเตือน + ลบ:

```typescript
// PATCH — เปิด/ปิดการแจ้งเตือน
export async function PATCH(request, { params }) {
  const { id } = await params
  const { active } = await request.json()
  const group = await prisma.lineGroup.update({
    where: { id },
    data: { active },
  })
  return NextResponse.json(group)
}

// DELETE — ลบกลุ่ม
export async function DELETE(_request, { params }) {
  const { id } = await params
  await prisma.lineGroup.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

> **สรุป API Endpoints สำหรับ LINE Groups:**
> | Method | Endpoint | หน้าที่ |
> |--------|----------|--------|
> | `GET` | `/api/line/groups` | ดูกลุ่มทั้งหมด |
> | `POST` | `/api/line/groups` | เพิ่มกลุ่มด้วยมือ |
> | `PATCH` | `/api/line/groups/:id` | เปิด/ปิดการแจ้งเตือน |
> | `DELETE` | `/api/line/groups/:id` | ลบกลุ่มออก |


#### 4.5 สร้าง Lead Capture API

สร้างไฟล์ `app/api/leads/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { pushMessageToGroup } from "@/lib/line-push"

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, company, interest } = await request.json()

    // Validate
    if (!name || !email) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อและอีเมล" },
        { status: 400 }
      )
    }

    // 1. บันทึก Lead ลง PostgreSQL ผ่าน Prisma
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        interest: interest || null,
        source: "website",
      },
    })

    // 2. ส่งแจ้งเตือนเข้ากลุ่ม LINE ผ่าน LINE Messaging API
    await pushMessageToGroup(
      `🔔 Lead ใหม่จากเว็บไซต์!\n` +
      `👤 ชื่อ: ${name}\n` +
      `📧 อีเมล: ${email}\n` +
      `📱 โทร: ${phone || "-"}\n` +
      `🏢 บริษัท: ${company || "-"}\n` +
      `💡 สนใจ: ${interest || "-"}\n` +
      `🕐 เวลา: ${new Date().toLocaleString("th-TH")}`
    )

    // 3. ส่ง Lead ไปยัง n8n Webhook (ถ้าตั้งค่าไว้)
    // const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    // if (n8nWebhookUrl) {
    //   await fetch(n8nWebhookUrl, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       ...lead,
    //       timestamp: lead.createdAt.toISOString(),
    //     }),
    //   })
    // }

    return NextResponse.json({
      message: "ขอบคุณสำหรับความสนใจ! ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง",
      success: true,
    })
  } catch (error: any) {
    console.error("Lead API Error:", error)
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    )
  }
}

// ดึงรายการ Lead ทั้งหมด (สำหรับ Admin)
export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(leads)
  } catch (error: any) {
    console.error("Lead GET Error:", error)
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด" },
      { status: 500 }
    )
  }
}
```

#### 4.6 สร้าง Lead Form Component

สร้างไฟล์ `app/(landing)/LeadForm.tsx`:

```tsx
"use client"

import { useState } from "react"

export default function LeadForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    interest: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(data.message)
        setFormData({ name: "", email: "", phone: "", company: "", interest: "" })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message || "เกิดข้อผิดพลาด")
    }
  }

  return (
    <section id="lead" className="py-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">สนใจบริการของเรา?</h2>
            <p className="mb-12 text-muted-foreground">กรุณากรอกข้อมูลด้านล่างเพื่อให้เราติดต่อกลับ</p>
    
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4 p-6 bg-white rounded-xl shadow-lg">

        <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ *</label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ชื่อ-นามสกุล"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล *</label>
            <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@company.com"
            />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
            <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="08x-xxx-xxxx"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">บริษัท</label>
            <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ชื่อบริษัท"
            />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สนใจบริการ</label>
            <select
            value={formData.interest}
            onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
            <option value="">เลือกบริการที่สนใจ</option>
            <option value="ai-chatbot">AI Chatbot สำหรับองค์กร</option>
            <option value="web-development">พัฒนาเว็บไซต์</option>
            <option value="consulting">ที่ปรึกษา IT</option>
            <option value="training">อบรมบุคลากร</option>
            </select>
        </div>

        {status === "success" && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{message}</div>
        )}
        {status === "error" && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">{message}</div>
        )}

        <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
        >
            {status === "loading" ? "กำลังส่ง..." : "ส่งข้อมูล"}
        </button>
        </form>
        </div>

    </section>
  )
}
```

#### 4.7 เพิ่ม LeadForm ในหน้า Landing Page
แก้ไขไฟล์ `app/(landing)/page.tsx`:

```tsx
import LeadForm from "@/app/(landing)/LeadForm"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <TechStack />
      <Team />
      <Testimonial />
      <LeadForm />
      <Footer />
      <ChatButton />
    </div>
  )
}
```

#### 4.8 แก้ไข Navbar ให้มีลิงก์ไปยัง Lead Form
แก้ไขไฟล์ `app/(landing)/Navbar.tsx`:

```tsx
const navLinks = [
    { href: "/#home", label: "หน้าแรก" },
    { href: "/#features", label: "ฟีเจอร์" },
    { href: "/#about", label: "เกี่ยวกับเรา" },
    { href: "/#team", label: "ทีมงาน" },
    { href: "/#testimonial", label: "รีวิว" },
    { href: "/#lead", label: "สนใจบริการ" },
]
```

#### 4.9 ทดสอบระบบ Lead Capture
1. รันแอปพลิเคชันด้วย `npm run dev`
2. เปิดหน้า http://localhost:3000
3. เลื่อนลงไปที่ฟอร์ม "สนใจบริการของเรา?" และกรอกข้อมูลทดสอบ
4. ตรวจสอบผลลัพธ์:
   - ข้อมูล Lead ถูกบันทึกลง PostgreSQL ผ่าน Prisma
   - มีข้อความแจ้งเตือนเข้ากลุ่ม LINE ผ่าน LINE Messaging API
   - ข้อมูล Lead ถูกส่งไปยัง n8n Webhook (ถ้าตั้งค่าไว้)

#### 4.10 สร้าง Lead Status API (PATCH)

สร้าง Dynamic Route สำหรับอัปเดตสถานะ Lead — ไฟล์ `app/api/leads/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// อัปเดตสถานะ Lead (PATCH /api/leads/:id)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    // Validate status
    const validStatuses = ["new", "contacted", "qualified", "converted"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `สถานะไม่ถูกต้อง — ต้องเป็น: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(lead)
  } catch (error: any) {
    console.error("Lead PATCH Error:", error)
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "ไม่พบ Lead นี้" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    )
  }
}

// ดึงข้อมูล Lead รายตัว (GET /api/leads/:id)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lead = await prisma.lead.findUnique({ where: { id } })

    if (!lead) {
      return NextResponse.json(
        { error: "ไม่พบ Lead นี้" },
        { status: 404 }
      )
    }

    return NextResponse.json(lead)
  } catch (error: any) {
    console.error("Lead GET Error:", error)
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด" },
      { status: 500 }
    )
  }
}
```

> **API Endpoints ทั้งหมดสำหรับ Lead:**
> | Method | Endpoint | หน้าที่ |
> |--------|----------|--------|
> | `POST` | `/api/leads` | สร้าง Lead ใหม่ + ส่งแจ้งเตือน LINE |
> | `GET` | `/api/leads` | ดึง Lead ทั้งหมด (Admin) |
> | `GET` | `/api/leads/:id` | ดึง Lead รายตัว |
> | `PATCH` | `/api/leads/:id` | อัปเดตสถานะ Lead |

#### 4.11 สร้างหน้า Lead Management

สร้าง Page Route — ไฟล์ `app/(main)/management/lead/page.tsx`:

```tsx
import { Metadata } from "next"
import LeadContent from "@/app/(main)/management/lead/LeadContent"

export const metadata: Metadata = {
    title: "Leads",
    description: "จัดการ Lead ที่เข้ามาจากเว็บไซต์และช่องทางต่าง ๆ",
    keywords: ["Leads", "ลีด", "AI Native App", "Lead Management"],
}

export default function LeadPage() {
  return <LeadContent />
}
```

สร้าง Client Component — ไฟล์ `app/(main)/management/lead/LeadContent.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  Search, Users, UserPlus, UserCheck, Star,
  Mail, Phone, Building2, Sparkles, Clock,
  ChevronDown, RefreshCw, Eye, X,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  interest: string | null
  source: string
  status: string
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dotColor: string }> = {
  new:       { label: "ใหม่",          color: "text-blue-700 dark:text-blue-300",    bg: "bg-blue-50 dark:bg-blue-900/30",    dotColor: "bg-blue-500" },
  contacted: { label: "ติดต่อแล้ว",    color: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-50 dark:bg-yellow-900/30", dotColor: "bg-yellow-500" },
  qualified: { label: "มีศักยภาพ",    color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30", dotColor: "bg-emerald-500" },
  converted: { label: "เป็นลูกค้าแล้ว", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-900/30", dotColor: "bg-purple-500" },
}

export default function LeadContent() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Fetch leads จาก API
  const fetchLeads = async () => {
    setLoading(true)
    const res = await fetch("/api/leads")
    if (res.ok) setLeads(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchLeads() }, [])

  // อัปเดตสถานะ Lead ผ่าน PATCH API
  const updateStatus = async (leadId: string, newStatus: string) => {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      )
    }
  }

  // Filter & Search
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-muted-foreground mt-1">
            จัดการ Lead ที่เข้ามาจากเว็บไซต์และช่องทางต่าง ๆ
          </p>
        </div>
        <button onClick={fetchLeads} className="...">
          <RefreshCw className="h-4 w-4" /> รีเฟรช
        </button>
      </div>

      {/* Stats Cards — Lead ทั้งหมด, ใหม่, ติดต่อแล้ว, เป็นลูกค้าแล้ว */}
      {/* Search + Filter Buttons (ทั้งหมด / ใหม่ / ติดต่อแล้ว / มีศักยภาพ / เป็นลูกค้าแล้ว) */}
      {/* Table — ชื่อ/อีเมล, บริษัท, สนใจ, สถานะ (dropdown), เวลา, ปุ่มดู */}
      {/* Modal — รายละเอียด Lead + เปลี่ยนสถานะ + ปุ่มส่งอีเมล */}
    </div>
  )
}
```

> **หมายเหตุ:** โค้ดด้านบนเป็น **โครงสร้างหลัก** ของ component — ดูโค้ดเต็มได้ที่ไฟล์ `app/(main)/management/lead/LeadContent.tsx`

**ฟีเจอร์ของหน้า Lead Management:**
| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| **Stats Overview** | แสดงจำนวน Lead แยกตามสถานะ (ใหม่ / ติดต่อแล้ว / มีศักยภาพ / เป็นลูกค้าแล้ว) |
| **ค้นหา** | ค้นหาด้วยชื่อ, อีเมล, บริษัท, เบอร์โทร |
| **กรองสถานะ** | กรอง Lead ตามสถานะ |
| **เปลี่ยนสถานะ** | เปลี่ยนสถานะได้ตรงจากตารางผ่าน dropdown (เรียก PATCH API) |
| **Modal รายละเอียด** | กดปุ่ม "ดู" เห็นข้อมูลครบ + ปุ่มส่งอีเมล |
| **Dark Mode** | รองรับ Dark Mode |

#### 4.12 เพิ่มเมนู Leads ใน Sidebar

แก้ไขไฟล์ `app/(main)/_components/sidebar/sidebar-data.ts` — เพิ่ม `UserCheck` icon และเมนู Leads ใต้ Teams:

```typescript
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    MessageCircle,
    HelpCircle,
    UserCheck,       // เพิ่ม icon สำหรับ Leads
    type LucideIcon,
} from "lucide-react"

// ... interface เดิม ...

export const sidebarData: NavSectionType[] = [
    // ... Dashboard, AI & Data ...
    {
        title: "Management",
        items: [
            { title: "Projects", href: "/management/projects", icon: FileText },
            { title: "Teams", href: "/management/teams", icon: Users },
            { title: "Leads", href: "/management/lead", icon: UserCheck },  // เพิ่ม
        ],
        allowedRoles: ["admin", "manager"],
    },
    // ... Admin ...
]
```

> **หมายเหตุ:** เมนู Leads จะแสดงเฉพาะผู้ใช้ที่มี role เป็น `admin` หรือ `manager` เท่านั้น (`allowedRoles`)

#### 4.13 ทดสอบหน้า Lead Management

1. รันแอปพลิเคชัน `npm run dev`
2. เข้าสู่ระบบด้วย Admin หรือ Manager
3. ไปที่เมนู **Management → Leads**
4. ทดสอบ:
   - ดู Lead ที่เข้ามาจากฟอร์ม Landing Page
   - ค้นหา Lead ด้วยชื่อ/อีเมล/บริษัท
   - กรอง Lead ตามสถานะ
   - เปลี่ยนสถานะ Lead (ใหม่ → ติดต่อแล้ว → มีศักยภาพ → เป็นลูกค้าแล้ว)
   - กด "ดู" เพื่อดูรายละเอียดและส่งอีเมลติดต่อ

#### 4.14 สร้างหน้า Admin จัดการกลุ่ม LINE

สร้าง Page Route — ไฟล์ `app/(main)/admin/line-groups/page.tsx`:

```tsx
import LineGroupsContent from "@/app/(main)/admin/line-groups/LineGroupsContent"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "LINE Groups",
    description: "จัดการกลุ่ม LINE ที่ Bot เข้าร่วม — เปิด/ปิดการแจ้งเตือน",
}

export default async function LineGroupsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect("/dashboard")
    }

    // ตรวจสอบว่าเป็น Admin เท่านั้นที่เข้าถึงได้
    const userRoles = (session.user.role ?? "user").split(",").map((r: string) => r.trim())
    if (!userRoles.includes("admin")) {
        redirect("/dashboard")
    }

    return <LineGroupsContent />
}
```

สร้าง Client Component — ไฟล์ `app/(main)/admin/line-groups/LineGroupsContent.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  Users, MessageCircle, RefreshCw, Power, PowerOff,
  Plus, X, CheckCircle, XCircle, Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface LineGroup {
  id: string
  groupId: string
  groupName: string | null
  active: boolean
  joinedAt: string
  updatedAt: string
}

export default function LineGroupsContent() {
  const [groups, setGroups] = useState<LineGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Fetch groups จาก API
  const fetchGroups = async () => {
    const res = await fetch("/api/line/groups")
    if (res.ok) setGroups(await res.json())
  }

  // Toggle active (เปิด/ปิดแจ้งเตือน)
  const toggleActive = async (group: LineGroup) => {
    const res = await fetch(`/api/line/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !group.active }),
    })
    if (res.ok) {
      setGroups((prev) =>
        prev.map((g) => g.id === group.id ? { ...g, active: !g.active } : g)
      )
    }
  }

  // เพิ่มกลุ่มด้วยมือ
  const addGroup = async (groupId: string, groupName: string | null) => {
    const res = await fetch("/api/line/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, groupName }),
    })
    if (res.ok) fetchGroups()
  }

  // Stats
  const activeCount = groups.filter((g) => g.active).length
  const inactiveCount = groups.filter((g) => !g.active).length

  return (
    <div className="space-y-6">
      {/* Stats Cards: กลุ่มทั้งหมด / เปิดแจ้งเตือน / ปิดแจ้งเตือน */}
      {/* Group Cards: ชื่อกลุ่ม, Group ID, สถานะ, วันที่เข้าร่วม, ปุ่มเปิด/ปิดแจ้งเตือน */}
      {/* Info Box: วิธีเพิ่มกลุ่มอัตโนมัติ */}
      {/* Add Group Modal: เพิ่ม Group ID ด้วยมือ */}
    </div>
  )
}
```

> **หมายเหตุ:** โค้ดด้านบนเป็น **โครงสร้างหลัก** ของ component — ดูโค้ดเต็มได้ที่ไฟล์ `app/(main)/admin/line-groups/LineGroupsContent.tsx`

**ฟีเจอร์ของหน้า LINE Groups Management:**
| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| **Stats Overview** | แสดงจำนวนกลุ่มทั้งหมด / เปิดแจ้งเตือน / ปิดแจ้งเตือน |
| **Group Cards** | แสดงชื่อกลุ่ม, Group ID, สถานะ (เปิด/ปิด), วันที่เข้าร่วม |
| **Toggle แจ้งเตือน** | เปิด/ปิดการส่ง Push Message ไปยังกลุ่มนั้น |
| **เพิ่มกลุ่มด้วยมือ** | กรอก Group ID + ชื่อกลุ่ม (สำหรับ migrate จาก ENV เดิม) |
| **Info Box** | คำแนะนำวิธีเพิ่มกลุ่มอัตโนมัติ (เชิญ Bot เข้ากลุ่ม) |
| **Dark Mode** | รองรับ Dark Mode |

> **Design Decision:** ไม่มีปุ่มลบกลุ่ม — ใช้ Soft Deactivate แทน (ปิดแจ้งเตือน) เพื่อเก็บประวัติว่า Bot เคยอยู่กลุ่มไหนบ้าง ถ้า Bot ถูกเตะออกจากกลุ่ม ระบบจะตั้ง `active = false` อัตโนมัติ

#### 4.15 เพิ่มเมนู LINE Groups ใน Sidebar

แก้ไขไฟล์ `app/(main)/_components/sidebar/sidebar-data.ts` — เพิ่ม `MessagesSquare` icon และเมนู LINE Groups ใต้ Knowledge ในหมวด Admin:

```typescript
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    MessageCircle,
    MessagesSquare,   // เพิ่ม icon สำหรับ LINE Groups
    HelpCircle,
    UserCheck,
    type LucideIcon,
} from "lucide-react"

// ... interface เดิม ...

export const sidebarData: NavSectionType[] = [
    // ... Dashboard, AI & Data, Management ...
    {
        title: "Admin",
        items: [
            { title: "Users", href: "/admin/users", icon: Users },
            { title: "Knowledge", href: "/admin/knowledge", icon: FileText },
            { title: "LINE Groups", href: "/admin/line-groups", icon: MessagesSquare },
            { title: "Settings", href: "/admin/settings", icon: Settings },
        ],
        allowedRoles: ["admin"],
    },
]
```

> **หมายเหตุ:** เมนู LINE Groups จะแสดงเฉพาะผู้ใช้ที่มี role เป็น `admin` เท่านั้น (`allowedRoles: ["admin"]`)

#### 4.16 ทดสอบหน้า LINE Groups Management

1. รันแอปพลิเคชัน `npm run dev`
2. เข้าสู่ระบบด้วย Admin
3. ไปที่เมนู **Admin → LINE Groups**
4. ทดสอบ:
   - ดูรายการกลุ่ม LINE ที่ Bot เข้าร่วม (บันทึกอัตโนมัติเมื่อเชิญ Bot เข้ากลุ่ม)
   - ปิดแจ้งเตือนกลุ่มที่ไม่ต้องการรับ Lead notification
   - เปิดแจ้งเตือนกลับ
   - เพิ่มกลุ่มด้วยมือ (กรอก Group ID + ชื่อกลุ่ม)
   - ตรวจสอบว่า Stats อัปเดตตามสถานะกลุ่ม


### สรุป Day 8: ระบบ Lead Capture + LINE Groups Management

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ระบบ Lead Capture** | สร้าง API สำหรับรับข้อมูล Lead จากฟอร์มบนเว็บไซต์ → บันทึกลง PostgreSQL ผ่าน Prisma → ส่งแจ้งเตือนเข้ากลุ่ม LINE ผ่าน LINE Messaging API → ส่งข้อมูลไปยัง n8n Webhook (ถ้าตั้งค่าไว้) |
| **หน้า Lead Management** | สร้างหน้าใน Dashboard สำหรับดูและจัดการ Lead ทั้งหมด — ค้นหา, กรอง, เปลี่ยนสถานะ, ดูรายละเอียด |
| **ระบบจัดการกลุ่ม LINE** | Bot จะบันทึก Group ID อัตโนมัติเมื่อถูกเชิญเข้ากลุ่ม → สร้าง API และหน้าใน Dashboard สำหรับดูและจัดการกลุ่ม LINE ที่ Bot เข้าร่วม — เปิด/ปิดการแจ้งเตือน, เพิ่มกลุ่มด้วยมือ |
| **การออกแบบ API** | ใช้ RESTful API สำหรับ Lead และ LINE Groups — มีการจัดการข้อผิดพลาดและการตรวจสอบสิทธิ์อย่างเหมาะสม |
| **การออกแบบ UI** | ใช้ Tailwind CSS และ Lucide Icons ออกแบบหน้า Lead Management และ LINE Groups Management ให้ใช้งานง่ายและสวยงาม รองรับ Dark Mode |
| **การทดสอบ** | ทดสอบระบบ Lead Capture โดยกรอกฟอร์มบนหน้า Landing Page → ตรวจสอบข้อมูลใน Dashboard และกลุ่ม LINE → ทดสอบการจัดการ Lead และกลุ่ม LINE ในหน้า Admin |

**ไฟล์สำคัญที่สร้างในวันนี้:**
| ไฟล์ | รายละเอียด |
|------|------------|
| `app/api/leads/route.ts` | API สำหรับสร้าง Lead ใหม่และดึง Lead ทั้งหมด |
| `app/api/leads/[id]/route.ts` | API สำหรับอัปเดตสถานะ Lead และดึง Lead รายตัว |
| `app/api/line/groups/route.ts` | API สำหรับดูและเพิ่มกลุ่ม LINE |
| `app/api/line/groups/[id]/route.ts` | API สำหรับเปิด/ปิดการแจ้งเตือนและลบกลุ่ม LINE |
| `app/(landing)/LeadForm.tsx` | Component ฟอร์มสำหรับกรอกข้อมูล Lead บนหน้า Landing Page |
| `app/(main)/management/lead/page.tsx` | หน้า Lead Management ใน Dashboard |
| `app/(main)/management/lead/LeadContent.tsx` | Component สำหรับแสดงและจัดการ Lead ในหน้า Lead Management |
| `app/(main)/admin/line-groups/page.tsx` | หน้า LINE Groups Management ใน Admin Dashboard |
| `app/(main)/admin/line-groups/LineGroupsContent.tsx` | Component สำหรับแสดงและจัดการกลุ่ม LINE ในหน้า LINE Groups Management |
| `app/(main)/_components/sidebar/sidebar-data.ts` | เพิ่มเมนู Leads และ LINE Groups ใน Sidebar |
