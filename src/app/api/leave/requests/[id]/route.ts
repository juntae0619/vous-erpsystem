import { ok, fail, requireAuth, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { writeAuditLog } from "@/lib/audit";
import { calculateAnnualLeaveDays } from "@/lib/leave";
import { LEAVE_TYPE_LABELS } from "@/lib/leave-types";
import { z } from "zod/v4";

// GET /api/leave/requests/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, team: true, position: true } },
      approver: { select: { id: true, name: true } },
    },
  });
  if (!request) return fail("존재하지 않는 신청입니다", 404);

  const role = session!.user.role;
  if (
    request.userId !== session!.user.id &&
    role !== "ADMIN" &&
    role !== "MANAGER"
  ) {
    return fail("권한이 없습니다", 403);
  }

  return ok(request);
}

const approveSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

// PUT /api/leave/requests/[id] — 승인·반려 (매니저+)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireManager();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }
  const { action, rejectionReason } = parsed.data;

  if (action === "REJECTED" && !rejectionReason?.trim()) {
    return fail("반려 사유를 입력해주세요", 400);
  }

  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) return fail("존재하지 않는 신청입니다", 404);
  if (request.status !== "PENDING") return fail("이미 처리된 신청입니다", 409);

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: action,
        approverId: session!.user.id,
        approvedAt: new Date(),
        rejectionReason: action === "REJECTED" ? rejectionReason : null,
      },
    });

    if (action === "APPROVED" && (request.type === "ANNUAL" || request.type === "HALF_DAY")) {
      const year = request.startDate.getFullYear();
      const user = await tx.user.findUnique({
        where: { id: request.userId },
        select: { joinedAt: true },
      });
      const totalDays = user
        ? calculateAnnualLeaveDays(user.joinedAt, year)
        : 0;

      await tx.leaveBalance.upsert({
        where: { userId_year: { userId: request.userId, year } },
        update: {
          usedDays: { increment: Number(request.days) },
          ...(request.type === "HALF_DAY" ? { usedHalfDays: { increment: 1 } } : {}),
        },
        create: {
          userId: request.userId,
          year,
          totalDays,
          usedDays: Number(request.days),
          usedHalfDays: request.type === "HALF_DAY" ? 1 : 0,
        },
      });
    }

    return updated;
  });

  // 감사 로그
  await writeAuditLog({
    userId: session!.user.id,
    action: `LEAVE_${action}`,
    resource: "LeaveRequest",
    resourceId: id,
    details: { type: request.type, days: Number(request.days), rejectionReason: rejectionReason ?? null },
  });

  // 알림 전송 (트랜잭션 외부 — 실패해도 OK)
  const typeLabel = LEAVE_TYPE_LABELS[request.type as keyof typeof LEAVE_TYPE_LABELS] ?? "휴가";
  await createNotification({
    userId: request.userId,
    type: action === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    title: action === "APPROVED" ? `${typeLabel} 승인됨` : `${typeLabel} 반려됨`,
    message:
      action === "APPROVED"
        ? `신청하신 ${typeLabel}(${Number(request.days)}일)이 승인되었습니다.`
        : `신청하신 ${typeLabel}이 반려되었습니다. 사유: ${rejectionReason}`,
    link: "/leave",
  });

  return ok(updated);
}

// DELETE /api/leave/requests/[id] — 취소 (본인의 PENDING 신청만)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) return fail("존재하지 않는 신청입니다", 404);
  if (request.userId !== session!.user.id) return fail("권한이 없습니다", 403);
  if (request.status !== "PENDING") return fail("대기 중인 신청만 취소할 수 있습니다", 409);

  await prisma.leaveRequest.delete({ where: { id } });
  return ok({ message: "취소되었습니다" });
}
