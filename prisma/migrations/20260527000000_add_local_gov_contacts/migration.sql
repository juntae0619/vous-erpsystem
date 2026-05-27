-- CreateTable
CREATE TABLE "local_gov_contacts" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cardName" TEXT,
    "allowedItems" TEXT,
    "department" TEXT,
    "contactName" TEXT,
    "jobDuty" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "cardBinNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_gov_contacts_pkey" PRIMARY KEY ("id")
);
