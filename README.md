# Тендер байна — Тендерийн платформ

Монгол хэл дээрх талын тендерийн маркетплейс: хувь хүн болон компаниуд тендер зарлах, бусад нь санал илгээх боломжтой.

## Стэк

- **Next.js 14 (App Router)** + **TypeScript (strict)**
- **Tailwind CSS** (design tokens CSS хувьсагчаар, dark mode = `class`)
- **Framer Motion** (анимаци)
- **Supabase** (Postgres + Auth + RLS + Storage), `@supabase/ssr` cookie session
- **Zod** + **react-hook-form** + **@hookform/resolvers** (формын баталгаажуулалт)
- **lucide-react** (ikonууд)

## Шаардлага

- Node.js 18.17+ (санал болгосон: 20.x)
- npm 9+
- Supabase төсөл (үүсгэх: https://supabase.com)

## Эхлүүлэх алхамууд

1. **Хамаарал суулгах**

   ```bash
   npm install
   ```

2. **Орчны хувьсагч үүсгэх**

   ```bash
   cp .env.example .env.local
   ```

   `.env.local` доторх утгуудыг өөрийн Supabase төслийн мэдээллээр бөглөнө үү:

   | Хувьсагч | Тодорхойлолт |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase төслийн URL (Settings → API) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
   | `NEXT_PUBLIC_SITE_URL` | Сайтын үндсэн URL (SEO/sitemap) |
   | `NEXT_PUBLIC_ALLOWED_ORIGINS` | API CORS зөвшөөрөгдсөн origin-ууд |
   | `NEXT_PUBLIC_ROOT_DOMAIN` | Нийтийн сайтын домэйн (`baina.mn`) |
   | `NEXT_PUBLIC_ADMIN_HOST` | Админ самбарын дэд домэйн (`admin.baina.mn`) |

   > Зөвхөн `NEXT_PUBLIC_*` хувьсагчид клиент рүү илчлэгдэнэ. Серверийн нууц түлхүүрүүдийг (`SUPABASE_SERVICE_ROLE_KEY` гэх мэт) хэзээ ч `NEXT_PUBLIC_` тавихгүй.

3. **Өгөгдлийн схем үүсгэх** (Supabase SQL Editor дотор дарааллаар ажиллуулна уу):

   ```text
   db/schema.sql   -- хүснэгт, индекс, триггер, функц
   db/rls.sql       -- Row Level Security бодлогууд
   db/seed.sql      -- жишээ өгөгдөл (3 хэрэглэгч, 8 тендер, 6 санал)
   ```

4. **Хөгжүүлэх сервер ажиллуулах**

   ```bash
   npm run dev
   ```

   http://localhost:3000 хаягаар нээнэ үү.

5. **Бүтээгдэхүүн бэлтгэх / шалгах**

   ```bash
   npm run build      # production build (type check агуулна)
   npm run typecheck  # тусдаа TypeScript шалгалт
   npm run lint       # ESLint
   npm start          # production server
   ```

## Нэмэлт тохиргоо

- **Dark mode**: header-ийн товчоор солигдоно, `localStorage`-д хадгалагдана (`class` стратеги).
- **Rate limiting**: `/api/*` болон auth маршрутууд дээр middleware доторх in-memory LRU token bucket. **Production-д Upstash Redis (гэх мэт) бүтээгдэхүүний түвшний store-оор солих шаардлагатай.**
- **Хуудас бүрийн metadata**: Монгол хэл дээр, Open Graph-тэй; `src/app/sitemap.ts`, `src/app/robots.ts`.

## Структур (эцсийн зорилтот бүтэц)

```text
.
├── db/
│   ├── schema.sql
│   ├── rls.sql
│   └── seed.sql
├── public/
│   └── icons / images
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout (lang="mn", Inter font, providers)
│   │   ├── template.tsx            # page transitions (fade + slide-up)
│   │   ├── page.tsx                # landing "/"
│   │   ├── loading.tsx             # route-level fallback
│   │   ├── error.tsx               # error boundary
│   │   ├── not-found.tsx           # 404
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── globals.css             # design tokens (light/dark)
│   │   ├── tenders/
│   │   │   ├── page.tsx            # list + filters + pagination
│   │   │   └── [id]/page.tsx       # detail
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── dashboard/page.tsx      # protected, tabs
│   │   ├── about/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── api/
│   │       ├── tenders/route.ts
│   │       ├── proposals/route.ts
│   │       └── profile/route.ts
│   ├── components/
│   │   ├── ui/                     # Button, Input, Textarea, Select, Badge,
│   │   │                           # Card, Modal, Toast, Skeleton, Spinner,
│   │   │                           # EmptyState, ConfirmDialog, Pagination,
│   │   │                           # Tabs, Avatar, Dropdown, Loading.tsx
│   │   ├── layout/                 # Header, MobileDrawer, Footer, ThemeToggle
│   │   ├── landing/                # Hero, StatsStrip, HowItWorks, FeaturedTenders,
│   │   │                           # CategoriesGrid, Comparison, CtaBand
│   │   ├── tenders/                # TenderCard, TenderFilters, DeadlineCountdown,
│   │   │                           # CreateTenderModal, SubmitProposalModal
│   │   ├── dashboard/              # MyTenders, MyProposals, ProfileForm
│   │   └── providers/              # ThemeProvider, ToastProvider
│   ├── lib/
│   │   ├── i18n/mn.ts              # ALL user-facing Mongolian strings
│   │   ├── utils.ts                # cn, формат, countdown, debounce
│   │   ├── constants.ts            # лимитүүд, enum-ууд
│   │   ├── validators/             # Zod schemas (auth, tender, proposal, profile)
│   │   ├── supabase/               # client.ts, server.ts, middleware.ts
│   │   └── actions/                # server actions (mutation)
│   └── middleware.ts               # session refresh + route protection + rate limit
├── tailwind.config.ts              # design tokens
├── next.config.js                  # security headers (Phase 8)
├── .env.example
└── README.md
```

## Админ самбар (subdomain: `admin.baina.mn`)

Нэг repo, нэг deploy — хоёр host:

| Host | Юу үзүүлэх вэ | Кодын байршил |
| --- | --- | --- |
| `baina.mn` (нийтийн) | Нийтийн сайт: header, footer, туслах, тендерүүд, `/dashboard` | `src/app/(site)/*` |
| `admin.baina.mn` (админ) | Админ самбар (өөрийн shell, өөрийн session) | `src/app/admin/*` |

**Локал дээр:** `npm run dev` нэг процесс дээр хоёуланг нь үзүүлнэ —
нийтийн сайт `http://localhost:3000`, админ самбар `http://admin.localhost:3000`.
(`*.localhost` нь үргэлж 127.0.0.1 рүү заадаг тул нэмэлт тохиргоо шаардлагагүй.)

**Routing (код дотор):** `src/middleware.ts` нь host-оор шийднэ: админ host дээр `/` →
`/admin`, `/x` → `/admin/x` (хөтчийн хаяг дээр `/admin` угтвар ХАРАГДАХГҮЙ); нийтийн host
дээр `/admin` бүхэлдээ 404. Хэрэглэгчийн мэдэх шаардлагагүй дэд бүтэц (`/_next`, telemetry API,
админы `robots.txt`)-ээс бусад бүх зам админ host дээр угтваргүй ажиллана. Бүх админ хариулт
`X-Robots-Tag: noindex, nofollow` толгойтой, админы `robots.txt` нь `Disallow: /`.

**Session тусдаа (зориуд):** Supabase-ийн auth cookie нь зөвхөн тухайн host-д хүчинтэй
(`@supabase/ssr`-ийн бүх helper дээр `domain` тавихгүй). Тиймээс нийтийн сайтад нэвтэрсэн хүн
админ самбарт автоматаар нэвтрээгүй байна — админ самбар дээр тусад нь нэвтэрч, MFA (TOTP)
баталгаажуулна. Гарах үед зөвхөн тухайн host-ийн session устана (`scope: 'local'`).

### 1. Шинэ админ нэмэх (алхам бүрэлдэхүүнтэй)

Admin самбарт орохын тулд хэрэглэгчийн `profiles.is_admin = true` байх ёстой **бөгөөд** админ
самбар дээр MFA (TOTP) тохируулсан байх ёстой — `public.is_admin()` функц aal2 session
шаарддаг (нууц үг ганцаараа хангалтгүй).

```bash
# 1) НИЙТИЙН САЙТ дээр (localhost:3000) шинэ хэрэглэгчээр бүртгүүлнэ
# 2) Админ эрх олгох:
npm run admin:make -- you@mail.com

# одоогийн админуудыг харах (имэйл илэрхийлэгдсэн байдалтай):
npm run admin:list

# тестийн хаяг үлдээсэн бол цэвэрлэх:
npm run admin:cleanup

# 3) Админ host дээр нэвтрэх:  http://admin.localhost:3000/login  (бодитойд admin.baina.mn)
# 4) /security дээр гар утасны нэмэлт токен (TOTP) тохируулна
```

`admin:make` нь бүртгэлгүй имэйлээс татгалзаж, `is_admin=true`-г **parameterized** UPDATE-аар
тавьж, дараагийн алхмуудыг хэвлэнэ. CLI-гүй хийх бол Supabase SQL Editor дээр:

```sql
update public.profiles set is_admin = true where email = 'YOUR_EMAIL';
```

`is_admin` / `status` / `role` талбарыг хэрэглэгч өөрөө өөрчлөх боломжгүй — урьдчилан сэргийлэх
trigger (`public.protect_profile_identity`) болон `public.is_admin()` функц `db/admin.sql`-д бий.

### 2. SQL ажиллуулах

```text
db/schema.sql   -- хүснэгт, функц, триггер
db/rls.sql      -- RLS бодлогууд
db/seed.sql     -- жишээ өгөгдөл (сонголтоор)
db/storage.sql  -- bucket + storage policy
db/admin.sql    -- админы хүснэгт/функц/RPC (idempotent)
```

Дараалал чухал: `admin.sql` нь `schema.sql`-ийн дараа.

**Холболтын хаяг (чухал, IPv4):** локал скриптүүд (`db:apply`, `admin:*`, `verify-*`)
эхлээд `DATABASE_POOLER_URL`-ийг ашиглана — Supabase Dashboard → **Connect → Session pooler →
URI** хаягыг хуулаад `.env.local`-д бичнэ үү (порт ихэвчлэн `6543`; хаяг дээр
`?sslmode=require` байхгүй бол нэмнэ). Энэ нь IPv4 зам тул шууд `DATABASE_URL`
(зарим төсөл дээр IPv6-г үнэндээ ашигладаг) илүү тогтвортой. `DATABASE_POOLER_URL` тавиагүй
бол скриптүүд хуучин `DATABASE_URL`-аараа ажиллана. Холболт амжилтгүй бол скрипт
**Supabase SQL Editor-д ажиллуулахад бэлэн SQL**-ийг хэвлээд зогсоно (хоосон мэдээлээр
амжилттай мэт харагдуулахгүй).

Шалгалт:

```bash
npm run db:apply        # SQL-ийг дараалан ашиглана
npm run admin:verify    # node scripts/verify-admin.mjs — админы эрхийн PASS/FAIL шалгалт
                        # (тестийн хаягуудыг random нууц үгтэйгээр үүсгэж, finally-д устгана)
```

### 3. Supabase Redirect URLs

Supabase Dashboard → **Authentication → URL Configuration** дээр дараах хаягуудыг нэмнэ
(Redirect URLs жагсаалт):

```text
https://baina.mn/**
https://admin.baina.mn/**
http://localhost:3000/**
http://admin.localhost:3000/**
```

Site URL: `https://baina.mn`. (Админ host зөвхөн нууц үг + MFA ашигладаг тул email-ийн
callback шаардлагагүй; гэхдээ URL жагсаалтад байх нь асуудалгүй.)

### 4. DNS + Vercel (нэг project, хоёр домэйн)

1. Vercel → Project → **Settings → Domains** дээр хоёр домэйныг нэмнэ:
   `baina.mn` (public) ба `admin.baina.mn` (admin). Хоёулаа нэг deployment-ийг заана.
2. DNS (домэйны бүртгэгч дээр):
   - `baina.mn` → `A 76.76.21.21` (Vercel-ийн default) эсвэл Vercel-ийн зааж өгсөн утга,
   - `www` → `A 76.76.21.21` (эсвэл `CNAME cname.vercel-dns.com`),
   - `admin` → `CNAME cname.vercel-dns.com` (subdomain тул CNAME).
3. Орчны хувьсагч (Production): `NEXT_PUBLIC_SITE_URL=https://baina.mn`,
   `NEXT_PUBLIC_ROOT_DOMAIN=baina.mn`, `NEXT_PUBLIC_ADMIN_HOST=admin.baina.mn`.
4. `admin.baina.mn` дээр TLS сертификат автоматаар үүснэ; домэйн бүр "Valid Configuration"
   болсны дараа л админ самбар нээгдэнэ.

### 5. MFA төхөөрөмжөө алдвал

- Supabase Dashboard → **Authentication → Users** → хэрэглэгч → **Factors** дээрээс тухайн
  TOTP factor-ыг устгана. Дараа нь админ самбарт нэвтэрч `/security` дээр шинээр тохируулна.
- Түр хугацаанд aal2 шаардлагыг сулруулах (зөвхөн шаардлагатай үед, дараа нь буцааж хаана):

  ```sql
  -- is_admin() функц aal2-гүйгээр true буцаадаг болгох (ТҮР, эрсдэлтэй):
  create or replace function public.is_admin()
  returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
  $$;
  ```

  Дараа нь `db/admin.sql`-ийг дахин ажиллуулж анхны (aal2 шаарддаг) хувилбарыг буцаана.

### 6. Admin самбарын бүтэц (урьдчилсан)

```text
src/app/admin/
  layout.tsx              # админ host-ийн root wrapper (noindex metadata)
  login/page.tsx          # /login  (host дээр)
  security/page.tsx       # /security — MFA (TOTP) тохируулах
  (panel)/                # requireAdmin() хаалттай хэсэг (shell)
    layout.tsx            # админ shell (icon rail + sidebar + top bar)
    page.tsx              # / — Хянах самбар
```

Бүх админ линк **root-relative** (`/users`), хэзээ ч `/admin/...` биш — `adminHref()` helper
(`src/lib/hosts.ts`) ашиглана. Нийтийн header дээр зөвхөн админд "Админ самбар" гэсэн линк
харагдаж, absolute URL-аар (`getAdminUrl('/')`) админ host руу заана.

## Аюулгүй байдлын үндсэн зарчим

- Мутаци бүр сервер дээр дахин баталгаажуулна (Zod) — клиентийн оруулгад итгэхгүй.
- Бүх мэдээлэл parameterized query (Supabase client) — SQL нэгтгэлгүй.
- RLS бүх хүснэгт дээр идэвхтэй; эзэмшил/ролийн шалгалт нэмэлтээр сервер дээр.
- Password: дор хаяж 8 тэмдэгт, үсэг + тоо; зөвхөн Supabase Auth хадгална.
- Хэрэглэгчийн текст React default escaping-ээр гарна; `dangerouslySetInnerHTML` ашиглана.
# Baina
