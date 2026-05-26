"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Assignee {
  id: string;
  name: string;
  position: string | null;
}

interface Props {
  assignees: Assignee[];
  isManager: boolean;
  defaultAssigneeId?: string;
  defaultYear: number;
  defaultMonth: number;
  defaultUnpaidOnly?: boolean;
}

export function DisbursementFilters({
  assignees,
  isManager,
  defaultAssigneeId,
  defaultYear,
  defaultMonth,
  defaultUnpaidOnly,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    router.push(`/disbursement?${params.toString()}`);
  }

  const monthValue = `${defaultYear}-${String(defaultMonth).padStart(2, "0")}`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="form-field min-w-[140px]">
        <Label>조회 월</Label>
        <Input
          type="month"
          className="form-input h-9 w-full"
          value={monthValue}
          onChange={(e) => {
            const [year, month] = e.target.value.split("-");
            updateParams({ year, month });
          }}
        />
      </div>

      {isManager && (
        <div className="form-field min-w-[160px]">
          <Label>담당자</Label>
          <Select
            value={defaultAssigneeId ?? "all"}
            onValueChange={(v) =>
              updateParams({ assigneeId: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="form-input h-9 w-full">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border">
              <SelectItem value="all">전체</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                  {a.position ? ` (${a.position})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="form-field min-w-[160px]">
        <Label>거래처</Label>
        <Input
          className="form-input h-9"
          placeholder="거래처명 검색"
          defaultValue={searchParams.get("vendorName") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({
                vendorName: (e.target as HTMLInputElement).value || null,
              });
            }
          }}
        />
      </div>

      <Button
        type="button"
        variant={defaultUnpaidOnly ? "default" : "outline"}
        className="h-9"
        onClick={() =>
          updateParams({ isPaid: defaultUnpaidOnly ? null : "false" })
        }
      >
        미지급만
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="h-9 text-smoke-gray"
        onClick={() => router.push("/disbursement")}
      >
        필터 초기화
      </Button>
    </div>
  );
}
