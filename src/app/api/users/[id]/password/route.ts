import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAdmin } from "@/lib/api";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const schema = z.object({ newPassword: z.string().min(8) });

// PUT /api/users/[id]/password — 관리자가 비밀번호 초기화
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("비밀번호는 8자 이상이어야 합니다");

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id }, data: { password: hashed } });
  return ok({ message: "비밀번호가 초기화되었습니다" });
}
