import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { roleLabel } from "@/lib/utils";
import { UserActionButtons } from "@/components/users/UserActionButtons";

export const metadata = { title: "사용자 관리" };

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      team: true, position: true, phone: true,
      joinedAt: true, isActive: true,
    },
    orderBy: [{ isActive: "desc" }, { joinedAt: "asc" }],
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="사용자 관리" subtitle={`총 ${users.length}명`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* 상단 버튼 */}
          <div className="flex justify-end">
            <Link href="/users/new">
              <Button className="gap-2">
                <UserPlus size={14} />
                새 계정 생성
              </Button>
            </Link>
          </div>

          {/* 사용자 카드 목록 */}
          <Card className="shadow-card border-[#e8e8e8] rounded-xl overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[1fr_1fr_100px_100px_120px_100px] gap-4 px-5 py-3 bg-[#e9ebf0] border-b border-[#e8e8e8]">
              {["이름/팀", "이메일", "권한", "직책", "입사일", "관리"].map((h) => (
                <p key={h} className="text-[11px] font-semibold text-[#b3b3b3] uppercase tracking-wide">
                  {h}
                </p>
              ))}
            </div>

            {/* 사용자 행 */}
            {users.map((user, idx) => (
              <div
                key={user.id}
                className={`grid grid-cols-[1fr_1fr_100px_100px_120px_100px] gap-4 items-center px-5 py-3.5 ${
                  idx !== users.length - 1 ? "border-b border-[#e8e8e8]" : ""
                } ${!user.isActive ? "opacity-50" : ""}`}
              >
                {/* 이름/팀 */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e9ebf0] flex items-center justify-center text-[13px] font-semibold text-[#292d34] shrink-0">
                    {user.name[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#090c1d]">{user.name}</p>
                    <p className="text-[11px] text-[#b3b3b3]">{user.team ?? "-"}</p>
                  </div>
                </div>

                {/* 이메일 */}
                <p className="text-[13px] text-[#292d34] truncate">{user.email}</p>

                {/* 권한 */}
                <Badge
                  className={`text-[11px] px-2 py-0.5 rounded-full border-0 font-medium w-fit ${
                    user.role === "ADMIN"
                      ? "bg-[#7b68ee]/10 text-[#7b68ee]"
                      : user.role === "MANAGER"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-[#e9ebf0] text-[#b3b3b3]"
                  }`}
                >
                  {roleLabel(user.role)}
                </Badge>

                {/* 직책 */}
                <p className="text-[13px] text-[#292d34]">{user.position ?? "-"}</p>

                {/* 입사일 */}
                <p className="text-[13px] text-[#b3b3b3]">
                  {format(user.joinedAt, "yyyy.MM.dd", { locale: ko })}
                </p>

                {/* 관리 버튼 */}
                <UserActionButtons userId={user.id} isActive={user.isActive} />
              </div>
            ))}

            {users.length === 0 && (
              <div className="py-12 text-center text-[14px] text-[#b3b3b3]">
                등록된 사용자가 없습니다
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
