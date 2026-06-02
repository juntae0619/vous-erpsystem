import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { ContractNav } from "@/components/contract/ContractNav";
import { formatKRW, cn } from "@/lib/utils";
import { format } from "date-fns";

export const metadata = { title: "청구현황" };

type SortKey = "voucher" | "month" | "region" | "period";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "voucher", label: "바우처구분별" },
  { key: "month", label: "청구월별" },
  { key: "region", label: "지역별" },
  { key: "period", label: "청구기간별" },
];

function groupLabel(sort: SortKey, row: BillingRow): string {
  switch (sort) {
    case "voucher":
      return row.voucherName || row.voucherType || "(바우처 미지정)";
    case "month":
      return row.billMonth || "(청구월 미지정)";
    case "region":
      return row.region || "(지역 미지정)";
    case "period":
      return row.billPeriodRange || row.billPeriod || "(청구기간 미지정)";
  }
}

type BillingRow = {
  id: string;
  contractId: string;
  localGovName: string;
  region: string | null;
  voucherName: string | null;
  voucherType: string | null;
  billMonth: string | null;
  billPeriod: string | null;
  billPeriodRange: string | null;
  merchantSales: number;
  serviceAmount: number;
  merchantFeeAmt: number;
  totalAmount: number;
  paidAmount: number;
  unpaid: number;
  lastPaidAt: Date | null;
};

export default async function ContractBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { sort: sortParam } = await searchParams;
  const sort: SortKey =
    sortParam === "voucher" || sortParam === "region" || sortParam === "period"
      ? sortParam
      : "month";

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const billings = await prisma.billing.findMany({
    include: {
      contract: {
        select: {
          id: true,
          localGovName: true,
          region: true,
          voucherName: true,
          voucherType: true,
        },
      },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
    orderBy: [{ billMonth: "asc" }, { billingDate: "asc" }],
  });

  const rows: BillingRow[] = billings.map((b) => ({
    id: b.id,
    contractId: b.contract.id,
    localGovName: b.contract.localGovName,
    region: b.contract.region,
    voucherName: b.contract.voucherName,
    voucherType: b.contract.voucherType,
    billMonth: b.billMonth,
    billPeriod: b.billPeriod,
    billPeriodRange: b.billPeriodRange,
    merchantSales: Number(b.merchantSales),
    serviceAmount: Number(b.serviceAmount),
    merchantFeeAmt: Number(b.merchantFeeAmt),
    totalAmount: Number(b.totalAmount),
    paidAmount: Number(b.paidAmount),
    unpaid: Number(b.totalAmount) - Number(b.paidAmount),
    lastPaidAt: b.payments[0]?.paidAt ?? null,
  }));

  const grouped = new Map<string, BillingRow[]>();
  for (const row of rows) {
    const key = groupLabel(sort, row);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const sortedGroups = [...grouped.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "ko")
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약·수금 관리" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <ContractNav isManager={isManager} />

          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.key}
                href={`/contract/billing?sort=${opt.key}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-body-sm font-medium border transition-colors",
                  sort === opt.key
                    ? "border-deep-violet bg-deep-violet text-white"
                    : "border-border bg-white text-midnight-charcoal hover:border-deep-violet"
                )}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="text-center text-body-sm text-smoke-gray py-12">
              청구 내역이 없습니다
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="bg-[#2c3e6b] text-white">
                    <th className="px-3 py-2.5 text-left font-semibold">바우처구분</th>
                    <th className="px-3 py-2.5 text-left font-semibold">지역</th>
                    <th className="px-3 py-2.5 text-left font-semibold">산출기간</th>
                    <th className="px-3 py-2.5 text-right font-semibold">거래금액</th>
                    <th className="px-3 py-2.5 text-right font-semibold">수수료</th>
                    <th className="px-3 py-2.5 text-right font-semibold">부가세</th>
                    <th className="px-3 py-2.5 text-right font-semibold">청구금액</th>
                    <th className="px-3 py-2.5 text-right font-semibold">입금액</th>
                    <th className="px-3 py-2.5 text-right font-semibold">미입금액</th>
                    <th className="px-3 py-2.5 text-left font-semibold">입금일자</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.flatMap(([group, items]) => [
                    <tr key={`group-${group}`} className="bg-[#eef1f8]">
                      <td colSpan={10} className="px-3 py-2 font-semibold text-[#2c3e6b]">
                        {group}
                      </td>
                    </tr>,
                    ...items.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-border hover:bg-hint-of-sky"
                      >
                          <td className="px-3 py-2">
                            <Link
                              href={`/contract/${r.contractId}`}
                              className="text-deep-violet hover:underline"
                            >
                              {r.voucherName ?? r.voucherType ?? "-"}
                            </Link>
                          </td>
                          <td className="px-3 py-2">{r.localGovName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {r.billPeriodRange ?? r.billPeriod ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-right">{formatKRW(r.merchantSales)}</td>
                          <td className="px-3 py-2 text-right">{formatKRW(r.serviceAmount)}</td>
                          <td className="px-3 py-2 text-right">{formatKRW(r.merchantFeeAmt)}</td>
                          <td className="px-3 py-2 text-right">{formatKRW(r.totalAmount)}</td>
                          <td className="px-3 py-2 text-right">{formatKRW(r.paidAmount)}</td>
                          <td
                            className={cn(
                              "px-3 py-2 text-right",
                              r.unpaid > 0 && "text-rich-plum font-semibold"
                            )}
                          >
                            {formatKRW(r.unpaid)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {r.lastPaidAt ? format(r.lastPaidAt, "yyyy-MM-dd") : "-"}
                          </td>
                        </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
