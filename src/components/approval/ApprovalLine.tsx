import { Check, X, Clock, SkipForward } from "lucide-react";

export type StepStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

interface Step {
  id: string;
  stepRole: string;
  stepOrder: number;
  status: StepStatus;
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string; position: string | null } | null;
}

interface Props {
  steps: Step[];
}

const ROLE_MAP: Record<string, string> = {
  MANAGER: "팀장",
  DIRECTOR: "이사",
  CEO: "대표",
};

const STEP_CONFIG: Record<StepStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  PENDING:  { icon: <Clock size={13} />,        color: "text-[#b3b3b3]", bg: "bg-[#f8f9fb]" },
  APPROVED: { icon: <Check size={13} />,         color: "text-green-600", bg: "bg-[#f0fdf4]" },
  REJECTED: { icon: <X size={13} />,             color: "text-red-600",   bg: "bg-[#fef2f2]" },
  SKIPPED:  { icon: <SkipForward size={13} />,   color: "text-[#b3b3b3]", bg: "bg-[#f8f9fb]" },
};

export function ApprovalLine({ steps }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((step, idx) => {
        const config = STEP_CONFIG[step.status] ?? STEP_CONFIG.PENDING;
        return (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div className="w-6 h-px bg-[#e8e8e8]" />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}
                title={step.comment ?? undefined}
              >
                {config.icon}
              </div>
              <div className="text-center">
                <p className="text-[11px] font-medium text-[#292d34]">
                  {step.approver?.name ?? ROLE_MAP[step.stepRole] ?? step.stepRole}
                </p>
                <p className="text-[10px] text-[#b3b3b3]">
                  {ROLE_MAP[step.stepRole]}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
