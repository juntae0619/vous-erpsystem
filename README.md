# VOUS ERP System

Next.js(App Router) + Prisma + PostgreSQL 기반 내부 ERP입니다.

## 로컬 개발

```bash
cp .env.example .env
# DATABASE_URL, AUTH_SECRET 등 설정

npm install
npx prisma migrate dev
npm run dev
```

브라우저: [http://localhost:3000](http://localhost:3000)

## 프로덕션 배포 (PM2)

서버 예시: `192.168.0.125`, 경로 `/home/vouserp/vous-erpsystem`, PM2 앱명 `vous-erp`

```bash
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 restart vous-erp
# 최초 실행: pm2 start ecosystem.config.js && pm2 save
```

### 필수 환경변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `AUTH_SECRET` | NextAuth 시크릿 |
| `AUTH_URL` | 배포 URL (예: `http://192.168.0.125:3000`) |
| `CONTRACT_SMTP_PASS` | 계약·수금 메일 알림 SMTP 비밀번호 (선택) |

메일 보내는/받는 주소는 ERP **계약·수금 → 설정** 화면에서 저장합니다.

### 레거시 계약 앱 데이터 이전

레거시 `:5000` 앱이 실행 중일 때:

```bash
LEGACY_CONTRACT_APP_URL=http://127.0.0.1:5000 \
LEGACY_CONTRACT_APP_PASSWORD=1234 \
npx tsx scripts/migrate-legacy-contracts.ts
```

또는 관리자로 로그인 후 **설정 → 레거시 데이터 가져오기** API를 사용합니다.

## 주요 기능

- **계약·수금** — 계약 등록/청구/입금, 데이터 품질 점검, 메일 알림
- **전자결재** — 임시저장, 결재선, 승인/반려/전결
- **지자체 연락처** — 조회(전체), 등록/수정/삭제(매니저 이상)

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npx prisma studio` | DB GUI |
