import { ok, fail, requireAdmin, requireManager } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { MAIL_SETTING_KEYS } from "@/lib/contract-mail";
import { z } from "zod/v4";

async function readSettings() {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: Object.values(MAIL_SETTING_KEYS),
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    smtpUser: map.get(MAIL_SETTING_KEYS.smtpUser) ?? "",
    mailTo: map.get(MAIL_SETTING_KEYS.mailTo) ?? "",
    hasPassword: Boolean(map.get(MAIL_SETTING_KEYS.smtpPass)),
  };
}

// GET /api/contract/mail-settings
export async function GET() {
  const { error } = await requireManager();
  if (error) return error;
  return ok(await readSettings());
}

const updateSchema = z.object({
  smtpUser: z.string().email("올바른 이메일을 입력해주세요"),
  smtpPass: z.string().optional(),
  mailTo: z.string().email("올바른 받는 주소를 입력해주세요"),
});

// PUT /api/contract/mail-settings
export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "입력 오류", 400);
  }

  const { smtpUser, smtpPass, mailTo } = parsed.data;

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: MAIL_SETTING_KEYS.smtpUser },
      create: { key: MAIL_SETTING_KEYS.smtpUser, value: smtpUser },
      update: { value: smtpUser },
    }),
    prisma.appSetting.upsert({
      where: { key: MAIL_SETTING_KEYS.mailTo },
      create: { key: MAIL_SETTING_KEYS.mailTo, value: mailTo },
      update: { value: mailTo },
    }),
    ...(smtpPass
      ? [
          prisma.appSetting.upsert({
            where: { key: MAIL_SETTING_KEYS.smtpPass },
            create: { key: MAIL_SETTING_KEYS.smtpPass, value: smtpPass },
            update: { value: smtpPass },
          }),
        ]
      : []),
  ]);

  return ok(await readSettings());
}
