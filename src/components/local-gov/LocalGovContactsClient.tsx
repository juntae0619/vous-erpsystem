"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Phone, Mail, CreditCard, Building2, MapPin, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LocalGovContactEditDialog,
  type LocalGovContactData,
} from "@/components/local-gov/LocalGovContactEditDialog";

interface Contact extends LocalGovContactData {}

interface Props {
  contacts: Contact[];
  regions: string[];
}

const REGION_COLORS: Record<string, string> = {
  경상: "bg-blue-100 text-blue-700 border-blue-200",
  충청: "bg-green-100 text-green-700 border-green-200",
  전북: "bg-yellow-100 text-yellow-700 border-yellow-200",
  전남: "bg-orange-100 text-orange-700 border-orange-200",
  강원: "bg-purple-100 text-purple-700 border-purple-200",
  경기: "bg-pink-100 text-pink-700 border-pink-200",
};

function regionBadgeClass(region: string) {
  return REGION_COLORS[region] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

export function LocalGovContactsClient({ contacts, regions }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState<string>("전체");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const matchRegion =
        activeRegion === "전체" || c.region === activeRegion;
      const matchSearch =
        !q ||
        [c.city, c.contactName, c.department, c.jobDuty, c.phone, c.email, c.cardBinNo, c.cardName]
          .some((v) => v?.toLowerCase().includes(q));
      return matchRegion && matchSearch;
    });
  }, [contacts, search, activeRegion]);

  // 지역별로 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Contact[]>>();
    for (const c of filtered) {
      if (!map.has(c.region)) map.set(c.region, new Map());
      const cityMap = map.get(c.region)!;
      if (!cityMap.has(c.city)) cityMap.set(c.city, []);
      cityMap.get(c.city)!.push(c);
    }
    return map;
  }, [filtered]);

  async function handleDelete(contact: Contact) {
    if (!confirm(`${contact.contactName ?? contact.city} 연락처를 삭제하시겠습니까?`)) {
      return;
    }
    setDeletingId(contact.id);
    try {
      const res = await fetch(`/api/local-gov-contacts/${contact.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "삭제에 실패했습니다");
        return;
      }
      toast.success("연락처가 삭제되었습니다");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* 검색 + 필터 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke-gray" size={15} />
            <Input
              placeholder="시/군, 담당자, 부서, 연락처, 이메일, 카드번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["전체", ...regions].map((r) => (
              <button
                key={r}
                onClick={() => setActiveRegion(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  r === activeRegion
                    ? "border-deep-violet bg-deep-violet text-white"
                    : "border-border bg-white text-smoke-gray hover:border-deep-violet hover:text-deep-violet"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 수 */}
        <p className="text-caption text-smoke-gray">
          총 <span className="font-semibold text-midnight-charcoal">{filtered.length}</span>건
        </p>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-body-sm text-smoke-gray">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([region, cityMap]) => (
              <section key={region}>
                {/* 지역 헤더 */}
                <div className="mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-smoke-gray" />
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", regionBadgeClass(region))}>
                    {region}
                  </span>
                  <span className="text-caption text-smoke-gray">{Array.from(cityMap.values()).flat().length}명</span>
                </div>

                <div className="space-y-4">
                  {Array.from(cityMap.entries()).map(([city, cityContacts]) => {
                    const first = cityContacts[0];
                    return (
                      <Card key={city} className="overflow-hidden">
                        {/* 시/군 헤더 */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-hint-of-sky px-4 py-2.5">
                          <Building2 size={14} className="text-smoke-gray" />
                          <span className="font-heading text-body-sm font-semibold text-midnight-charcoal">
                            {city}
                          </span>
                          {first.cardName && (
                            <span className="text-caption text-smoke-gray">
                              ({first.cardName})
                            </span>
                          )}
                          {first.allowedItems && (
                            <Badge variant="outline" className="text-xs">
                              허용: {first.allowedItems}
                            </Badge>
                          )}
                        </div>

                        {/* 담당자 목록 */}
                        <div className="divide-y divide-border">
                          {cityContacts.map((c) => (
                            <div
                              key={c.id}
                              className="grid grid-cols-1 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr_auto]"
                            >
                              {/* 부서 + 담당자 */}
                              <div className="flex flex-col">
                                {c.department && (
                                  <span className="text-caption text-smoke-gray">{c.department}</span>
                                )}
                                <span className="text-body-sm font-medium text-midnight-charcoal">
                                  {c.contactName ?? "-"}
                                </span>
                              </div>

                              {/* 담당업무 */}
                              <div className="flex items-center">
                                {c.jobDuty && (
                                  <Badge variant="outline" className="text-xs">
                                    {c.jobDuty}
                                  </Badge>
                                )}
                              </div>

                              {/* 전화 */}
                              <div className="flex items-center gap-1.5">
                                <Phone size={12} className="shrink-0 text-smoke-gray" />
                                {c.phone ? (
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="text-body-sm text-deep-violet hover:underline"
                                  >
                                    {c.phone}
                                  </a>
                                ) : (
                                  <span className="text-caption text-smoke-gray">-</span>
                                )}
                              </div>

                              {/* 이메일 */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Mail size={12} className="shrink-0 text-smoke-gray" />
                                {c.email ? (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="truncate text-body-sm text-deep-violet hover:underline"
                                  >
                                    {c.email}
                                  </a>
                                ) : (
                                  <span className="text-caption text-smoke-gray">-</span>
                                )}
                              </div>

                              {/* 카드 빈번호 */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CreditCard size={12} className="shrink-0 text-smoke-gray" />
                                {c.cardBinNo ? (
                                  <span className="truncate text-body-sm font-mono text-midnight-charcoal">
                                    {c.cardBinNo}
                                  </span>
                                ) : (
                                  <span className="text-caption text-smoke-gray">-</span>
                                )}
                              </div>

                              {/* 수정 / 삭제 */}
                              <div className="flex items-center justify-end gap-1 sm:justify-start">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-smoke-gray hover:text-midnight-charcoal"
                                  onClick={() => setEditingContact(c)}
                                  disabled={deletingId === c.id}
                                  title="수정"
                                >
                                  <Pencil size={13} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-smoke-gray hover:text-rich-plum"
                                  onClick={() => handleDelete(c)}
                                  disabled={deletingId === c.id}
                                  title="삭제"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <LocalGovContactEditDialog
        contact={editingContact}
        open={!!editingContact}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null);
        }}
      />
    </div>
  );
}
