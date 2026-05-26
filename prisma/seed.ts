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

  // 관리자 계정 생성
  const adminPassword = await bcrypt.hash("admin1234!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@voucher-erp.com" },
    update: {},
    create: {
      name: "관리자",
      email: "admin@voucher-erp.com",
      password: adminPassword,
      role: "ADMIN",
      team: "시스템팀",
      position: "시스템 관리자",
      phone: "010-0000-0001",
      joinedAt: new Date("2024-01-01"),
      isActive: true,
    },
  });

  // 이사 계정
  const directorPassword = await bcrypt.hash("director1234!", 12);
  const director = await prisma.user.upsert({
    where: { email: "director@voucher-erp.com" },
    update: {},
    create: {
      name: "이사",
      email: "director@voucher-erp.com",
      password: directorPassword,
      role: "MANAGER",
      team: "경영",
      position: "이사",
      phone: "010-0000-0002",
      joinedAt: new Date("2023-01-01"),
      isActive: true,
    },
  });

  // 대표 계정
  const ceoPassword = await bcrypt.hash("ceo1234!", 12);
  const ceo = await prisma.user.upsert({
    where: { email: "ceo@voucher-erp.com" },
    update: {},
    create: {
      name: "대표",
      email: "ceo@voucher-erp.com",
      password: ceoPassword,
      role: "ADMIN",
      team: "경영",
      position: "대표",
      phone: "010-0000-0003",
      joinedAt: new Date("2020-01-01"),
      isActive: true,
    },
  });

  // 바우처팀 직원 3명
  const staffPassword = await bcrypt.hash("staff1234!", 12);

  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@voucher-erp.com" },
    update: {},
    create: {
      name: "김바우처",
      email: "staff1@voucher-erp.com",
      password: staffPassword,
      role: "USER",
      team: "바우처팀",
      position: "대리",
      phone: "010-0000-0011",
      joinedAt: new Date("2023-03-01"),
      isActive: true,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@voucher-erp.com" },
    update: {},
    create: {
      name: "이정산",
      email: "staff2@voucher-erp.com",
      password: staffPassword,
      role: "USER",
      team: "바우처팀",
      position: "사원",
      phone: "010-0000-0012",
      joinedAt: new Date("2024-06-01"),
      isActive: true,
    },
  });

  const staff3 = await prisma.user.upsert({
    where: { email: "staff3@voucher-erp.com" },
    update: {},
    create: {
      name: "박용역",
      email: "staff3@voucher-erp.com",
      password: staffPassword,
      role: "USER",
      team: "바우처팀",
      position: "사원",
      phone: "010-0000-0013",
      joinedAt: new Date("2025-01-01"),
      isActive: true,
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
  const allUsers = [admin, director, ceo, staff1, staff2, staff3];

  for (const user of allUsers) {
    await prisma.leaveBalance.upsert({
      where: { userId_year: { userId: user.id, year: currentYear } },
      update: {},
      create: {
        userId: user.id,
        year: currentYear,
        totalDays: 15,       // 기본 연차 15일
        usedDays: 0,
        carryOverDays: 0,
        totalHalfDays: 0,    // 매월 말에 자동 부여
        usedHalfDays: 0,
      },
    });
  }

  console.log("✅ 시드 데이터 생성 완료!");
  console.log("");
  console.log("📋 생성된 계정:");
  console.log("  관리자    admin@voucher-erp.com     / admin1234!");
  console.log("  이사      director@voucher-erp.com  / director1234!");
  console.log("  대표      ceo@voucher-erp.com       / ceo1234!");
  console.log("  직원1     staff1@voucher-erp.com    / staff1234!");
  console.log("  직원2     staff2@voucher-erp.com    / staff1234!");
  console.log("  직원3     staff3@voucher-erp.com    / staff1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
