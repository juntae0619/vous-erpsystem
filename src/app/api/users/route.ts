import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAdmin } from "@/lib/api";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const createUserSchema = z.object({
  name:      z.string().min(1),
  email:     z.string().email(),
  password:  z.string().min(8),
  role:      z.enum(["ADMIN", "MANAGER", "USER"]).default("USER"),
  team:      z.string().optional(),
  position:  z.string().optional(),
  phone:     z.string().optional(),
  joinedAt:  z.string().optional(),
});

// GET /api/users — 사용자 목록 (관리자)
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      team: true, position: true, phone: true,
      joinedAt: true, isActive: true, createdAt: true,
    },
    orderBy: [{ isActive: "desc" }, { joinedAt: "asc" }],
  });

  return ok(users);
}

// POST /api/users — 사용자 생성 (관리자)
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return fail("입력 값이 올바르지 않습니다");

  const { name, email, password, role, team, position, phone, joinedAt } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("이미 사용 중인 이메일입니다", 409);

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name, email, password: hashed, role, team, position, phone,
      joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return ok(user, 201);
}
