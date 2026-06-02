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

/** SMTP 오류를 사용자용 한글 메시지로 변환 */
export function formatSmtpError(err: unknown, smtpUser?: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/535|Username and Password not accepted|authentication/i.test(raw)) {
    if (smtpUser && /@naver\.com/i.test(smtpUser)) {
      return (
        "네이버 SMTP 로그인이 거부되었습니다. 일반 로그인 비밀번호는 사용할 수 없습니다. " +
        "① 네이버 메일 환경설정에서 POP3/IMAP·SMTP 사용함 ② 2단계 인증 설정 " +
        "③ 애플리케이션 비밀번호 발급 후 서버 CONTRACT_SMTP_PASS에 입력하세요."
      );
    }
    return "SMTP 로그인 실패: 아이디 또는 비밀번호(앱 비밀번호)를 확인하세요.";
  }
  return raw;
}
