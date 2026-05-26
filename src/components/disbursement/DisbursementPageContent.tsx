"use client";

import { Suspense, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisbursementFilters } from "@/components/disbursement/DisbursementFilters";
import { DisbursementForm } from "@/components/disbursement/DisbursementForm";
import {
  DisbursementList,
  type DisbursementItem,
} from "@/components/disbursement/DisbursementList";
import { formatKRW } from "@/lib/utils";

interface Assignee {
  id: string;
  name: string;
  position: string | null;
}

interface Props {
  items: DisbursementItem[];
  stats: {
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    unpaidCount: number;
  };
  assignees: Assignee[];
  isManager: boolean;
  currentUserId: string;
  filterDefaults: {
    assigneeId?: string;
    year: number;
    month: number;
    unpaidOnly: boolean;
  };
}

export function DisbursementPageContent({
  items,
  stats,
  assignees,
  isManager,
  currentUserId,
  filterDefaults,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header
        title="지급 관리"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "등록 닫기" : "지급 등록"}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="section-stack mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: "조회 기간 지급 예정",
                value: formatKRW(stats.totalAmount),
                color: "text-midnight-charcoal",
              },
              {
                label: "지급 완료",
                value: formatKRW(stats.paidAmount),
                color: "text-deep-violet",
              },
              {
                label: "미지급",
                value: `${formatKRW(stats.unpaidAmount)} (${stats.unpaidCount}건)`,
                color: stats.unpaidCount > 0 ? "text-rich-plum" : "text-smoke-gray",
              },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <p className="mb-1 text-caption text-smoke-gray">{s.label}</p>
                <p className={`text-kpi text-[18px] ${s.color}`}>{s.value}</p>
              </Card>
            ))}
          </div>

          <Suspense fallback={null}>
            <DisbursementFilters
              assignees={assignees}
              isManager={isManager}
              defaultAssigneeId={filterDefaults.assigneeId}
              defaultYear={filterDefaults.year}
              defaultMonth={filterDefaults.month}
              defaultUnpaidOnly={filterDefaults.unpaidOnly}
            />
          </Suspense>

          {showForm && (
            <DisbursementForm
              assignees={assignees}
              isManager={isManager}
              currentUserId={currentUserId}
              onCancel={() => setShowForm(false)}
              onSuccess={() => setShowForm(false)}
            />
          )}

          <div>
            <h2 className="mb-3 font-heading text-section-title">지급 목록</h2>
            <DisbursementList
              items={items}
              assignees={assignees}
              isManager={isManager}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
