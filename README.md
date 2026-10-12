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

## Аюулгүй байдлын үндсэн зарчим

- Мутаци бүр сервер дээр дахин баталгаажуулна (Zod) — клиентийн оруулгад итгэхгүй.
- Бүх мэдээлэл parameterized query (Supabase client) — SQL нэгтгэлгүй.
- RLS бүх хүснэгт дээр идэвхтэй; эзэмшил/ролийн шалгалт нэмэлтээр сервер дээр.
- Password: дор хаяж 8 тэмдэгт, үсэг + тоо; зөвхөн Supabase Auth хадгална.
- Хэрэглэгчийн текст React default escaping-ээр гарна; `dangerouslySetInnerHTML` ашиглана.
# Baina
