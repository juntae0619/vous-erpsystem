/**
 * 알림 생성 헬퍼
 * API 라우트 내부(서버 사이드)에서만 호출하세요.
 */
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({ data: input });
  } catch (err) {
    // 알림 실패가 메인 트랜잭션을 막으면 안 됨 — 로그만 남김
    console.error("[notify] failed to create notification:", err);
    return null;
  }
}

/** 여러 사용자에게 동시에 알림 */
export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  try {
    return await prisma.notification.createMany({ data: inputs });
  } catch (err) {
    console.error("[notify] failed to create notifications:", err);
    return null;
  }
}
