import { ok, fail, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notify";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod/v4";

// GET /api/approval?status=&type=&page=&limit=&mine=true
export async function GET(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const mine = searchParams.get("mine") === "true";
  const pending = searchParams.get("pending") === "true"; // 내가 결재해야 할 문서
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const userId = session!.user.id;
  const role = session!.user.role;

  const where: Prisma.ApprovalDocumentWhereInput = {};

  if (mine) {
    // 내가 제출한 문서
    where.submitterId = userId;
  } else if (pending) {
    // 내가 결재해야 할 문서 (내가 할당된 PENDING 스텝이 있는 SUBMITTED 문서)
    where.steps = { some: { approverId: userId, status: "PENDING" } };
    where.status = "SUBMITTED";
  } else if (role !== "ADMIN" && role !== "MANAGER") {
    // 일반 사용자는 본인 문서만
    where.submitterId = userId;
  }

  if (status) where.status = status as Prisma.EnumApprovalStatusFilter;
  if (type) where.type = type as Prisma.EnumApprovalDocTypeFilter;

  const [total, documents] = await Promise.all([
    prisma.approvalDocument.count({ where }),
    prisma.approvalDocument.findMany({
      where,
      include: {
        submitter: { select: { id: true, name: true, team: true, position: true } },
        steps: {
          include: {
            approver: { select: { id: true, name: true } },
          },
          orderBy: { stepOrder: "asc" },
        },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ documents, total, page, limit });
}

const createSchema = z.object({
  type: z.enum(["GENERAL", "EXPENSE", "CONTRACT", "REPORT"]),
  title: z.string().min(2, "제목을 입력해주세요").max(100),
  content: z.string().min(5, "내용을 입력해주세요"),
  expenseAmount: z.number().optional(),
  expenseItems: z.string().optional(),
  // 결재선: [{ role: "MANAGER"|"DIRECTOR"|"CEO", approverId?: string }]
  approvalLine: z.array(
    z.object({
      role: z.enum(["MANAGER", "DIRECTOR", "CEO"]),
      approverId: z.string().optional(),
    })
  ).min(1, "결재선을 설정해주세요"),
  isDraft: z.boolean().default(false),
});

// POST /api/approval — 문서 제출 (또는 임시저장)
export async function POST(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다", 400);
  }
  const data = parsed.data;
  const userId = session!.user.id;

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.approvalDocument.create({
      data: {
        type: data.type,
        title: data.title,
        content: data.content,
        submitterId: userId,
        status: data.isDraft ? "DRAFT" : "SUBMITTED",
        expenseAmount: data.expenseAmount ?? null,
        expenseItems: data.expenseItems ?? null,
      },
    });

    // 결재선 생성
    if (!data.isDraft) {
      await tx.approvalStep.createMany({
        data: data.approvalLine.map((line, index) => ({
          documentId: doc.id,
          stepRole: line.role,
          approverId: line.approverId ?? null,
          stepOrder: index + 1,
          status: index === 0 ? "PENDING" : "PENDING",
        })),
      });
    }

    return doc;
  });

  // 결재 제출 시 매니저/관리자에게 알림
  if (!data.isDraft) {
    const managers = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "ADMIN"] }, id: { not: userId } },
      select: { id: true },
    });
    await createNotifications(
      managers.map((m) => ({
        userId: m.id,
        type: "APPROVAL_SUBMITTED" as const,
        title: `결재 요청: ${data.title}`,
        message: `새 결재 문서가 제출되었습니다.`,
        link: `/approval/${document.id}`,
      }))
    );
  }

  return ok(document, 201);
}
