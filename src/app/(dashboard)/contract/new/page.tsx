import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ContractForm } from "@/components/contract/ContractForm";

export const metadata = { title: "계약 등록" };

export default async function NewContractPage() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role === "USER") redirect("/contract");

  const assignees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, position: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약 등록" showBack />
      <div className="flex-1 overflow-y-auto p-6">
        <ContractForm assignees={assignees} />
      </div>
    </div>
  );
}
