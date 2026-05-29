import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ContractPageActions } from "@/components/contract/ContractPageActions";
import { FileText, Search } from "lucide-react";
import { formatKRW, cn } from "@/lib/utils";

export const metadata = { title: "계약·수금 관리" };

type ContractRow = {
  id: string;
  region: string | null;
  localGovName: string;
  contractNumber: string;
  contractName: string;
  serviceAmount: number;
  billed: number;
  paid: number;
  unpaid: number;
  unbilled: number;
};

export default async function ContractPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; unpaid?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { q, unpaid } = await searchParams;
  const search = q?.trim() ?? "";
  const onlyUnpaid = unpaid === "1";

  const isManager = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { localGovName: { contains: search, mode: "insensitive" } },
      { contractName: { contains: search, mode: "insensitive" } },
      { contractNumber: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
    ];
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      billings: { select: { totalAmount: true, paidAmount: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let rows: ContractRow[] = contracts.map((c) => {
    const serviceAmount = Number(c.serviceAmount);
    const billed = c.billings.reduce((s, b) => s + Number(b.totalAmount), 0);
    const paid = c.billings.reduce((s, b) => s + Number(b.paidAmount), 0);
    return {
      id: c.id,
      region: c.region,
      localGovName: c.localGovName,
      contractNumber: c.contractNumber,
      contractName: c.contractName,
      serviceAmount,
      billed,
      paid,
      unpaid: billed - paid,
      unbilled: serviceAmount - billed,
    };
  });

  if (onlyUnpaid) rows = rows.filter((r) => r.unpaid > 0);

  const totalContracts = rows.length;
  const totalService = rows.reduce((s, r) => s + r.serviceAmount, 0);
  const totalBilled = rows.reduce((s, r) => s + r.billed, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalUnpaid = totalBilled - totalPaid;
  const totalUnbilled = rows.reduce((s, r) => s + r.unbilled, 0);

  const now = new Date();
  const managerActions = isManager ? (
    <ContractPageActions
      exportHref={`/api/export/billing?year=${now.getFullYear()}&month=${now.getMonth() + 1}`}
    />
  ) : undefined;

  const metrics = [
    { label: "계약 건수",    value: String(totalContracts),    highlight: false },
    { label: "계약금 총액",  value: formatKRW(totalService),   highlight: false },
    { label: "청구액 총액",  value: formatKRW(totalBilled),    highlight: false },
    { label: "입금액 총액",  value: formatKRW(totalPaid),      highlight: false },
    { label: "미수액 총액",  value: formatKRW(totalUnpaid),    highlight: totalUnpaid > 0 },
    { label: "미청구액 총액",value: formatKRW(totalUnbilled),  highlight: false },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약·수금 관리" actions={managerActions} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-5">

          {/* 대시보드 타이틀 */}
          <h2 className="font-heading text-xl font-bold text-midnight-charcoal">대시보드</h2>

          {/* 검색 + 필터 */}
          <form method="get" className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-smoke-gray" />
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="기관명·계약명·지역·계약번호 검색"
                className="h-9 w-full rounded-lg border border-border pl-9 pr-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <label className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-body-sm font-medium transition-colors",
              onlyUnpaid
                ? "border-deep-violet bg-deep-violet text-white"
                : "border-border bg-white text-midnight-charcoal hover:border-deep-violet hover:text-deep-violet"
            )}>
              <input
                type="checkbox"
                name="unpaid"
                value="1"
                defaultChecked={onlyUnpaid}
                className="h-4 w-4 accent-deep-violet"
              />
              미수 있는 건만
            </label>
            <button type="submit" className={cn(buttonVariants(), "h-9")}>
              검색
            </button>
          </form>

          {/* 요약 지표 (2행 × 3열) */}
          <div className="grid grid-cols-3 gap-4">
            {metrics.map((m) => (
              <Card
                key={m.label}
                className={cn(
                  "px-5 py-4",
                  m.highlight && "bg-orange-50 border-orange-200"
                )}
              >
                <p className="mb-1.5 text-caption text-smoke-gray">{m.label}</p>
                <p className={cn(
                  "text-2xl font-bold tracking-tight",
                  m.highlight ? "text-rich-plum" : "text-midnight-charcoal"
                )}>
                  {m.value}
                </p>
              </Card>
            ))}
          </div>

          {/* 계약 목록 */}
          <div>
            <h2 className="mb-3 font-heading text-section-title">계약 목록</h2>

            {rows.length === 0 ? (
              <Card className="py-8 text-center">
                <FileText size={32} className="mx-auto mb-3 text-ash-gray" />
                <p className="text-body-sm text-smoke-gray">
                  {search || onlyUnpaid ? "조건에 맞는 계약이 없습니다" : "등록된 계약이 없습니다"}
                </p>
                {isManager && !search && !onlyUnpaid && (
                  <Link href="/contract/new" className={cn(buttonVariants({ variant: "outline" }), "mt-3")}>
                    계약 등록하기
                  </Link>
                )}
              </Card>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="bg-[#2c3e6b] text-white">
                      <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">연번</th>
                      <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">지역</th>
                      <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">기관명</th>
                      <th className="px-4 py-3 text-left font-semibold">계약명</th>
                      <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">계약금액</th>
                      <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">청구액</th>
                      <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">입금액</th>
                      <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">미수액</th>
                      <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">미청구액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-hint-of-sky transition-colors">
                        <td className="px-4 py-3 text-center text-smoke-gray">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-smoke-gray">{r.region ?? "-"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link href={`/contract/${r.id}`} className="text-deep-violet hover:underline font-medium">
                            {r.localGovName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <span className="line-clamp-2 leading-snug" title={r.contractName}>{r.contractName}</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatKRW(r.serviceAmount)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatKRW(r.billed)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatKRW(r.paid)}</td>
                        <td className={cn("px-4 py-3 text-right whitespace-nowrap", r.unpaid > 0 ? "text-rich-plum font-semibold" : "")}>
                          {formatKRW(r.unpaid)}
                        </td>
                        <td className={cn("px-4 py-3 text-right whitespace-nowrap", r.unbilled > 0 ? "text-smoke-gray" : "")}>
                          {formatKRW(r.unbilled)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
