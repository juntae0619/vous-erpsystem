"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "계약현황", href: "/contract" },
  { label: "청구현황", href: "/contract/billing" },
  { label: "메일·데이터", href: "/contract/settings", managerOnly: true },
];

export function ContractNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname();
  const visible = tabs.filter((t) => !t.managerOnly || isManager);

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {visible.map((tab) => {
        const active =
          tab.href === "/contract"
            ? pathname === "/contract"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors",
              active
                ? "bg-deep-violet text-white"
                : "text-smoke-gray hover:bg-hint-of-sky hover:text-midnight-charcoal"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
