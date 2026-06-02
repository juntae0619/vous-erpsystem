import nodemailer from "nodemailer";

export type ContractMailSettings = {
  smtpUser: string;
  smtpPass: string;
  mailTo: string;
};

function smtpHost(user: string) {
  const domain = user.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail")) return "smtp.gmail.com";
  if (domain.includes("naver")) return "smtp.naver.com";
  if (domain.includes("daum") || domain.includes("kakao")) return "smtp.daum.net";
  return "smtp.naver.com";
}

export async function sendContractAlertMail(
  settings: ContractMailSettings,
  subject: string,
  body: string
) {
  const transporter = nodemailer.createTransport({
    host: smtpHost(settings.smtpUser),
    port: 465,
    secure: true,
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

export const MAIL_SETTING_KEYS = {
  smtpUser: "contract_mail_smtp_user",
  smtpPass: "contract_mail_smtp_pass",
  mailTo: "contract_mail_to",
} as const;
