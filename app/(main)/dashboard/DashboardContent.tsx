import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Bot, Database, Sparkles } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DashboardContent() {
  // TODO: ใช้ useSession() จาก Better Auth เมื่อเชื่อมต่อ DB แล้ว
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
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
  ];

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
  );
}
