import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notify";
import { z } from "zod/v4";

// GET /api/approval/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const doc = await prisma.approvalDocument.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, team: true, position: true } },
      steps: {
        include: { approver: { select: { id: true, name: true, position: true } } },
        orderBy: { stepOrder: "asc" },
      },
      attachments: true,
    },
  });
  if (!doc) return fail("존재하지 않는 문서입니다", 404);

  const userId = session!.user.id;
  const role = session!.user.role;

  // 접근 권한: 작성자, 결재자, 관리자
  const isApprover = doc.steps.some((s) => s.approverId === userId);
  if (doc.submitterId !== userId && !isApprover && role !== "ADMIN" && role !== "MANAGER") {
    return fail("접근 권한이 없습니다", 403);
  }

  return ok(doc);
}

const updateSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  content: z.string().min(5).optional(),
  expenseAmount: z.number().optional().nullable(),
  expenseItems: z.string().optional().nullable(),
  submit: z.boolean().optional(), // true = 임시저장 → 제출
  approvalLine: z
    .array(
      z.object({
        role: z.enum(["MANAGER", "DIRECTOR", "CEO"]),
        approverId: z.string().optional(),
      })
    )
    .min(1)
    .optional(),
});

// PUT /api/approval/[id] — 임시저장 수정 또는 제출
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const doc = await prisma.approvalDocument.findUnique({ where: { id } });
  if (!doc) return fail("존재하지 않는 문서입니다", 404);
  if (doc.submitterId !== session!.user.id) return fail("수정 권한이 없습니다", 403);
  if (doc.status !== "DRAFT") return fail("임시저장 상태의 문서만 수정할 수 있습니다", 409);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  const data = parsed.data;

  if (data.submit && (!data.approvalLine || data.approvalLine.length === 0)) {
    return fail("제출 시 결재선을 설정해주세요", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.approvalDocument.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.expenseAmount !== undefined && { expenseAmount: data.expenseAmount }),
        ...(data.expenseItems !== undefined && { expenseItems: data.expenseItems }),
        ...(data.submit && { status: "SUBMITTED" }),
      },
    });

    if (data.submit && data.approvalLine) {
      await tx.approvalStep.createMany({
        data: data.approvalLine.map((line, index) => ({
          documentId: id,
          stepRole: line.role,
          approverId: line.approverId ?? null,
          stepOrder: index + 1,
          status: "PENDING",
        })),
      });
    }

    return doc;
  });

  if (data.submit) {
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ["MANAGER", "ADMIN"] },
        id: { not: session!.user.id },
      },
      select: { id: true },
    });
    await createNotifications(
      managers.map((m) => ({
        userId: m.id,
        type: "APPROVAL_SUBMITTED" as const,
        title: `결재 요청: ${updated.title}`,
        message: "새 결재 문서가 제출되었습니다.",
        link: `/approval/${updated.id}`,
      }))
    );
  }

  return ok(updated);
}

// DELETE /api/approval/[id] — 임시저장 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const doc = await prisma.approvalDocument.findUnique({ where: { id } });
  if (!doc) return fail("존재하지 않는 문서입니다", 404);
  if (doc.submitterId !== session!.user.id) return fail("삭제 권한이 없습니다", 403);
  if (doc.status !== "DRAFT") return fail("임시저장 상태의 문서만 삭제할 수 있습니다", 409);

  await prisma.approvalDocument.delete({ where: { id } });
  return ok({ message: "삭제되었습니다" });
}
