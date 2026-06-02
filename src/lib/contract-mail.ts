import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export type ContractMailSettings = {
  smtpUser: string;
  smtpPass: string;
  mailTo: string;
};

export const MAIL_SETTING_KEYS = {
  smtpUser: "contract_mail_smtp_user",
  mailTo: "contract_mail_to",
} as const;

function smtpHost(user: string) {
  const host = process.env.CONTRACT_SMTP_HOST ?? process.env.SMTP_HOST;
  if (host) return host;
  const domain = user.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail")) return "smtp.gmail.com";
  if (domain.includes("naver")) return "smtp.naver.com";
  if (domain.includes("daum") || domain.includes("kakao")) return "smtp.daum.net";
  return "smtp.naver.com";
}

function smtpPort() {
  const raw = process.env.CONTRACT_SMTP_PORT ?? process.env.SMTP_PORT ?? "465";
  return parseInt(raw, 10);
}

/** DB(보내는·받는 주소) + env(SMTP 비밀번호) 조합 */
export async function loadContractMailSettings(): Promise<ContractMailSettings | null> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(MAIL_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const smtpUser =
    map.get(MAIL_SETTING_KEYS.smtpUser) ??
    process.env.CONTRACT_SMTP_USER ??
    process.env.SMTP_USER ??
    "";
  const mailTo =
    map.get(MAIL_SETTING_KEYS.mailTo) ??
    process.env.CONTRACT_MAIL_TO ??
    process.env.SMTP_TO ??
    "";
  const smtpPass =
    process.env.CONTRACT_SMTP_PASS ?? process.env.SMTP_PASS ?? "";

  if (!smtpUser || !smtpPass || !mailTo) return null;
  return { smtpUser, smtpPass, mailTo };
}

export async function sendContractAlertMail(
  settings: ContractMailSettings,
  subject: string,
  body: string
) {
  const port = smtpPort();
  const transporter = nodemailer.createTransport({
    host: smtpHost(settings.smtpUser),
    port,
    secure: port === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  await transporter.sendMail({
    from: settings.smtpUser,
    to: settings.mailTo,
    subject,
    text: body,
  });
}
