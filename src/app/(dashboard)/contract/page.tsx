import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ContractPageActions } from "@/components/contract/ContractPageActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    orderBy: { createdAt: "desc" },
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

  // 6개 요약 지표
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
    { label: "계약 건수", value: `${totalContracts}건`, color: "text-midnight-charcoal" },
    { label: "계약금 총액", value: formatKRW(totalService), color: "text-midnight-charcoal" },
    { label: "청구액 총액", value: formatKRW(totalBilled), color: "text-midnight-charcoal" },
    { label: "입금액 총액", value: formatKRW(totalPaid), color: "text-deep-violet" },
    { label: "미수액 총액", value: formatKRW(totalUnpaid), color: totalUnpaid > 0 ? "text-rich-plum" : "text-smoke-gray" },
    { label: "미청구액 총액", value: formatKRW(totalUnbilled), color: totalUnbilled > 0 ? "text-rich-plum" : "text-smoke-gray" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약·수금 관리" actions={managerActions} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="section-stack mx-auto max-w-5xl">

          {/* 6개 요약 지표 */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {metrics.map((s) => (
              <Card key={s.label} className="text-center">
                <p className="mb-1 text-caption text-smoke-gray">{s.label}</p>
                <p className={`text-kpi text-[16px] ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>

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
            <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-9")}>
              검색
            </button>
          </form>

          {/* 계약 목록 (표) */}
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
              <Card className="p-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>계약번호</TableHead>
                      <TableHead>지역</TableHead>
                      <TableHead>기관명</TableHead>
                      <TableHead>계약명</TableHead>
                      <TableHead className="text-right">계약금액</TableHead>
                      <TableHead className="text-right">청구액</TableHead>
                      <TableHead className="text-right">입금액</TableHead>
                      <TableHead className="text-right">미수액</TableHead>
                      <TableHead className="text-right">미청구액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-[#f8f9fb]">
                        <TableCell className="whitespace-nowrap">
                          <Link href={`/contract/${r.id}`} className="text-deep-violet hover:underline">
                            {r.contractNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-smoke-gray">{r.region ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.localGovName}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={r.contractName}>{r.contractName}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatKRW(r.serviceAmount)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatKRW(r.billed)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap text-deep-violet">{formatKRW(r.paid)}</TableCell>
                        <TableCell className={cn("text-right whitespace-nowrap", r.unpaid > 0 ? "text-rich-plum font-medium" : "")}>{formatKRW(r.unpaid)}</TableCell>
                        <TableCell className={cn("text-right whitespace-nowrap", r.unbilled > 0 ? "text-rich-plum" : "")}>{formatKRW(r.unbilled)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
