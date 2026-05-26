import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAuth } from "@/lib/api";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8),
});

// PUT /api/profile/password — 본인 비밀번호 변경
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("입력 값이 올바르지 않습니다");

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { password: true },
  });
  if (!user) return fail("사용자를 찾을 수 없습니다", 404);

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!isValid) return fail("현재 비밀번호가 올바르지 않습니다");

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session!.user.id },
    data: { password: hashed },
  });
  return ok({ message: "비밀번호가 변경되었습니다" });
}
