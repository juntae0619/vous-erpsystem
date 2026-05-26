import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { ApprovalStatusBadge } from "@/components/approval/ApprovalStatusBadge";
import { ApprovalLine } from "@/components/approval/ApprovalLine";
import { ApprovalActionPanel } from "@/components/approval/ApprovalActionPanel";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatKRW } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.approvalDocument.findUnique({ where: { id }, select: { title: true } });
  return { title: doc?.title ?? "결재 문서" };
}

const DOC_TYPE_MAP: Record<string, string> = {
  GENERAL: "일반결재", EXPENSE: "지출결의서", CONTRACT: "계약결재", REPORT: "업무보고",
};

export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const doc = await prisma.approvalDocument.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, team: true, position: true } },
      finalDecider: { select: { id: true, name: true } },
      steps: {
        include: { approver: { select: { id: true, name: true, position: true } } },
        orderBy: { stepOrder: "asc" },
      },
      attachments: true,
    },
  });
  if (!doc) notFound();

  const userId = session.user.id;
  const role = session.user.role;

  // 접근 권한 확인
  const isSubmitter = doc.submitterId === userId;
  const isApprover = doc.steps.some((s) => s.approverId === userId);
  if (!isSubmitter && !isApprover && role !== "ADMIN" && role !== "MANAGER") {
    notFound();
  }

  // 현재 내가 처리해야 할 스텝인지 확인
  const myCurrentStep = doc.steps.find(
    (s) => s.status === "PENDING" && s.approverId === userId
  );
  const canApprove = !!myCurrentStep && (doc.status === "SUBMITTED" || doc.status === "IN_REVIEW");

  // 직렬화
  const serializedSteps = doc.steps.map((s) => ({
    ...s,
    decidedAt: s.decidedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={doc.title} showBack />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* 문서 헤더 */}
          <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[#b3b3b3] bg-[#f8f9fb] px-2 py-0.5 rounded-full">
                  {DOC_TYPE_MAP[doc.type] ?? doc.type}
                </span>
                <ApprovalStatusBadge status={doc.status as import("@/components/approval/ApprovalStatusBadge").ApprovalStatus} />
                {doc.isFinalDecision && (
                  <span className="text-[11px] text-[#7b68ee] bg-[#edf6fd] px-2 py-0.5 rounded-full">전결</span>
                )}
              </div>
              <p className="text-[11px] text-[#b3b3b3] shrink-0">
                {format(doc.createdAt, "yyyy.MM.dd HH:mm", { locale: ko })}
              </p>
            </div>

            <h2
              className="text-[18px] font-bold text-[#090c1d] mb-4 tracking-[-0.3px]"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              {doc.title}
            </h2>

            {/* 작성자 */}
            <div className="flex items-center gap-2.5 p-3 bg-[#f8f9fb] rounded-xl mb-4">
              <div className="w-8 h-8 rounded-full bg-[#e9ebf0] flex items-center justify-center text-[13px] font-semibold text-[#292d34]">
                {doc.submitter.name[0]}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#292d34]">{doc.submitter.name}</p>
                <p className="text-[11px] text-[#b3b3b3]">
                  {doc.submitter.position} · {doc.submitter.team}
                </p>
              </div>
            </div>

            {/* 내용 */}
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-[13px] text-[#292d34] font-sans leading-relaxed">
                {doc.content}
              </pre>
            </div>

            {/* 지출 정보 */}
            {doc.expenseAmount && (
              <div className="mt-4 p-3 bg-[#f8f9fb] rounded-xl">
                <p className="text-[11px] text-[#b3b3b3] mb-1">지출 금액</p>
                <p className="text-[15px] font-bold text-[#090c1d]">
                  {formatKRW(Number(doc.expenseAmount))}
                </p>
                {doc.expenseItems && (
                  <pre className="mt-2 text-[12px] text-[#292d34] whitespace-pre-wrap font-sans">
                    {doc.expenseItems}
                  </pre>
                )}
              </div>
            )}
          </Card>

          {/* 결재선 */}
          <Card className="p-5 shadow-card border-[#e8e8e8] rounded-xl">
            <h3
              className="text-[13px] font-semibold text-[#090c1d] mb-4"
              style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
            >
              결재선
            </h3>
            <ApprovalLine steps={serializedSteps} />

            {/* 각 스텝 상세 */}
            <div className="mt-4 space-y-2">
              {doc.steps.map((step) => (
                step.comment && (
                  <div key={step.id} className="p-3 bg-[#f8f9fb] rounded-xl">
                    <p className="text-[11px] text-[#b3b3b3]">
                      {step.approver?.name} 의견
                    </p>
                    <p className="text-[13px] text-[#292d34] mt-0.5">{step.comment}</p>
                  </div>
                )
              ))}
            </div>
          </Card>

          {/* 결재 처리 패널 */}
          <ApprovalActionPanel
            documentId={doc.id}
            canApprove={canApprove}
            currentUserRole={role}
            isCurrentStep={!!myCurrentStep}
          />
        </div>
      </div>
    </div>
  );
}
