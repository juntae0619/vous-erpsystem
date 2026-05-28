import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL || "postgresql://erp_user:erp_password@localhost:5432/erp_db?schema=public";
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.user.count();
  console.log("User count:", count);
  const user = await prisma.user.findUnique({ where: { email: "admin@voucher-erp.com" } });
  console.log("Admin found:", user ? `YES - ${user.name} (role: ${user.role})` : "NO");
}


main()
  .catch((e) => console.error("DB Error:", e.message))
  .finally(() => prisma.$disconnect());
