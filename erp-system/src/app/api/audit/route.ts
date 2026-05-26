import { ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/audit?page=1&limit=50&resource=&action=
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const resource = searchParams.get("resource") ?? undefined;
  const action = searchParams.get("action") ?? undefined;

  const where = {
    ...(resource ? { resource } : {}),
    ...(action ? { action: { contains: action } } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, team: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ logs, total, page, limit });
}
