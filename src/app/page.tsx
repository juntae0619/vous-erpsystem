import { redirect } from "next/navigation";

// 루트("/")는 대시보드로 자동 리다이렉트
export default function RootPage() {
  redirect("/dashboard");
}
