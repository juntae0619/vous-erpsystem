import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateSchema = z.object({
  region: z.string().min(1, "지역을 입력해주세요"),
  city: z.string().min(1, "시/군을 입력해주세요"),
  cardName: z.string().optional().nullable(),
  allowedItems: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  jobDuty: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || z.email().safeParse(v).success, "올바른 이메일을 입력해주세요"),
  cardBinNo: z.string().optional().nullable(),
});

type RouteParams = { params: Promise<{ id: string }> };

// PUT /api/local-gov-contacts/[id]
export async function PUT(req: Request, { params }: RouteParams) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.localGovContact.findUnique({ where: { id } });
  if (!existing) return fail("존재하지 않는 연락처입니다", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }

  const data = parsed.data;
  const updated = await prisma.localGovContact.update({
    where: { id },
    data: {
      region: data.region,
      city: data.city,
      cardName: data.cardName || null,
      allowedItems: data.allowedItems || null,
      department: data.department || null,
      contactName: data.contactName || null,
      jobDuty: data.jobDuty || null,
      phone: data.phone || null,
      email: data.email || null,
      cardBinNo: data.cardBinNo || null,
    },
  });

  return ok(updated);
}

// DELETE /api/local-gov-contacts/[id]
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.localGovContact.findUnique({ where: { id } });
  if (!existing) return fail("존재하지 않는 연락처입니다", 404);

  await prisma.localGovContact.delete({ where: { id } });
  return ok({ message: "삭제되었습니다" });
}
