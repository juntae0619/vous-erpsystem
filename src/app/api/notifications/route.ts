import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/notifications?unreadOnly=true&limit=20
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 50);

  const userId = session!.user.id;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return ok({ notifications, unreadCount });
}

// PUT /api/notifications  (모두 읽음 처리)
export async function PUT(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const userId = session!.user.id;

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  return ok({ ok: true });
}
