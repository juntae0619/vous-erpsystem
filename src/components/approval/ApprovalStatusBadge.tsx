import { Badge } from "@/components/ui/badge";

export type ApprovalStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

const STATUS_MAP: Record<ApprovalStatus, { label: string; variant: "neutral" | "pending" | "info" | "positive" | "attention" }> = {
  DRAFT: { label: "임시저장", variant: "neutral" },
  SUBMITTED: { label: "결재요청", variant: "pending" },
  IN_REVIEW: { label: "결재중", variant: "info" },
  APPROVED: { label: "승인", variant: "positive" },
  REJECTED: { label: "반려", variant: "attention" },
};

interface Props {
  status: ApprovalStatus;
}

export function ApprovalStatusBadge({ status }: Props) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
