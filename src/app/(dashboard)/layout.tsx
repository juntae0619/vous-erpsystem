import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, role: true, position: true, team: true },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-hint-of-sky">
      <Sidebar
        userRole={user?.role ?? session.user.role}
        userName={user?.name ?? session.user.name ?? ""}
        userPosition={user?.position ?? undefined}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
