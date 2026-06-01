"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";

const APP_URL = "http://192.168.0.125:5000";
const APP_PASSWORD = "1234";

export default function ContractAppPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // 자동 로그인: 숨겨진 폼을 iframe 타겟으로 제출
    if (formRef.current) {
      formRef.current.submit();
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="계약·수금 관리" />

      {/* 자동 로그인 폼 (iframe 타겟으로 제출) */}
      <form
        ref={formRef}
        method="POST"
        action={`${APP_URL}/login`}
        target="contract-frame"
        style={{ display: "none" }}
      >
        <input type="password" name="password" defaultValue={APP_PASSWORD} />
        <input type="hidden" name="next" value="/" />
      </form>

      {/* 앱 iframe */}
      <iframe
        name="contract-frame"
        src={`${APP_URL}/login`}
        className="flex-1 w-full border-0"
        title="계약·수금 관리 앱"
        onLoad={() => setLoggedIn(true)}
        allow="same-origin"
      />
    </div>
  );
}
