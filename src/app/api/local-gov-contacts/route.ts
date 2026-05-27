import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/local-gov-contacts?search=&region=&page=&limit=
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const region = searchParams.get("region")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));

  const where: Record<string, unknown> = {};

  if (region) {
    where.region = { contains: region, mode: "insensitive" };
  }

  if (search) {
    where.OR = [
      { city: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
      { jobDuty: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { cardBinNo: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, contacts] = await Promise.all([
    prisma.localGovContact.count({ where }),
    prisma.localGovContact.findMany({
      where,
      orderBy: [{ region: "asc" }, { city: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // 지역 목록 (필터용)
  const regions = await prisma.localGovContact.findMany({
    select: { region: true },
    distinct: ["region"],
    orderBy: { region: "asc" },
  });

  return ok({
    contacts,
    total,
    page,
    limit,
    regions: regions.map((r) => r.region),
  });
}
