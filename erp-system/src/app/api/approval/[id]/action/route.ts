import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const actionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
  isFinalDecision: z.boolean().default(false), // 전결 여부
});

// POST /api/approval/[id]/action — 결재 처리 (승인/반려/전결)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }
  const { action, comment, isFinalDecision } = parsed.data;

  if (action === "REJECTED" && !comment?.trim()) {
    return fail("반려 사유를 입력해주세요", 400);
  }

  const userId = session!.user.id;

  const doc = await prisma.approvalDocument.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
    },
  });
  if (!doc) return fail("존재하지 않는 문서입니다", 404);
  if (doc.status !== "SUBMITTED" && doc.status !== "IN_REVIEW") {
    return fail("결재 처리할 수 없는 상태입니다", 409);
  }

  // 현재 처리해야 할 스텝 찾기 (PENDING 중 가장 낮은 stepOrder)
  const currentStep = doc.steps.find(
    (s) => s.status === "PENDING" && (s.approverId === userId || s.approverId === null)
  );
  if (!currentStep) {
    return fail("현재 결재할 차례가 아닙니다", 403);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 현재 스텝 처리
    await tx.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: action,
        approverId: userId,
        comment: comment ?? null,
        decidedAt: new Date(),
      },
    });

    if (action === "REJECTED") {
      // 반려: 문서 REJECTED 처리
      return await tx.approvalDocument.update({
        where: { id },
        data: { status: "REJECTED" },
      });
    }

    if (isFinalDecision) {
      // 전결: 이후 스텝 모두 SKIPPED 처리
      const remainingSteps = doc.steps.filter(
        (s) => s.stepOrder > currentStep.stepOrder && s.status === "PENDING"
      );
      if (remainingSteps.length > 0) {
        await tx.approvalStep.updateMany({
          where: {
            documentId: id,
            stepOrder: { gt: currentStep.stepOrder },
            status: "PENDING",
          },
          data: { status: "SKIPPED" },
        });
      }
      // 전결로 최종 승인
      return await tx.approvalDocument.update({
        where: { id },
        data: {
          status: "APPROVED",
          isFinalDecision: true,
          finalDeciderId: userId,
        },
      });
    }

    // 다음 스텝 확인
    const nextStep = doc.steps.find(
      (s) => s.stepOrder > currentStep.stepOrder && s.status === "PENDING"
    );

    if (!nextStep) {
      // 마지막 스텝 승인 → 최종 승인
      return await tx.approvalDocument.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    } else {
      // 다음 스텝으로 진행
      return await tx.approvalDocument.update({
        where: { id },
        data: { status: "IN_REVIEW" },
      });
    }
  });

  // 감사 로그
  await writeAuditLog({
    userId,
    action: `APPROVAL_${action}${isFinalDecision ? "_FINAL" : ""}`,
    resource: "ApprovalDocument",
    resourceId: id,
    details: { title: doc.title, comment: comment ?? null, isFinalDecision },
  });

  // 알림 전송 (트랜잭션 외부 — 실패해도 OK)
  const isFinalResult =
    result.status === "APPROVED" || result.status === "REJECTED";
  if (isFinalResult) {
    await createNotification({
      userId: doc.submitterId,
      type: result.status === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
      title:
        result.status === "APPROVED"
          ? `결재 승인: ${doc.title}`
          : `결재 반려: ${doc.title}`,
      message:
        result.status === "APPROVED"
          ? `문서 "${doc.title}"이(가) 최종 승인되었습니다.`
          : `문서 "${doc.title}"이(가) 반려되었습니다. 사유: ${comment}`,
      link: `/approval/${id}`,
    });
  }

  return ok(result);
}
