import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { ApprovalDocumentForm } from "@/components/approval/ApprovalDocumentForm";

export const metadata = { title: "문서 작성" };

export default async function NewApprovalPage() {
  const session = await auth();
  if (!session?.user) return null;

  // 결재자 가능한 사용자 (MANAGER, ADMIN)
  const approvers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["ADMIN", "MANAGER"] },
    },
    select: { id: true, name: true, position: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="문서 작성" showBack />
      <div className="flex-1 overflow-y-auto p-6">
        <ApprovalDocumentForm approvers={approvers} />
      </div>
    </div>
  );
}
