import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ContractSettingsClient } from "@/components/contract/ContractSettingsClient";

export const metadata = { title: "계약·수금 설정" };

export default async function ContractSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";
  if (!isManager) redirect("/contract");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약·수금 관리" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <ContractSettingsClient />
        </div>
      </div>
    </div>
  );
}
