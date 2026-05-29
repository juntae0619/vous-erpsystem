import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ApprovalStatusBadge } from "@/components/approval/ApprovalStatusBadge";
import { ApprovalLine } from "@/components/approval/ApprovalLine";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const metadata = { title: "전자결재" };

const DOC_TYPE_MAP: Record<string, string> = {
  GENERAL:  "일반결재",
  EXPENSE:  "지출결의서",
  CONTRACT: "계약결재",
  REPORT:   "업무보고",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     "임시저장",
  SUBMITTED: "결재중",
  IN_REVIEW: "검토중",
  APPROVED:  "승인",
  REJECTED:  "반려",
};

type Tab = "outbox" | "inbox" | "received";
type StatusFilter = "ALL" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;
  const sp = await searchParams;
  const tab = (sp.tab ?? "outbox") as Tab;
  const statusFilter = (sp.status ?? "ALL") as StatusFilter;

  // 상신함: 내가 제출한 문서
  const outboxWhere: Record<string, unknown> = { submitterId: userId };
  if (statusFilter !== "ALL") outboxWhere.status = statusFilter;

  // 결재함: 내가 결재해야 하는 문서
  const inboxWhere: Record<string, unknown> = {
    status: { in: ["SUBMITTED", "IN_REVIEW"] },
    steps: { some: { approverId: userId, status: "PENDING" } },
  };

  // 수신함: 결재 완료된 문서 중 내가 관련된 것
  const receivedWhere: Record<string, unknown> = {
    steps: { some: { approverId: userId } },
    status: { in: ["APPROVED", "REJECTED"] },
  };
  if (statusFilter !== "ALL") receivedWhere.status = statusFilter;

  const include = {
    submitter: { select: { id: true, name: true, team: true, position: true } },
    steps: {
      include: { approver: { select: { id: true, name: true, position: true } } },
      orderBy: { stepOrder: "asc" as const },
    },
    _count: { select: { attachments: true } },
  };

  const [outboxDocs, inboxDocs, receivedDocs, pendingCount] = await Promise.all([
    prisma.approvalDocument.findMany({ where: outboxWhere, include, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.approvalDocument.findMany({ where: inboxWhere, include, orderBy: { createdAt: "desc" } }),
    prisma.approvalDocument.findMany({ where: receivedWhere, include, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.approvalDocument.count({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] }, steps: { some: { approverId: userId, status: "PENDING" } } },
    }),
  ]);

  const currentDocs = tab === "outbox" ? outboxDocs : tab === "inbox" ? inboxDocs : receivedDocs;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "outbox", label: "상신함" },
    { key: "inbox",  label: "결재함", count: pendingCount },
    { key: "received", label: "수신함" },
  ];

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: "ALL",       label: "전체" },
    { key: "SUBMITTED", label: "결재중" },
    { key: "IN_REVIEW", label: "검토중" },
    { key: "APPROVED",  label: "승인" },
    { key: "REJECTED",  label: "반려" },
  ];

  const newDocBtn = (
    <Link href="/approval/new" className={cn(buttonVariants(), "gap-1.5")}>
      <Plus size={14} />
      문서 작성
    </Link>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="전자결재" actions={newDocBtn} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-5 space-y-4">

          {/* 탭 + 상태 필터 */}
          <div className="space-y-3">
            {/* 탭 */}
            <div className="flex items-center gap-1 border-b border-border">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={`/approval?tab=${t.key}`}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-body-sm font-medium transition-colors border-b-2 -mb-px",
                    tab === t.key
                      ? "border-deep-violet text-deep-violet"
                      : "border-transparent text-smoke-gray hover:text-midnight-charcoal"
                  )}
                >
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-deep-violet px-1 text-caption font-bold text-white">
                      {t.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* 상태 필터 (결재함 제외) */}
            {tab !== "inbox" && (
              <div className="flex flex-wrap gap-1.5">
                {statusFilters.map((f) => (
                  <Link
                    key={f.key}
                    href={`/approval?tab=${tab}&status=${f.key}`}
                    className={cn(
                      "rounded-full px-3 py-1 text-body-sm font-medium transition-colors border",
                      statusFilter === f.key
                        ? "bg-deep-violet text-white border-deep-violet"
                        : "bg-white text-smoke-gray border-border hover:border-deep-violet hover:text-deep-violet"
                    )}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 문서 목록 */}
          {currentDocs.length === 0 ? (
            <Card className="py-16 text-center">
              <FileText size={32} className="mx-auto mb-3 text-ash-gray" />
              <p className="text-body-sm text-smoke-gray mb-4">해당 상태의 문서가 없습니다</p>
              {tab === "outbox" && (
                <Link
                  href="/approval/new"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  문서 작성하기
                </Link>
              )}
            </Card>
          ) : (
            <div className="space-y-2">
              {currentDocs.map((doc) => {
                const serializedSteps = doc.steps.map((s) => ({
                  ...s,
                  decidedAt: s.decidedAt?.toISOString() ?? null,
                  createdAt: s.createdAt.toISOString(),
                }));
                return (
                  <Link key={doc.id} href={`/approval/${doc.id}`}>
                    <Card className="p-4 hover:bg-hint-of-sky transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-caption text-smoke-gray bg-hint-of-sky px-2 py-0.5 rounded-full border border-border">
                              {DOC_TYPE_MAP[doc.type] ?? doc.type}
                            </span>
                            <ApprovalStatusBadge status={doc.status as import("@/components/approval/ApprovalStatusBadge").ApprovalStatus} />
                            {doc.isFinalDecision && (
                              <span className="text-caption text-deep-violet bg-blue-50 px-2 py-0.5 rounded-full">전결</span>
                            )}
                          </div>
                          <h3 className="text-body-sm font-semibold text-midnight-charcoal truncate">{doc.title}</h3>
                          {tab === "inbox" && doc.submitter && (
                            <p className="text-caption text-smoke-gray mt-0.5">
                              {doc.submitter.name} · {doc.submitter.team}
                            </p>
                          )}
                          <p className="text-caption text-smoke-gray mt-1">
                            {format(doc.createdAt, "yyyy.MM.dd", { locale: ko })}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <ApprovalLine steps={serializedSteps} />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
