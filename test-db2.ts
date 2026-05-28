import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = "postgresql://erp_user:erp_password@localhost:5432/erp_db?schema=public";
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

prisma.user.count()
  .then((n) => {
    console.log("SUCCESS - User count:", n);
  })
  .catch((e) => {
    console.error("FULL ERROR:");
    console.error("  message:", e.message);
    console.error("  code:", e.code);
    console.error("  meta:", JSON.stringify(e.meta));
    console.error("  stack:", e.stack?.split("\n").slice(0, 5).join("\n"));
  })
  .finally(() => prisma.$disconnect());
