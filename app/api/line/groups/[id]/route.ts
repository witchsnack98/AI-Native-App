import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// PATCH — เปิด/ปิดการแจ้งเตือน
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { active } = await request.json();
  const group = await prisma.lineGroup.update({
    where: { id },
    data: { active },
  });
  return NextResponse.json(group);
}

// DELETE — ลบกลุ่ม
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.lineGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
