import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const createSchema = z.object({
  region: z.string().min(1, "지역을 입력해주세요"),
  city: z.string().min(1, "시/군을 입력해주세요"),
  cardName: z.string().optional().nullable(),
  allowedItems: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  jobDuty: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  cardBinNo: z.string().optional().nullable(),
});

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

// POST /api/local-gov-contacts
export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }

  const data = parsed.data;
  const contact = await prisma.localGovContact.create({
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

  return ok(contact, 201);
}
