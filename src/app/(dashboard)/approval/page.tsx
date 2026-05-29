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

export default async function ApprovalPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  const [myDocs, pendingForMe] = await Promise.all([
    prisma.approvalDocument.findMany({
      where: { submitterId: userId },
      include: {
        submitter: { select: { id: true, name: true, team: true, position: true } },
        steps: {
          include: { approver: { select: { id: true, name: true, position: true } } },
          orderBy: { stepOrder: "asc" },
        },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.approvalDocument.findMany({
      where: {
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
        steps: { some: { approverId: userId, status: "PENDING" } },
      },
      include: {
        submitter: { select: { id: true, name: true, team: true, position: true } },
        steps: {
          include: { approver: { select: { id: true, name: true, position: true } } },
          orderBy: { stepOrder: "asc" },
        },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const newDocBtn = (
    <Link
      href="/approval/new"
      className={cn(buttonVariants(), "gap-1.5")}
    >
      <Plus size={14} />
      문서 작성
    </Link>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="전자결재" actions={newDocBtn} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {pendingForMe.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold text-[#090c1d] mb-3" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                결재 대기
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#7b68ee] text-white text-caption font-bold">
                  {pendingForMe.length}
                </span>
              </h2>
              <div className="space-y-2">
                {pendingForMe.map((doc) => (
                  <ApprovalDocCard key={doc.id} doc={doc} showSubmitter />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-[15px] font-semibold text-[#090c1d] mb-3" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
              내 문서
            </h2>
            {myDocs.length === 0 ? (
              <Card className="py-16 shadow-card border-[#e8e8e8] rounded-xl text-center">
                <FileText size={32} className="text-[#e8e8e8] mx-auto mb-3" />
                <p className="text-body-sm text-[#b3b3b3] mb-4">작성한 문서가 없습니다</p>
                <Link
                  href="/approval/new"
                  className={cn(buttonVariants({ variant: "outline" }), "text-body-sm border-[#e8e8e8] rounded-lg")}
                >
                  문서 작성하기
                </Link>
              </Card>
            ) : (
              <div className="space-y-2">
                {myDocs.map((doc) => (
                  <ApprovalDocCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

type DocWithSteps = Awaited<ReturnType<typeof prisma.approvalDocument.findMany<{
  include: {
    submitter: { select: { id: true; name: true; team: true; position: true } };
    steps: { include: { approver: { select: { id: true; name: true; position: true } } }; orderBy: { stepOrder: "asc" } };
    _count: { select: { attachments: true } };
  }
}>>>[number];

function ApprovalDocCard({ doc, showSubmitter = false }: { doc: DocWithSteps; showSubmitter?: boolean }) {
  const serializedSteps = doc.steps.map((s) => ({
    ...s,
    decidedAt: s.decidedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <Link href={`/approval/${doc.id}`}>
      <Card className="p-4 shadow-card border-[#e8e8e8] rounded-xl hover:shadow-hover transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-caption text-[#b3b3b3] bg-[#f8f9fb] px-2 py-0.5 rounded-full">
                {DOC_TYPE_MAP[doc.type] ?? doc.type}
              </span>
              <ApprovalStatusBadge status={doc.status as import("@/components/approval/ApprovalStatusBadge").ApprovalStatus} />
              {doc.isFinalDecision && (
                <span className="text-caption text-[#7b68ee] bg-[#edf6fd] px-2 py-0.5 rounded-full">전결</span>
              )}
            </div>
            <h3 className="text-body-sm font-semibold text-[#090c1d] truncate">{doc.title}</h3>
            {showSubmitter && doc.submitter && (
              <p className="text-caption text-[#b3b3b3] mt-0.5">
                {doc.submitter.name} · {doc.submitter.team}
              </p>
            )}
            <p className="text-caption text-[#b3b3b3] mt-1">
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
}
