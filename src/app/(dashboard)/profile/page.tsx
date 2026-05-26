import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { roleLabel } from "@/lib/utils";
import { PasswordChangeForm } from "@/components/users/PasswordChangeForm";

export const metadata = { title: "내 프로필" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, email: true, role: true,
      team: true, position: true, phone: true, joinedAt: true,
    },
  });
  if (!user) return null;

  const fields = [
    { label: "이름",   value: user.name },
    { label: "이메일", value: user.email },
    { label: "권한",   value: roleLabel(user.role) },
    { label: "팀",     value: user.team ?? "-" },
    { label: "직책",   value: user.position ?? "-" },
    { label: "연락처", value: user.phone ?? "-" },
    { label: "입사일", value: format(user.joinedAt, "yyyy년 M월 d일", { locale: ko }) },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="내 프로필" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 프로필 카드 */}
          <Card className="p-6 shadow-card border-[#e8e8e8] rounded-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#e9ebf0] flex items-center justify-center text-[22px] font-bold text-[#292d34]">
                {user.name[0]}
              </div>
              <div>
                <h2
                  className="text-[20px] font-bold text-[#090c1d] tracking-[-0.5px]"
                  style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
                >
                  {user.name}
                </h2>
                <p className="text-[13px] text-[#b3b3b3]">{user.position} · {user.team}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] text-[#b3b3b3] mb-1">{label}</p>
                  <p className="text-[13px] font-medium text-[#292d34]">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 비밀번호 변경 */}
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
