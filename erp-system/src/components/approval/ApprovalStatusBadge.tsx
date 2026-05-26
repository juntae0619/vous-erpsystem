import { Badge } from "@/components/ui/badge";

export type ApprovalStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

const STATUS_MAP: Record<ApprovalStatus, { label: string; className: string }> = {
  DRAFT:     { label: "임시저장", className: "bg-[#f8f9fb] text-[#b3b3b3] border-[#e8e8e8]" },
  SUBMITTED: { label: "결재요청", className: "bg-[#fff7ed] text-orange-600 border-orange-200" },
  IN_REVIEW: { label: "결재중",   className: "bg-[#edf6fd] text-blue-600 border-blue-200" },
  APPROVED:  { label: "승인",     className: "bg-[#f0fdf4] text-green-600 border-green-200" },
  REJECTED:  { label: "반려",     className: "bg-[#fef2f2] text-red-600 border-red-200" },
};

interface Props {
  status: ApprovalStatus;
}

export function ApprovalStatusBadge({ status }: Props) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;
  return (
    <Badge className={`text-[11px] px-2 py-0.5 border rounded-full font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
