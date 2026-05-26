import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export const metadata = { title: "감사 로그" };

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-green-50 text-green-600",
  UPDATE: "bg-blue-50 text-blue-600",
  DELETE: "bg-red-50 text-red-500",
  APPROVED: "bg-[#edf6fd] text-[#7b68ee]",
  REJECTED: "bg-red-50 text-red-500",
  LOGIN: "bg-[#e9ebf0] text-[#292d34]",
};

function getActionColor(action: string) {
  for (const key of Object.keys(ACTION_COLOR)) {
    if (action.includes(key)) return ACTION_COLOR[key];
  }
  return "bg-[#e9ebf0] text-[#b3b3b3]";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; resource?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const resource = sp.resource ?? undefined;
  const limit = 50;

  const where = resource ? { resource } : {};

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, team: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // 리소스 종류 목록
  const resources = await prisma.auditLog.findMany({
    distinct: ["resource"],
    select: { resource: true },
    orderBy: { resource: "asc" },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="감사 로그" subtitle={`총 ${total.toLocaleString()}건`} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/admin/audit"
              className={`text-[12px] px-3 py-1.5 rounded-lg transition-colors ${
                !resource
                  ? "bg-primary text-primary-foreground"
                  : "bg-[#e9ebf0] text-[#292d34] hover:bg-[#d9dce3]"
              }`}
            >
              전체
            </a>
            {resources.map((r) => (
              <a
                key={r.resource}
                href={`/admin/audit?resource=${r.resource}`}
                className={`text-[12px] px-3 py-1.5 rounded-lg transition-colors ${
                  resource === r.resource
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#e9ebf0] text-[#292d34] hover:bg-[#d9dce3]"
                }`}
              >
                {r.resource}
              </a>
            ))}
          </div>

          {/* 로그 목록 */}
          <Card className="shadow-card border-[#e8e8e8] rounded-xl overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[13px] text-[#b3b3b3]">감사 로그가 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {/* 헤더 */}
                <div className="grid grid-cols-[1fr_1fr_1fr_2fr_140px] gap-4 px-4 py-2.5 bg-[#f8f9fb]">
                  {["시간", "사용자", "액션", "상세", "리소스"].map((h) => (
                    <p key={h} className="text-[11px] font-medium text-[#b3b3b3] uppercase tracking-wide">{h}</p>
                  ))}
                </div>

                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[1fr_1fr_1fr_2fr_140px] gap-4 px-4 py-3 hover:bg-[#fafafa] transition-colors"
                  >
                    <p className="text-[12px] text-[#292d34]">
                      {format(log.createdAt, "MM.dd HH:mm:ss", { locale: ko })}
                    </p>
                    <div>
                      <p className="text-[12px] font-medium text-[#292d34]">{log.user.name}</p>
                      <p className="text-[11px] text-[#b3b3b3]">{log.user.team}</p>
                    </div>
                    <div>
                      <Badge
                        className={`text-[11px] px-2 py-0.5 rounded-full border-0 font-medium ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      {log.details && (
                        <p className="text-[11px] text-[#b3b3b3] truncate">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                      {log.resourceId && (
                        <p className="text-[11px] text-[#d0d0d0]">ID: {log.resourceId}</p>
                      )}
                    </div>
                    <p className="text-[12px] text-[#b3b3b3]">{log.resource}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/admin/audit?page=${p}${resource ? `&resource=${resource}` : ""}`}
                  className={`w-8 h-8 flex items-center justify-center text-[12px] rounded-lg transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "bg-[#e9ebf0] text-[#292d34] hover:bg-[#d9dce3]"
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
