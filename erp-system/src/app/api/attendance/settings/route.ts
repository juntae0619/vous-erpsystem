import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireAuth, requireAdmin } from "@/lib/api";
import { z } from "zod/v4";

const schema = z.object({
  checkInTime:  z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
});

// GET /api/attendance/settings
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const settings = await prisma.attendanceSettings.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { checkInTime: true, checkOutTime: true, updatedAt: true },
  });

  return ok(settings ?? { checkInTime: "09:00", checkOutTime: "18:00" });
}

// PUT /api/attendance/settings — 관리자 전용
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("HH:mm 형식으로 입력해주세요");

  const existing = await prisma.attendanceSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const settings = existing
    ? await prisma.attendanceSettings.update({
        where: { id: existing.id },
        data: { ...parsed.data, updatedById: session!.user.id },
      })
    : await prisma.attendanceSettings.create({
        data: { ...parsed.data, updatedById: session!.user.id },
      });

  return ok(settings);
}
