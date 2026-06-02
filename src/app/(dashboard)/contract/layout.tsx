import { auth } from "@/lib/auth";
import { ContractNav } from "@/components/contract/ContractNav";

export default async function ContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 px-6 pt-3">
        <ContractNav isManager={isManager} />
      </div>
      <div className="flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  );
}
