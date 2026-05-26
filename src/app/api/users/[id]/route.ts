import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAdmin } from "@/lib/api";
import { z } from "zod/v4";

const updateUserSchema = z.object({
  name:      z.string().min(1).optional(),
  role:      z.enum(["ADMIN", "MANAGER", "USER"]).optional(),
  team:      z.string().optional(),
  position:  z.string().optional(),
  phone:     z.string().optional(),
  joinedAt:  z.string().optional(),
  isActive:  z.boolean().optional(),
});

// GET /api/users/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true,
      team: true, position: true, phone: true,
      joinedAt: true, isActive: true,
    },
  });
  if (!user) return fail("사용자를 찾을 수 없습니다", 404);
  return ok(user);
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return fail("입력 값이 올바르지 않습니다");

  const data = parsed.data;
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  return ok(user);
}
