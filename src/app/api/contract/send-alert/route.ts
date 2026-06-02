import { ok, fail, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  MAIL_SETTING_KEYS,
  sendContractAlertMail,
} from "@/lib/contract-mail";
import { addDays, format } from "date-fns";
import { z } from "zod/v4";

async function loadMailSettings() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(MAIL_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const smtpUser = map.get(MAIL_SETTING_KEYS.smtpUser) ?? "";
  const smtpPass = map.get(MAIL_SETTING_KEYS.smtpPass) ?? "";
  const mailTo = map.get(MAIL_SETTING_KEYS.mailTo) ?? "";
  if (!smtpUser || !smtpPass || !mailTo) return null;
  return { smtpUser, smtpPass, mailTo };
}

const bodySchema = z.object({
  test: z.boolean().default(false),
});

// POST /api/contract/send-alert — 청구 예정일 15일 이내 계약 메일 발송
export async function POST(req: Request) {
  const { session, error } = await requireManager();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }

  const settings = await loadMailSettings();
  if (!settings) {
    return fail("메일 설정을 먼저 저장해주세요 (계약·수금 → 메일 설정)", 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = addDays(today, 15);

  const contracts = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: {
        gte: today,
        lte: limit,
      },
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
      const msg = err instanceof Error ? err.message : "메일 발송 실패";
      return fail(msg, 502);
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
    return `- ${c.localGovName} | ${c.contractName} | 다음 청구: ${date} | ${Number(c.serviceAmount).toLocaleString()}원`;
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
    const msg = err instanceof Error ? err.message : "메일 발송 실패";
    return fail(msg, 502);
  }

  await writeAuditLog({
    userId: session!.user.id,
    action: "CONTRACT_ALERT_SENT",
    resource: "Contract",
    details: { count: contracts.length },
  });

  return ok({ sent: true, count: contracts.length, contracts: contracts.length });
}
