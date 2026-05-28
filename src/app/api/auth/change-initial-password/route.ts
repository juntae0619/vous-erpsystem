import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAuth } from "@/lib/api";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const schema = z.object({
  newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
});

// POST /api/auth/change-initial-password — 최초 로그인 비밀번호 변경
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("비밀번호는 8자 이상이어야 합니다");

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: session!.user.id },
    data: {
      password: hashed,
      mustChangePassword: false,
    },
  });

  return ok({ message: "비밀번호가 변경되었습니다" });
}
