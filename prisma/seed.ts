import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  const password = await bcrypt.hash("12345", 12);

  // 관리자 (이사)
  const admin = await prisma.user.upsert({
    where: { email: "jun1263@svous.or.kr" },
    update: {},
    create: {
      name: "박준태",
      email: "jun1263@svous.or.kr",
      password,
      role: "ADMIN",
      team: "본사",
      position: "이사",
      phone: "010-9801-1263",
      joinedAt: new Date("2024-01-01"),
      isActive: true,
      mustChangePassword: true,
    },
  });

  // 대표이사
  const ceo = await prisma.user.upsert({
    where: { email: "ceo@svous.or.kr" },
    update: {},
    create: {
      name: "박상호",
      email: "ceo@svous.or.kr",
      password,
      role: "ADMIN",
      team: "본사",
      position: "대표이사",
      phone: "010-9252-9292",
      joinedAt: new Date("2020-01-01"),
      isActive: true,
      mustChangePassword: true,
    },
  });

  // 팀장1 (시스템팀)
  const manager1 = await prisma.user.upsert({
    where: { email: "psw2085@svous.or.kr" },
    update: {},
    create: {
      name: "박승원",
      email: "psw2085@svous.or.kr",
      password,
      role: "MANAGER",
      team: "시스템팀",
      position: "부장",
      phone: "010-5094-2085",
      joinedAt: new Date("2023-01-01"),
      isActive: true,
      mustChangePassword: true,
    },
  });

  // 팀장2 (바우처팀)
  const manager2 = await prisma.user.upsert({
    where: { email: "updown10@svous.or.kr" },
    update: {},
    create: {
      name: "김지숙",
      email: "updown10@svous.or.kr",
      password,
      role: "MANAGER",
      team: "바우처팀",
      position: "부장",
      phone: "010-9071-8339",
      joinedAt: new Date("2023-01-01"),
      isActive: true,
      mustChangePassword: true,
    },
  });

  // 직원1
  const staff1 = await prisma.user.upsert({
    where: { email: "khj8012@svous.or.kr" },
    update: {},
    create: {
      name: "김희진",
      email: "khj8012@svous.or.kr",
      password,
      role: "USER",
      team: "바우처팀",
      position: "과장",
      phone: "010-7173-7840",
      joinedAt: new Date("2023-03-01"),
      isActive: true,
      mustChangePassword: true,
    },
  });

  // 직원2
  const staff2 = await prisma.user.upsert({
    where: { email: "colorful81@svous.or.kr" },
    update: {},
    create: {
      name: "김선희",
      email: "colorful81@svous.or.kr",
      password,
      role: "USER",
      team: "바우처팀",
      position: "과장",
      phone: "010-7476-2709",
      joinedAt: new Date("2024-06-01"),
      isActive: true,
      mustChangePassword: true,
    },
  });

  // 출퇴근 기준 시간 초기화
  await prisma.attendanceSettings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      checkInTime: "09:00",
      checkOutTime: "18:00",
      updatedById: admin.id,
    },
  });

  // 현재 연도 연차 부여
  const currentYear = new Date().getFullYear();
  const allUsers = [admin, ceo, manager1, manager2, staff1, staff2];

  for (const user of allUsers) {
    await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: user.id, year: currentYear } },
      update: {},
      create: {
        userId: user.id,
        year: currentYear,
        totalDays: 15,
        usedDays: 0,
        carryOverDays: 0,
        totalHalfDays: 0,
        usedHalfDays: 0,
      },
    });
  }

  console.log("✅ 시드 데이터 생성 완료!");
  console.log("");
  console.log("📋 생성된 계정:");
  console.log("  관리자(이사)  jun1263@svous.or.kr    / 12345");
  console.log("  대표이사      ceo@svous.or.kr         / 12345");
  console.log("  팀장(시스템)  psw2085@svous.or.kr    / 12345");
  console.log("  팀장(바우처)  updown10@svous.or.kr   / 12345");
  console.log("  직원1         khj8012@svous.or.kr    / 12345");
  console.log("  직원2         colorful81@svous.or.kr / 12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
