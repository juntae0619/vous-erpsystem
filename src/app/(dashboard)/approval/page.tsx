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

  const include = {
    submitter: { select: { id: true, name: true, team: true, position: true } },
    steps: {
      include: { approver: { select: { id: true, name: true, position: true } } },
      orderBy: { stepOrder: "asc" as const },
    },
    _count: { select: { attachments: true } },
  };

  const outboxWhere: Record<string, unknown> = { submitterId: userId };
  if (statusFilter !== "ALL") outboxWhere.status = statusFilter;

  const inboxWhere: Record<string, unknown> = {
    status: { in: ["SUBMITTED", "IN_REVIEW"] },
    steps: { some: { approverId: userId, status: "PENDING" } },
  };

  const receivedWhere: Record<string, unknown> = {
    steps: { some: { approverId: userId } },
    status: { in: ["APPROVED", "REJECTED"] },
  };
  if (statusFilter !== "ALL") receivedWhere.status = statusFilter;

  const [outboxDocs, inboxDocs, receivedDocs] = await Promise.all([
    prisma.approvalDocument.findMany({ where: outboxWhere, include, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.approvalDocument.findMany({ where: inboxWhere, include, orderBy: { createdAt: "desc" } }),
    prisma.approvalDocument.findMany({ where: receivedWhere, include, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const currentDocs = tab === "outbox" ? outboxDocs : tab === "inbox" ? inboxDocs : receivedDocs;

  // 요약 통계
  const totalOutbox   = outboxDocs.length;
  const totalPending  = inboxDocs.length;
  const totalApproved = outboxDocs.filter(d => d.status === "APPROVED").length;
  const totalRejected = outboxDocs.filter(d => d.status === "REJECTED").length;
  const totalInReview = outboxDocs.filter(d => ["SUBMITTED","IN_REVIEW"].includes(d.status)).length;
  const totalReceived = receivedDocs.length;

  const metrics = [
    { label: "상신 건수",    value: String(totalOutbox),   highlight: false },
    { label: "결재 대기",    value: String(totalPending),  highlight: totalPending > 0 },
    { label: "진행 중",      value: String(totalInReview), highlight: false },
    { label: "승인 완료",    value: String(totalApproved), highlight: false },
    { label: "반려",         value: String(totalRejected), highlight: totalRejected > 0 },
    { label: "수신 문서",    value: String(totalReceived), highlight: false },
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "outbox",   label: "상신함" },
    { key: "inbox",    label: "결재함", count: totalPending },
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* 요약 통계 */}
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
            {metrics.map((m) => (
              <Card
                key={m.label}
                className={cn(
                  "px-4 py-3",
                  m.highlight && "bg-orange-50 border-orange-200"
                )}
              >
                <p className="mb-1 text-caption text-smoke-gray">{m.label}</p>
                <p className={cn(
                  "text-2xl font-bold tracking-tight",
                  m.highlight ? "text-rich-plum" : "text-midnight-charcoal"
                )}>
                  {m.value}
                </p>
              </Card>
            ))}
          </div>

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

          {/* 문서 목록 */}
          {currentDocs.length === 0 ? (
            <Card className="py-16 text-center">
              <FileText size={32} className="mx-auto mb-3 text-ash-gray" />
              <p className="text-body-sm text-smoke-gray mb-4">해당 상태의 문서가 없습니다</p>
              {tab === "outbox" && (
                <Link href="/approval/new" className={cn(buttonVariants({ variant: "outline" }))}>
                  문서 작성하기
                </Link>
              )}
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="bg-[#2c3e6b] text-white">
                    <th className="px-4 py-3 text-center font-semibold whitespace-nowrap w-12">연번</th>
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">종류</th>
                    <th className="px-4 py-3 text-left font-semibold">제목</th>
                    {tab === "inbox" && (
                      <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">상신자</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">결재선</th>
                    <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">상태</th>
                    <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">작성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentDocs.map((doc, idx) => {
                    const serializedSteps = doc.steps.map((s) => ({
                      ...s,
                      decidedAt: s.decidedAt?.toISOString() ?? null,
                      createdAt: s.createdAt.toISOString(),
                    }));
                    return (
                      <tr key={doc.id} className="hover:bg-hint-of-sky transition-colors cursor-pointer">
                        <td className="px-4 py-3 text-center text-smoke-gray">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-caption text-smoke-gray bg-hint-of-sky px-2 py-0.5 rounded-full border border-border">
                            {DOC_TYPE_MAP[doc.type] ?? doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/approval/${doc.id}`} className="text-deep-violet hover:underline font-medium">
                            {doc.title}
                          </Link>
                          {doc.isFinalDecision && (
                            <span className="ml-2 text-caption text-deep-violet bg-blue-50 px-1.5 py-0.5 rounded-full">전결</span>
                          )}
                        </td>
                        {tab === "inbox" && (
                          <td className="px-4 py-3 whitespace-nowrap text-smoke-gray">
                            {doc.submitter?.name}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <ApprovalLine steps={serializedSteps} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ApprovalStatusBadge status={doc.status as import("@/components/approval/ApprovalStatusBadge").ApprovalStatus} />
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap text-smoke-gray">
                          {format(doc.createdAt, "yyyy.MM.dd", { locale: ko })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
