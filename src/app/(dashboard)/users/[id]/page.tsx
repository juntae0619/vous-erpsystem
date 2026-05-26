import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { UserForm } from "@/components/users/UserForm";
import { format } from "date-fns";

export const metadata = { title: "사용자 수정" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true,
      team: true, position: true, phone: true, joinedAt: true,
    },
  });
  if (!user) notFound();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="사용자 수정" subtitle={user.name} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <UserForm
            mode="edit"
            userId={user.id}
            defaultValues={{
              name:     user.name,
              email:    user.email,
              role:     user.role,
              team:     user.team ?? "",
              position: user.position ?? "",
              phone:    user.phone ?? "",
              joinedAt: format(user.joinedAt, "yyyy-MM-dd"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
