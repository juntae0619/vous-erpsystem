import { ok, fail, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { loadContractMailSettings, sendContractAlertMail, formatSmtpError } from "@/lib/contract-mail";
import { writeAuditLog } from "@/lib/audit";
import { addDays, format } from "date-fns";
import { z } from "zod/v4";

const bodySchema = z.object({
  test: z.boolean().default(false),
});

// POST /api/contract/send-alert
export async function POST(req: Request) {
  const { session, error } = await requireManager();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }

  const settings = await loadContractMailSettings();
  if (!settings) {
    return fail(
      "메일 설정이 완료되지 않았습니다. 보내는/받는 주소를 저장하고 서버 env에 CONTRACT_SMTP_PASS(또는 SMTP_PASS)를 설정하세요.",
      400
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = addDays(today, 15);

  const contracts = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: { gte: today, lte: limit },
    },
    orderBy: { nextBillingDate: "asc" },
  });

  if (parsed.data.test) {
    try {
      await sendContractAlertMail(
        settings,
        "[VOUS ERP] 계약·수금 알림 테스트",
        "테스트 메일입니다. 계약·수금 알림 설정이 정상 동작합니다."
      );
      return ok({ test: true, sent: true });
    } catch (err) {
      return fail(formatSmtpError(err, settings.smtpUser), 502);
    }
  }

  if (contracts.length === 0) {
    return ok({
      sent: false,
      message: "청구 예정일이 15일 이내인 계약이 없습니다.",
      count: 0,
    });
  }

  const lines = contracts.map((c) => {
    const date = c.nextBillingDate
      ? format(c.nextBillingDate, "yyyy-MM-dd")
      : "-";
    return `- ${c.localGovName} | ${c.contractName} | 다음 청구: ${date}`;
  });

  const bodyText = [
    "청구 예정일이 15일 이내인 계약 목록입니다.",
    "",
    ...lines,
    "",
    `총 ${contracts.length}건`,
  ].join("\n");

  try {
    await sendContractAlertMail(
      settings,
      `[VOUS ERP] 청구 예정 알림 (${contracts.length}건)`,
      bodyText
    );
  } catch (err) {
    return fail(formatSmtpError(err, settings.smtpUser), 502);
  }

  await writeAuditLog({
    userId: session!.user.id,
    action: "CONTRACT_ALERT_SENT",
    resource: "Contract",
    details: { count: contracts.length },
  });

  return ok({ sent: true, count: contracts.length });
}
