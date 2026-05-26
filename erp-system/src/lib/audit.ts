/**
 * 감사 로그 기록 헬퍼
 * API 라우트에서 중요한 변경 작업 후 호출하세요.
 */
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@/generated/prisma/client";

interface AuditInput {
  userId: string;
  action: string;       // e.g. "LEAVE_APPROVED", "CONTRACT_CREATED"
  resource: string;     // e.g. "LeaveRequest", "Contract"
  resourceId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function writeAuditLog(input: AuditInput) {
  try {
    return await prisma.auditLog.create({ data: input });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
    return null;
  }
}
