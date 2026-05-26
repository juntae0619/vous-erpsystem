import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ── 표준 응답 헬퍼 ──────────────────────────────────────────
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// ── 인증/권한 검사 헬퍼 ─────────────────────────────────────
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) return { session: null, error: fail("Unauthorized", 401) };
  return { session, error: null };
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { session: null, error: fail("Unauthorized", 401) };
  if (session.user.role !== "ADMIN")
    return { session: null, error: fail("Forbidden", 403) };
  return { session, error: null };
}

export async function requireManager() {
  const session = await auth();
  if (!session?.user) return { session: null, error: fail("Unauthorized", 401) };
  if (session.user.role === "USER")
    return { session: null, error: fail("Forbidden", 403) };
  return { session, error: null };
}
