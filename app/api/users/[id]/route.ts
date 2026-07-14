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