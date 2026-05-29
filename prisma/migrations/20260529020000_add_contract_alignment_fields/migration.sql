-- 계약·수금 관리 정렬: 지역/담당부서/담당자/다음 청구 예정일 추가
ALTER TABLE "contracts" ADD COLUMN "region" TEXT;
ALTER TABLE "contracts" ADD COLUMN "department" TEXT;
ALTER TABLE "contracts" ADD COLUMN "managerName" TEXT;
ALTER TABLE "contracts" ADD COLUMN "nextBillingDate" DATE;
