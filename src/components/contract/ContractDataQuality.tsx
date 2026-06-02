"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

type QualityRow = {
  id: string;
  contractNumber: string;
  localGovName: string;
  contractName: string;
  serviceAmount?: number;
};

type QualityData = {
  totalContracts: number;
  zeroAmountCount: number;
  syntheticNumberCount: number;
  noBillingsCount: number;
  zeroAmount: QualityRow[];
  syntheticNumber: QualityRow[];
  noBillings: QualityRow[];
};

function IssueList({ items }: { items: QualityRow[] }) {
  return (
    <ul className="space-y-1.5 max-h-40 overflow-y-auto">
      {items.map((c) => (
        <li key={c.id} className="text-body-sm">
          <Link href={`/contract/${c.id}/edit`} className="text-deep-violet hover:underline">
            {c.localGovName}
          </Link>
          <span className="text-smoke-gray"> · {c.contractNumber}</span>
          {c.serviceAmount === 0 && (
            <span className="text-rich-plum ml-1">(0원)</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ContractDataQuality() {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contract/data-quality")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-smoke-gray" size={20} />
      </div>
    );
  }

  if (!data) return null;

  const hasIssues =
    data.zeroAmountCount > 0 ||
    data.syntheticNumberCount > 0 ||
    data.noBillingsCount > 0;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={18}
          className={hasIssues ? "text-rich-plum shrink-0 mt-0.5" : "text-green-600 shrink-0 mt-0.5"}
        />
        <div>
          <h2 className="font-heading text-section-title">데이터 품질 점검</h2>
          <p className="text-caption text-smoke-gray mt-1">
            전체 {data.totalContracts}건 · 금액 0원 {data.zeroAmountCount}건 ·
            합성번호 {data.syntheticNumberCount}건 · 청구 없음 {data.noBillingsCount}건
          </p>
        </div>
      </div>

      {data.zeroAmountCount > 0 && (
        <div>
          <h3 className="text-body-sm font-semibold mb-2">계약금액 0원</h3>
          <IssueList items={data.zeroAmount} />
        </div>
      )}

      {data.syntheticNumberCount > 0 && (
        <div>
          <h3 className="text-body-sm font-semibold mb-2">LEGACY-/IMPORT- 계약번호</h3>
          <IssueList items={data.syntheticNumber} />
        </div>
      )}

      {data.noBillingsCount > 0 && (
        <div>
          <h3 className="text-body-sm font-semibold mb-2">청구 내역 없음 (상위 50건)</h3>
          <IssueList items={data.noBillings} />
        </div>
      )}

      {!hasIssues && (
        <p className="text-body-sm text-green-700">점검 항목 이상 없음</p>
      )}
    </Card>
  );
}
