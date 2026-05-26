import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { UserForm } from "@/components/users/UserForm";

export const metadata = { title: "새 계정 생성" };

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="새 계정 생성" subtitle="신규 직원 계정을 만들어주세요" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <UserForm mode="create" />
        </div>
      </div>
    </div>
  );
}
