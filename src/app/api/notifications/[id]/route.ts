import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// PUT /api/notifications/:id  (단건 읽음 처리)
export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const userId = session!.user.id;

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return fail("알림을 찾을 수 없습니다", 404);
  if (notif.userId !== userId) return fail("Forbidden", 403);

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return ok({ ok: true });
}
