import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { LocalGovContactsClient } from "@/components/local-gov/LocalGovContactsClient";

export const metadata = { title: "지자체 담당자 연락처" };

export default async function LocalGovContactsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [contacts, regionRows] = await Promise.all([
    prisma.localGovContact.findMany({
      orderBy: [{ region: "asc" }, { city: "asc" }, { createdAt: "asc" }],
    }),
    prisma.localGovContact.findMany({
      select: { region: true },
      distinct: ["region"],
      orderBy: { region: "asc" },
    }),
  ]);

  const regions = regionRows.map((r) => r.region);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="지자체 담당자 연락처" />
      <LocalGovContactsClient contacts={contacts} regions={regions} />
    </div>
  );
}
