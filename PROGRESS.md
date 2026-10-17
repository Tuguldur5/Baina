# PROGRESS.md — Тендер байна

Монгол хэл дээрх талын тендерийн маркетплейс. Энэ файл төслийн "санах ой" юм.

## Current status

### STEP 1 — «Компанийн сан»-ыг хассан (гүйцэтгэсэн)

- **Учир шалтгаан:** нийтийн компанийн санд жинхэнэ зориулалт байгаагүй (профайлууд
  world-readable биш тул агуулга үүсгэх боломжгүй байв, зөвхөн redirect л байсан).
- **Хассан:** header-ийн навигац (desktop pills + mobile panel — нэг `buildNavLinks`),
  `CommandSearch`-ийн хурдан холбоос, `mn.header.navCompanies` түлхүүр.
  `/companies/[id]` огт байгаагүй (зөвхөн redirect байсан), sitemap / dashboard /
  chatbot knowledge дээр `/companies` холбоос байгаагүй — урьдчилсан шалгалтаар
  баталсан (`grep` → 0).
- **Хадгалсан (зориуд):** `/companies` route өөрөө redirect хэвээр
  (`/tenders?owner=company`) — хуучин bookmark-ууд 404 болохгүй; метадата-г цэвэрлэсэн.
  АДМИН `/companies` хуудас (компаниудын жагсаалт) өөр зүйл — хэвээр үлдээсэн.
  Footer-ийн `/tenders?owner=company` холбоос («Компанийн тендерүүд») мөн хэвээр —
  энэ нь шүүлтүүр, сан биш.
- **Нэмсэн:** header навигац 2 л холбоостой үлдэх нь хэт хомс тул зөвхөн «Хэрхэн
  ажилладаг» (`mn.header.navHow`) нэмсэн → `/about#how`. `/about` дээр тэрхүү
  anchor-ийг үүсгэж, дугуйт дугаарын дараа байрлуулсан (`id="how"`, `scroll-mt-28`,
  `mn.landing.how.*` текстийг дахин ашигласан — шинэ текст зохиогүй). STEP 6-д
  EOI-тайгаар өргөтгөнө. Хэв/засвар дээр огт хүрээгүй (зөвхөн жагсаалтын массив).
- **Шалгалт:** `npx tsc --noEmit` 0 · `navCompanies`/public `/companies` холбоос 0.
  Chatbot-ийн мэдээлэл `src/lib/assistant/knowledge.ts`-д байдаг (задлалтын үеэр
  task-ийн `src/lib/chat/knowledge.ts` гэсэн зам буруу байв) — «Компанийн сан» тэнд
  байгаагүй, STEP 6-д EOI мэдээлэл нэмнэ.

- **Next: STEP 2** — DB бүтэц (tender_type/summary/scope/requirements/documents/
  evaluation_criteria/local_preference/language/duration/dates/has_attachments) +
  `public_tenders` + Zod + types + actions + seed.

- ✅ **S0 — Subdomain архитектур (admin.baina.mn)**: host-based routing, `(site)` route group,
  админ shell + login + MFA хуудас, README/SQL заавар.
- ✅ **S1 — Админ DB давхарга**: `is_admin()` дээр aal2 шаардлага нэмсэн (gap), `db/admin.sql`
  live DB дээр амжилттай apply болов, `node scripts/verify-admin.mjs` → **40/40 PASS**,
  `/about` + `/privacy` дээр операторын хандалтын мэдэгдэл нэмсэн, түр хязгаарлагдсан
  хэрэглэгч/бүртгэл хаалтын монгол мэдэгдэл + site_settings анхны утгууд.
- ✅ **PHASE 0 — Security cleanup + admin tooling** (шинэ):
  - `scripts/_db.mjs`: `DATABASE_POOLER_URL` (IPv4 session pooler) эхэлж ашиглана,
    үгүй бол `DATABASE_URL`; 12s socket timeout + 6 attempts + short backoff;
    амжилтгүй бол хэвлэх SQL-тэй мэдээлнэ. README + `.env.example`-д тайлбарласан.
  - `scripts/cleanup-fixtures.mjs` (`npm run admin:cleanup`): `verify-%` хаягийг устгаж
    0 үлдсэн эсэхийг баталгаажуулна (мөн урамшуулал SQL хэвлэнэ).
  - `scripts/verify-admin.mjs`: **random per-run нууц үг**, `finally` + SIGINT/SIGTERM дээр
    cleanup, төгсгөлд "zero verify-% rows" assert (FAIL бол `failed=true`).
  - `scripts/make-admin.mjs` (`npm run admin:make -- email`) — бүртгэлгүй бол татгалзаж,
    parameterized UPDATE, дараагийн алхмуудыг хэвлэнэ.
    `scripts/list-admins.mjs` (`npm run admin:list`) — маскласан имэйл.
  - `db/admin.sql` §15 fix: `to_jsonb(null::text)` = SQL NULL → NOT NULL зөрчлийг
    `'null'::jsonb`-оор засаж, `npm run db:apply` бүрэн амжилттай (site_settings seed).
  - Live DB: fixture хаяг **0 үлдсэн** (хуучин cleanup loop амжилттай), `ADMINS=0`.
  - `npx tsc --noEmit` 0 · `npm run lint` 0.
  - Агуулга: цэвэрлэгээ/баталгаажуулалтын скриптүүд энэ удаа DB хүрээгүй
    (flaky route) тул background loop (`tmp/tool-test.log`, `tmp/verify.log`)-оор
    `admin:cleanup` + `admin:verify` дахин ажиллаж байна — **verify 40/40 дахин
    баталгаажуулах шаардлагатай**.
- ✅ **ADMIN DESIGN REDO — A0 (засвар) + A1–A3 (шинэ)**:
  - **A0 (чухал засвар).** `src/lib/i18n/mn.ts` ажлын tree дээр **112 мөр болж
    тайрагдсан** байсан (HEAD дээр 841 мөр, 25 key group) → 23 syntax алдаа,
    `npx tsc` бүтэн улаан. HEAD-ээс сэргээж, тайрагдахад алга болсон бүх
    түлхүүрийг (`navDashboard`, `navCompanies`, `themeLabel`,
    `viewAllNotifications`, `searchCommand*`, `searchOpen`, `notSignedIn`,
    `suspended`, `registrationClosed`, `intent*`, `static.adminNotice`) болон
    шинэ `mn.admin.*` блокийг (rail/sidebar/tabs/activity/page/overview/login/
    otp/security) нэмсэн. Хуучирсан `src/lib/i18n/mn.types.ts` (хэн ч import
    хийдэггүй, хоёр хувилбартай ч таарахгүй) устгасан — `Mn` нь одоо
    `typeof mn`-ээс гарна. `src/lib/actions/auth.ts` дээрх давхардсан
    `updateProfile`/`logout` export + дутуу import (`updateProfileSchema`,
    `UserIntent`) зассан. **`npx tsc --noEmit` 0 · `npm run lint` 0.**
  - **A1 — токен + shell.** `.admin-theme` (globals.css) дор StarAdmin палитр:
    `--a-bg #F3F4F6`, `--a-panel #FFFFFF`, `--a-border #E8EAEE`, `--a-ink #1E1E2C`,
    `--a-muted #6B7280`, `--a-faint #F1F2F5`, `--a-primary #F29F67`,
    `--a-primary-tint #FDF1E7`, info `#3B8FF3` / success `#34B1AA` / warning
    `#E0B50F` / danger `#EF4444` + 4 soft tint. Публик токенд хүрээгүй (scoped,
    `color-scheme: light` — админ **зөвхөн light**). Tailwind-д `a-*` өнгө,
    `rounded-a`(10) / `a-card`(16) / `a-panel`(20), `shadow-a-soft`/`a-card`.
    `AdminShell`: `h-dvh` frame (хуудас өөрөө хэзээ ч scroll хийхгүй — зөвхөн
    main panel), rail 56px + (topbar 48px + sidebar 280px + main panel),
    main = `rounded-a-panel m-2 ml-0 overflow-y-auto`, дотор `max-w-[1280px]`
    төвлөрсөн, Ctrl/Cmd+B хумина.
  - **A2 — icon rail.** Лого плита (32px) + 7 icon (40px, tooltip, `aria-label`)
    — Хянах самбар/Тендер/Хэрэглэгч/Хяналт/Харилцаа/Систем/Тохиргоо; идэвхтэй
    = orange-tint дөрвөлжин + orange icon, hover = faint. Доод талд «Сайт руу
    буцах» + avatar (эхний үсэг) → цэс (Миний аюулгүй байдал, Гарах).
  - **A3 — жинхэнэ sub-menu (accordion).** `src/lib/admin/nav.ts` = цорын ганц
    эх сурвалж (rail + sidebar + tabs + palette бүгд уншина). 6 бүлэг /
    17 leaf, `ТЕНДЕР ПЛАТФОРМ` + `СИСТЕМ` гэсэн 2 section label, бүлэг бүр
    accordion (chevron эргэлдэнэ, Framer Motion height, зүүн талд нимгэн
    босоо шугам, 32px sub-item). Нээлттэй төлөв `localStorage` (try/catch),
    одоогийн бүлэг авто-нээлттэй, keyboard (Enter/Space, ↑↓, ←→,
    `aria-expanded`, `role="tree"`). Идэвхтэй sub-item = orange-tint + 2px
    orange зүүн accent; эцэг бүлэг дээр orange цэг.
- ✅ **ADMIN DESIGN REDO — A4 (chrome) + A5 (home) + бүх админ route (шинэ)**:
  - **A4.** `AdminShell` дээр top bar (sidebar toggle, **tab strip** — сессийн
    `sessionStorage`-д хадгалагдана, «+» → command palette, right panel toggle),
    мобайл drawer (rail + sidebar нэг slide-in панел), `AdminPageHeader`
    (breadcrumb + 22px гарчиг + underline page tabs), `AdminActivityPanel`
    (бодит `audit_logs`, 320px, xl дээр анимейшнтээр), `AdminCommandPalette`.
  - **A5.** `/` дээр watermarked мэндчилгээ, бодит баннер (гомдол/түдгэлзсэн тоо),
    `AdminOverviewComposer`, `AdminKpiStrip`, `AdminCharts` (SVG, хуурамч тоо байхгүй),
    `AdminWorkQueue`.
  - **Админ route-ууд бүрэн нээгдэв** (A4-ийн chrome-д зориулагдсан «target» хуудас
    байхгүй байсан → rail/sidebar/tabs/palette-ийн 17 leaf-ийн бүгд 404 байв).
    Бодит өгөгдөлтэй 5 хуудас: `/users` (server-side шүүлтүүр `/users?filter=user|company|admin`),
    `/companies`, `/tenders`, `/reports`, `/audit-log` — `src/lib/admin/queries.ts`-ийн
    `getAdminProfiles` (шүүлт нэмсэн), `getReports` (`entity_type`/`entity_id` нэмсэн),
    `getAdminTenders`, `getAuditLog`-ийг **анх удаа** ашиглаж байна.
    Үлдсэн 11 leaf-ийг `AdminSectionPlaceholder` (дээр дор хуваалцсан) + нарийн
    route файл (`/proposals`, `/categories`, `/notifications/{broadcast,announcements}`,
    `/chatbot`, `/system/{errors,performance,analytics,health}`,
    `/settings/{general,mode}`) — хуудасны бүтэц/эрх/холбоос бодит, агуулга дараагийн
    шатанд. Шинэ хүснэгт (`AdminTable` + `AdminStatusPill`) + `mn.admin.list.*` түлхүүрүүд.
  - **Шийдвэр: `[...slug]` catch-all-г туршиад устгасан.** `notFound()` нь
    (panel)-ийн async layout-ын shell-аа flush хийсний **дараа** дуудагдах тул Next
    **200** өгч байв (нутгийн шалгалтаар баталсан). Энгийн route файл нь path-ийг
    render-аас өмнө мэддэг тул үнэн **404** үлддэг — middleware-ийн гэрээнээс
    хамааран энэ нь чухал (admin host дээр танилдаагүй path → 404, хуурамч хэсэг биш).
    Тэгээд `nav.ts`-д нэмсэн `isAdminNavPath()`-ийг эргүүлж устгасан (хэрэглээгүй код).
  - **Засварууд:** `AdminKpiStrip` байхгүй `mn.currency` ашигласан байсан (`npx tsc`
    **1 алдаа**) → `formatMNT`/`formatNumber` (нутгийн `toLocaleString('mn-MN')` нь
    ICU-аас хамаарч hydration-ийн зөрүү үүсгэж болзошгүй тул); `AdminSidebar`-д
    `role="treeitem"` дээр `aria-selected` нэмсэн (jsx-a11y сануулга арилсан).
  - **Шалгалт (бодит aal2 админ сессиор, `next start`, `Host: admin.localhost`):**
    `tmp/verify-admin-ui.mjs` throwaway админ үүсгэж TOTP-оор aal2 болгон,
    `@supabase/ssr` cookie-г мөрдөж хуулан бүх route-ийг авч үзсэн → **26/26 PASS**:
    публик host дээр `/users` → 404 · session-гүй админ host `/tenders` → 307 `/login` ·
    `admin_stats()` → users=5, tenders=8, openReports=0 · `/` (A5 мэндчилгээ),
    `/users` ×4 шүүлт, `/companies`, `/tenders`, `/reports`, `/audit-log` → 200,
    placeholder-гүй · 11 placeholder → 200 · танилдаагүй path → **404** ·
    `admin-theme` + `aria-label="Хянах самбар"` байна · fixture цэвэрлэгээ
    `users=0 profiles=0 flaggedAdmins=0`. `tsc` 0 · `lint` 0 · `build` ✓ (38 route).
  - **Анхаар:** `docs/continuation-prompt.md` + `docs/admin-design-prompt.md`
    **энэ repo-д байхгүй** (disk дээр ч, git-д ч алга) → A1–A8-ийг код дэххийн
    `spec A*` тайлбар болон PROGRESS-аас сэргээсэн. A6/A7/A8-ийн бүрэн заавар
    шаардлагатай бол файлуудыг дахин олж авна уу.
- **Next: A6 (login/OTP)** — `AdminLoginForm`/`AdminMfaPanel` S0-оос байгаа, харин
  шинэчилж шалгаагүй (логины хуудас 200 гэдгийг л шалгасан). Дараа нь A7/A8
  (заавар файл байхгүй тул агуулгыг дахин тогтоох).
- **Next: админ дээрх үйлдлүүд** — placeholder-уудыг жинхэнэ хуудас болгох:
  `/users` дээр `admin_set_user_status` (түдгэлзүүлэх/сэргээх) + `admin_reveal_email`
  (audit-тай) үйлдлүүд, гомдол шийдвэрлэх (`reports.status` өөрчлөх),
  `admin_proposals_meta` дээрх саналын жагсаалт. Мөн **гомдол гаргах** нийтлэг
  зам байхгүй (`reports` үргэлж хоосон) — тэгээд `/reports` хуудас үүнийг
  хүлээцтэй харуулж байна.
- **Next: phase 2** — role-aware dashboard: `intent` + `saved_tenders` DB (rls/schema,
  apply), register-step «Та юу хийх вэ?», nested `/dashboard/*` routes + sidebar,
  adaptive overview, public `/companies` directory (replace the interim redirect),
  old-tab link/redirect updates.
- **Payments: planned later** (тухайн фазд төлбөртэй холбоотой юу ч хийхгүй).

### PHASE 1 — UI foundation ✅ (шилжүүлсэн)

- **Нэг `Container`** (`src/components/layout/Container.tsx`): `max-w-[1440px]`
  + `px-4 sm:px-6 lg:px-8 xl:px-10`, `as="section"` дэмжинэ. Ашигласан: header,
  footer, landing бүх section (Hero, StatsStrip, HowItWorks, FeaturedTenders,
  CategoriesGrid, Comparison, CtaBand), `/tenders`, `/tenders/[id]`, `/tenders/new`,
  `/dashboard(+loading)`, `/about|terms|privacy` (дотор нь унших нэг ширхэг
  `max-w-3xl` багана үлдсэн), `AuthShell`, `app/loading.tsx`.
- **Шинэ glass header** (`Header.tsx` бүрэн шинэчилсэн): `.glass-header` utility
  (globals.css, CSS хувьсагчаар: blur(24px) saturate(1.5), light
  `rgba(255,255,255,.60)` / dark `rgba(15,23,42,.55)` + inset highlight), Container
  өргөнтэй, `fixed top-3 z-40`, **56px → 52px scroll>8px** (анимац), dark-д
  мөөнөө харагдах border/shadow. Хуучин navy pill + homepage «blended» variant
  арилсан — бүх хуудас адилхан. Logo `variant` сэдэвийг дагана (light→ink,
  dark→white). Top-of-page navy gradient project дээр олдоогүй (zөвхөн header
  pill-ийн navy байсан — арилсан).
- **Header агуулга**: nav pills (Тендерүүд / Компанийн сан / Миний самбар —
  нэвтрээгүй бол `/auth/login?next=/dashboard`) `layoutId` идэвхтэй pill;
  search icon → **command overlay** (`CommandSearch`, Ctrl/⌘+K, Enter →
  `/tenders?q=`, focus trap + Esc + scroll lock); theme toggle (token-based);
  bell → dropdown-ийн **сүүлийн 5 мэдэгдэл + «Бүгдийг харах»**
  (`/dashboard/notifications`); улбар шар `+ Тендер үүсгэх` (мобайл дээр зөвхөн
  icon); avatar dropdown = хэрэглэгч блок (avatar, нэр, role badge, email),
  Миний самбар / Профайл / Админ самбар (absolute admin-host URL) / гарах —
  **давхардсан холбоосууд арилсан**; мобайл = лого + search + «+» + hamburger →
  анимейшнт **glass rounded-3xl панел** (route change/outside/Esc, scroll lock,
  focus trap). Z-index: header 40, панел 50, chat 55, modal 60, toast 70 (байсанчлан).
- **Backdrop**: `(site)` layout дээр нэг `fixed .site-backdrop` (дулаан улбар шар
  blob 12-14% + цэнхэр blob + mask fade dot grid, light/dark). Админ host дээр БАЙХГҮЙ.
- **Hydration засалт**: `DeadlineCountdown` одоо **секундгүй** (`2 хоног 04:15`),
  сервер дээр тогтмол placeholder (`—`), mount-ийн дараа л утга, **60с** шинэчилнэ;
  `formatDate/formatDateTime/formatDayMonth` одоо **Asia/Ulaanbaatar** фикст
  timezone + фикст locale-аар (сервер=клиент адил HTML).
- **Нэмэлт**: `getHeaderUser` одоо `email` буцаана (зөвхөн өөрийн dropdown-д),
  i18n шинэ түлхүүрүүд (`navDashboard`, `navCompanies`, `searchCommand*`,
  `viewAllNotifications`, `themeLabel`), `/companies` одоо **түр redirect**
  (`/tenders?owner=company`, noindex) — бодит directory = Phase 2.
- **Шалгалт**: `npx tsc --noEmit` 0 · `npm run lint` 0 · `npm run build` ✓ (22 route)
  · `npm start` дээр HTTP: `/ /tenders /about /companies` 200, `/dashboard` 307→login,
  `/admin` 404, админ host `/` 307→`/login` + `x-robots-tag`, HTML дээр
  `glass-header` + `site-backdrop` + `max-w-[1440px]` + countdown placeholder `—`
  байгааг баталгаажуулсан.

**PHASE 1 TODO (Phase 3-д шилжүүлсэн шийдвэрүүд)**: auth decorative panel-ийн
хуурамч `₮ 35,000,000` карт (Phase 3), «Кирилл/Латин» toggle (Phase 3),
TenderCard шинэчилж бүх query-д `description` нэмэх (Phase 3).

## Phase checklist

- ✅ **Phase 1** — Scaffold, хамаарал, Tailwind design tokens, `src/lib/i18n/mn.ts`, utils, `.env.example`, README
- ✅ **Phase 2** — DB: `db/schema.sql`, `db/rls.sql`, `db/seed.sql`, `db/storage.sql` + Supabase клиентүүд + Zod validator + TS тип + mappers
- ✅ **Phase 3** — UI kit (`components/ui/*` бүрэн) + `ThemeProvider` + root layout + `template.tsx` transition
- ✅ **Phase 4** — Header (navy pill + хайлс + мэдэгдлийн хонх), Footer, Landing бүх хэсэг, 404/error/loading
- ✅ **Phase 5** — Auth: register/login/forgot + **reset-password + callback**, middleware (session, `/dashboard` хамгаалалт, `next` redirect, rate limit)
- ✅ **Phase 6** — Tenders: жагсаалт (шүүлтүүр + хайлс + хуваалт), detail (шатлат мэдээлэл, шалгаруулах/ялагчаар сонгох/татгалзах), multi-step CreateTender + `/tenders/new`, server actions бүх business rules
- ✅ **Phase 7** — Dashboard 4 tab (тендер/санал/мэдэгдэл/профайл) + статистик карт + avatar upload
- ✅ **Phase 8** — Security headers, rate limiting, CORS, SEO (sitemap/robots/metadata), static хуудас, эцсийн QA

**Бүх 8 phase дууссан (Design override: цагаан-ногоо pill header + улбар шар #F59E0B өнгө + "Тендер байна" нэр).**

- ✅ **Phase 9** — Брэнд систем: лого дизайн (3 хувилбар → сонголт A), брэнд токенууд, `Logo` компонент, favicon (доор үзнэ үү)

## Төлөв (сүүлийн удаа шалгасан)

- `npx tsc --noEmit` ✅ (алдаагүй)
- `npm run lint` ✅ (ануулга/алдаагүй)
- `npm run build` ✅ (38 route: публик 20 + админ 17 + favicon)
- `node tmp/verify-admin-ui.mjs` ✅ (26/26 — бодит aal2 админ сессиор админ host-ын
  бүх route, placeholder, танилдаагүй path → 404, session-гүй → 307, публик → 404.
  DB-ийн шууд IPv6 маршрут нэг удаа тасарсан тул fixture цэвэрлэгээ дутсаныг
  `npm run admin:cleanup`-аар дахин цэвэрлэж `users=0 profiles=0 flaggedAdmins=0`-ийг
  `tmp/fixture-count.mjs`-ээр баталсан. `DATABASE_POOLER_URL` тохируулаагүй.)
- `npm run db:apply` ✅ (schema → rls → seed → storage, дахин ажиллуулахад аюулгүй)
- `npm run db:verify` ✅ (anon уншлага, FTS, нэвтрэлт, RLS block/allow, test row цэвэрлэгдэнэ)
- `npm run db:verify-rls` ✅ (нууц мэдээлэл anon/шалгаруулаагүй хэрэглэгчид хаалттай, эзэн/шалгарсан хэрэглэгчид нээлттэй)
- Dev server дээр бүх route 200 / 404 зөв, dev log дээр алдаагүй

## Route-ууд

| Route | Тайлбар |
| --- | --- |
| `/` | Landing: smart search hero, stats (бодит тоо), 4 алхам, шинэ тендерүүд, ангилал, харьцуулалт, CTA |
| `/tenders` | Жагсаалт: хайлс (debounce), ангилал/бүс нутаг/төлөв/зарлагч/төсөв шүүлтүүр, эрэмбэ, 12/хуудас |
| `/tenders/new` | Тендер үүсгэх 3 алхамт формын бүтэн хуудас (мобайл CTA) |
| `/tenders/[id]` | Дэлгэрэнгүй: нийтлэг + 🔒/解锁 нууц хэсэг, саналууд, шалгаруулалтын үйлдэл |
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | Бүртгэл/нэвтрэх (`?next=` дэмжинэ) |
| `/auth/reset-password` | Нууц үг сэргээх холбоосыг хүлээн авдаг (`?code=` / `?token_hash=`) |
| `/auth/callback` | Имэйл баталгаажуулалтын код солилцох |
| `/dashboard` | 4 tab: `?tab=tenders|proposals|notifications|profile` + статистик |
| `/about`, `/terms`, `/privacy` | Статик хуудас (шатлат мэдээллийн загвар тайлбарласан) |
| `404` | `/nonexistent` → "Хуудас олдсонгүй" (+ лого) |
| `/icon.svg` | Favicon (static, брэндийн тамгаас) |

## Структур

```text
db/            schema.sql, rls.sql, seed.sql, storage.sql   (бүгд IDEMPOTENT)
scripts/       apply-sql.mjs, verify-db.mjs, verify-rls.mjs, get-anon-key.mjs, _db.mjs
src/
  middleware.ts        session refresh + /dashboard хамгаалалт + rate limit (auth 5/мин/IP)
  app/                 layout, template(CSS transition), page, loading, error, not-found,
                       sitemap.ts, robots.ts, tenders/{page,[id],new}, auth/{login,register,
                       forgot-password,reset-password,callback}, dashboard, about|terms|privacy
  components/
    brand/             Logo (тогтмол "байна" тэмдэг + wordmark)
    ui/                Button, Input, Textarea, Select, Badge, Card, Modal, Toast, Tabs,
                       Avatar, Dropdown, ConfirmDialog, Pagination, Skeleton, Spinner, Loading, EmptyState, StaggerGrid
    layout/            Header, Footer, ThemeToggle
    landing/           Hero, StatsStrip, HowItWorks, FeaturedTenders, CategoriesGrid, Comparison, CtaBand
    auth/              AuthShell(split-screen), LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
    tenders/           TenderCard, TenderFilters, TenderListPagination, DeadlineCountdown,
                       TenderForm(3 алхам), CreateTenderModal, SubmitProposalModal,
                       TenderDetailSections, TenderDetailClient, ConfidentialPanel
    dashboard/         DashboardTabs, MyTendersTab, MyProposalsTab, NotificationsTab, ProfileTab
  lib/
    brand.ts           Брэнд салбарын config (нэг токен = нэг салбар) + BRAND_CORE_WORD
    i18n/mn.ts         БҮХ user-facing текст
    validators/        auth, tender(+region+нууц хэсэг), proposal, profile
    actions/           auth, tenders, profile, notifications (server actions)
    supabase/          client, server, middleware, queries (public_tenders view ашиглана)
    types/             index.ts + mappers.ts
```

## DB загвар (хоёр шатлалт мэдээлэл)

- `profiles` — RLS: зөвхөн өөрийнхөө мэдээлэл + өөрийн тендерийн оролцогчид + шалгарсан/сонгогдсон оролцогч эзний мэдээллийг уншина. **Дэлхийн уншлага байхгүй.**
- `tenders` — нийтлэг багана (description ≤600), `region`.
- `tender_private_details` — нууц багана: эзэн болон шалгарсан/сонгогдсон оролцогч уншина.
- `proposals` — pending / shortlisted / accepted / rejected + `updated_at` + UNIQUE(tender,bidder).
- `notifications` — зөвхөн SECURITY DEFINER триггер/функцээр үүснэ.
- `public_tenders` **view** (SECURITY DEFINER) — эзний нэрийг **дарсан** байдлаар (`mask_owner_name`) + эзний төрөл + саналын тоо. Жагсаалт/деталь энэ view-г уширана.
- RPC: `shortlist_proposal(uuid)`, `award_proposal(uuid)` — атомик, эзний эрхийг DB дээр шалгана.
- Storage: `avatars` (нийт уншлага), `tender-files` (**хувийн**, `tender_id/filename`; эзэн болон шалгарсан оролцогч signed URL-аар татна).
- Триггерүүд: шинэ санал → эзэнд мэдэгдэл; төлөв өөрчлөлт → оролцогчид мэдэгдэл; тендер хаагдах → бүх оролцогчид мэдэгдэл.

## Convention-ууд

- **Импорт alias**: `@/` → `src/`
- **i18n**: бүх текст `src/lib/i18n/mn.ts`-д. Компонент дээр string hardcoded хийхгүй.
- **Форм**: `react-hook-form` + Zod schema (`src/lib/validators/`), сервер дээр дахин `safeParse`.
- **Мутаци**: server actions → `ActionResult<T>` → `useToast()`-оор харуулна.
- **Төрөл**: DB row = snake_case, UI = camelCase → `lib/types/mappers.ts`.
- **Өгөгдөл унших**: Жагсаалт/деталь заавал `public_tenders` view (`getTenders`, `getFeaturedTenders`, `getTenderDetail`, `getMyTenders`). Шууд `profiles` уншихгүй.
- **Дизайн токен**: hex шууд ашиглахгүй → `bg-navy`, `text-primary-500`, `bg-info-50` гэх мэт.

## Env хувьсагчид (`.env.local` — нууцлана уу)

| Хувьсагч | Зориулалт |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase төслийн URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key |
| `NEXT_PUBLIC_SITE_URL` | SEO/sitemap үндсэн URL (default `http://localhost:3000`) |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | CORS зөвшөөрөгдсөн origin (`,` separator) |
| `DATABASE_URL` | Postgres холболт (зөвхөн `db:apply`/`db:verify` скриптүүдэд) |

## Ажиллуулах

```bash
npm install
npm run dev        # http://localhost:3000 (нэг instance — хоёр dev server зэрэг ажиллуулж болохгүй!)
npm run build && npm start
npm run db:apply      # SQL-ийг Supabase руу ашиглана (хоёр удаа ажиллуулахад аюулгүй)
npm run db:verify     # RLS + нэвтрэлт шалгалт
npm run db:verify-rls # Шатлат мэдээлэл RLS шалгалт
```

> **Анхаар:** `.next` папкийг хувааж хоёр `next dev` зэрэг ажиллуулбал EPERM/хуудас цэнхэртэх алдаа гарна. Нэг л процесс ажиллуулна уу.

## Seed тест бүртгэл (нууц үг: `Password123!`)

| Имэйл | Төрөл |
| --- | --- |
| `bolormaa@example.com` | Хувь хүн (2 тендер, 1 санал) |
| `ganbaatar@company.mn` | Компани — «Сайхан Барилга ХХК» (шалгарсан саналтай) |
| `temuulel@company.mn` | Компани — «Тэмүүлэл Логистик ХХК» |

8 тендер (бүх ангилал + бүс нутаг), 6 санал (1 shortlisted, 1 accepted).

## Known issues / deviations

- **API routes байхгүй**: бүх мутацийг **server actions** хэрэгжүүлсэн (RLS + Zod + ownership шалгалт ижил түвшинд). CORS `next.config.js`-д үлдсэн.
- **Rate limiting**: middleware дээрх in-memory bucket. Production-д Upstash Redis (эсвэл ижил түстэй store)-р солих хэрэгтэй (комменттой).
- **Мэдэгдлийн текстийг DB триггер бичнэ** (Монгол) — `type` код мөн байдаг тул UI-аас i18n-аар солих боломжтой.
- **`⌘K` хайлс**: header дээр фокуслодог (зөвхөн desktop).
- **"Компанийн сан" навигац**: `/tenders?owner=company` руу чиглэнэ (тусгай хуудасгүй).
- **Хавсралт файл**: 5 файл хүртэл, 10MB, `tender-files` bucket-д `{tender_id}/{цаг}` замаар; шалгарсан оролцогч signed URL-аар татна.

## Брэнд систем (лого)

**Нэр:** `Тендер байна` (жижиг үсгээр "байна", бүх газар ижил). Хуучин `Тендер Байна` /
`Тендер.mn` нэрсийг код, README, DB тайлбар/seed-ээс сольсон.

**Санаа:** брэнд бол `байна` ("байгаа / байна") гэсэн *тогтмол цөм* + *өөрчлөгддөг эхний үг*
(`Тендер` / `Зар` / `Ажил` / …). Тиймээс нэг систем: **тэмдэг нь тогтмол, зөвхөн нэг акцент
токен (өнгө) солигдоно.** Шинэ салбар нэмэхэд `src/lib/brand.ts`-д 1 мөр + `globals.css`-д 1 токен
нэмэхэд хангалттай — шинэ artwork шаардлагагүй.

**Лого тэмдэг (сонгосон — Option A "Байна тэмдэг"):** акцент өнгийн дугуй дөрвөлжин плита
дотор **«бн.»** — *байна* гэдэг үгийн товчлол. Үсгүүд нь **SVG текст** (гараар зурсан path биш),
тиймээс кирилл **б**-ийн хэлбэрийг фонт өөрөө өгнө. (Гараар зурах оролдлого бүр латин **P**
болж хувирдаг байсан — б нь аягаа ДООР, багана нь баруун талд дээш гарч зүүн тийш эргэдэг, P нь
яг эсрэгээрээ. Фонтоос авах нь цорын ганц найдвартай арга.)
Геометрийг Chrome дээр хэмжсэн: плита 42×42 дотор `бн.` нь 32.57 өргөн, зүүн/баруун зай
4.56 / 4.87 · дээд/доод зай 12.7 / 12.3 — босоо болон хэвтээ тэнцвэртэй.
16px favicon-оос эхлээд 64px хүртэл тодорхой харагдана.
Wordmark: `Тендер` (нейтрал/цагаан) + **`байна`** (extra-bold, акцент өнгө) — гэр бүлийн санааг
текстээр ч харуулна. 3 хувилбар, үндэслэл, сонголт бүгд `design/logo-options/` дотор.

**Салбарын өнгө (нэг токен = нэг салбар):** `--brand-tender` `#F59E0B` ·
`--brand-classified` `#14B8A6` (Зар) · `--brand-jobs` `#8B5CF6` (Ажил). Хар/цагаан контекстэд
ижил тэмдэг (акцент плита + цагаан `бн.`) ашиглана — тусад нь дахин будах шаардлагагүй.

**Файлууд:** `design/logo-options/{option-a,option-b,option-c}.{svg,png}`, +
`README.md` ба `generate.mjs` · `src/lib/brand.ts` · `src/components/brand/Logo.tsx` ·
`src/app/icon.svg` · `globals.css` + `tailwind.config.ts` токенууд ·
Header / Footer / AuthShell / 404 → `Logo` компонент ашиглана.

**Шийдвэрүүд / хазайлт:**
- `Logo` нь **server component** (framer-motion биш CSS hover) — reduced-motion хүндэтгэнэ.
- Wordmark дотор жинхэнэ space ашигласан (`Тендер байна` — screen reader зөв уншина).
- 320px дээр header-ийн wordmark `hidden sm:inline-flex`-ээр нуугдана (overflow-оос сэргийлнэ).
- Брэнд үгс нь `mn.ts`-д биш `src/lib/brand.ts`-д (SVG/OG/favicon-д хэрэгтэй). `mn.brand` дотор
  `core: 'байна'` + `prefix: 'Тендер'` нэмсэн.
- `info@tender.mn` холбоо барих хаягийг хэвээр үлдээсэн (энэ нь хаяг, брэндийн нэр биш).
- Chat widget байхгүй (STEP 5 хийгдээгүй) тул тэнд солих зүйл алга; sitemap-д брэндийн текст байхгүй.
- `apple-icon` / OG image зураг үүсгээгүй (зөвхөн `icon.svg`) — шаардвал нэмж болно.

## UI сайжруулалт (header nav / тендерийн филтр / карт)

**1. Header — үндсэн цэс төвд.** Бар нь `flex` биш **`grid grid-cols-[1fr_auto_1fr]`**
(брэнд | цэс | үйлдлүүд) болсон тул 3 үндсэн item яг төвд байрлана — 1024px ба 1440px дээр
`navCenter == barCenter` (хэмжсэн: 505/505, 713/713). 768px орчимд баруун талын үйлдлийн
товчнууд өргөн тул цэс «чөлөөт зайн төвд» байрлана (хамгийн ихдээ ~50px зүүн тийш) — давхцал
байхгүй. Мөн **давхар идэвхтэй төлөвийн алдаа** зассан: `NavLinks` нь query-г харгалзан
«хамгийн тодорхой тохирол ялна» дүрмээр нэг л item-ийг идэвхжүүлнэ (өмнө нь `/tenders` дээр
*Тендерүүд* ба *Компанийн сан* хоёулаа `aria-current="page"`-той байсан).

**2. Тендер хуудасны филтр — шинэ бүтэц.** Нэг карт дотор дээрээс доош:
хайлт (+ цэвэрлэх X) → *Эрэмбэ* select → **төлөвийн chips** (`Бүгд / Нээлттэй / Хаагдсан /
Шалгаруулагдсан`, `aria-pressed`) → бусад филтрүүд (ангилал, бүс нутаг, зарлагч, төсвийн
доод/дээд хэмжээ) — жижиг дэлгэцэд **"Илүү шүүлтүүр"** товчоор нээгдэнэ (badge-д идэвхтэй тоо),
768px-ээс дээш үргэлж харагдана. Сүүлд нь **идэвхтэй филтр бүр removable chip** болж харагдана
(`Төлөв: Нээлттэй`, `Доод хэмжээ: ₮ 5,000,000`, …) — хэрэглэгч яг юу шүүж байгаагаа харна.
Текстийн шинэ түлхүүрүүд: `mn.tenders.filters.{anyStatus, more, less, activeCount, chipRemove,
budgetRange, toggleLabel}`.

**3. Тендерийн карт — нэр нь гол, бусад нь хөнгөн.** Унших дараалал: ангилал·бүс нутаг — төлөв
→ **тендерийн НЭР** (`text-lg font-bold`, `line-clamp-2`) → 2 мөр тайлбар → 3 баганат шошготой
үзүүлэлтийн мөр (*Төсөв* | *Хугацаа* | *Санал*) → хамгийн доор, зориуд бүдэг (`text-xs text-muted`)
зарлагч + огноо. Картын дэвсгэр **градиент**: `globals.css` дахь `.card-gradient` нь
`--gradient-warm-card`-ийг ашиглана (light: цагаан → `#FFFBF0`, dark: `#111A2E` → `#18223A`) +
баруун дээд өнцөгт `bg-brand-tender/20` гэрэл + дээд талд 2px брэнд градиент зураас.

**3a. Картын үзүүлэлтийн мөрийн зэрэгцүүлэлт (зассан алдаа).** `ҮЛДСЭН ХУГАЦАА` гэсэн урт шошго
2 мөр болж хугарч, **тэр баганын утгыг бусдаас 16.5px доош** түлхэж байсан (хэмжсэн: 737.3 vs
753.8). Одоо: (1) шошго *Хугацаа* болж богинососон, (2) `dt` бүр `min-h-[33px] flex-col justify-end`
— хоёр мөр зай нөөцөлж, шошгыг доош нь тэгшлэв. Гурван мөрний гурван утга бүгд нэг шугамд:
753.8 / 1107.5 / 1461.3 (бүгд ижил), картын өндөр мөр тус бүрд 330px ижил (CDP хэмжилт).

**Шалгалт (production build, бодит Chrome/CDP):** `tsc` 0 · `lint` 0 · `build` амжилттай
(18 route, бүгд ƒ dynamic). Header цэс төвд (1024/1440: 505/505, 713/713) · давхар идэвхгүй ·
overflow 320/375/768/1024/1440 дээр 0 (`/`, `/tenders`, `/about`, `/tenders/[id]`) ·
статус chip дарахад `?status=open` + үр дүн 8→6 · chip хасахад URL цэвэрлэгдэнэ ·
төсвийн доод хэмжээ бичээд blur хийхэд `?min=5000000` + chip · `budgetHigh` эрэмбээр эхний карт
₮35,000,000 · картын дэвсгэр градиент (light ба dark хоёулаа) · mobile цэс (hamburger) хэвийн.

**Preview зураг:** `design/ui-preview/tenders-{desktop-1440,tablet-768,mobile-375,mobile-filters-open-375}.png`.

## UI сайжруулалт (2-р тойрог): hero, миний тендерүүд, саналын шаардлага, нууцлал

**4. Hero дэвсгэр — «булан будсан» биш, зохиосон гадаргуу.** Хуучин `--gradient-mesh` зөвхөн
булангуудыг буддаг байсан тул гол хэсэг (гарчиг, хайлтын талбар байгаа газар) хоосон, бүдэг
харагддаг байв. Одоо 3 давхарга: (1) дээд 560px-д **нарийн тор** (`hero-grid`, 60px нүд,
радиал маскаар голоос гадагш бүдгэрнэ), (2) **төвлөрсөн aurora** (`bg-hero`, 3 radial-gradient —
улбар гол + teal/violet мөр), (3) доод тал руу `bg` руу шилжих fade. Токенууд `.dark` дор
дахин тодорхойлогдсон. **Баталгаа (rendered pixel):** давхарга бүрийг `display:none` хийж
тэр бүсийн screenshot-ийн SHA1-ийг харьцуулсан — aurora байгаа/байхгүй: `c2aa79b3be4c` ↔
`43c088f9f667` (131,352B → 35,251B), тор байгаа/байхгүй: `c2aa79b3be4c` ↔ `d41b6ccd25e1`
(131,352B → 125,885B) — өөрөөр хэлбэл хоёулаа бодитоор пиксел буддаг.

**5. «Миний тендерүүд» — 4 статистик карт + компакт шүүлтүүр + уншигдах жагсаалт.**
Шүүлтүүрийн мөр нэг л карт дотор: хайлт (X-тэй) → төлөвийн chips (`Бүгд/Нээлттэй/Хаагдсан/
Шалгаруулсан`) → *Эрэмбэ* (шинэ/хугацаа/төсөв). Доор нь `12 тендер · 4 идэвхтэй` гэсэн хураангуй
+ шүүсэн үед `N тендер харагдаж байна` + *Шүүлт цэвэрлэх*. Жагсаалтын мөр: ангиллын плита →
гарчиг → ангилал·бүс·огноо → **«N санал» / «Санал ирээгүй»** тэмдэг (эзэнд хамгийн чухал тоо) →
баруун талд төсөв, үлдсэн хугацаа, төлөв, сум. Шүүлт/эрэмбэ нь **браузер дээр** (dashboard бүх
тендерийг аль хэдийн ачаалсан тул URL-аар явах нь зөвхөн latency нэмнэ). Шинэ түлхүүрүүд:
`mn.dashboard.myTenders.*`.

**6. Тендерийн нийтлэг тайлбар 600 → 2000 тэмдэгт.** Хоёр шатлалт загвар хэвээр (нууц хэсэг нь
`tender_private_details`), зөвхөн нийтлэг тайлбарын дээд хязгаарыг нэмэгдүүлсэн.

**6a. Анхны оролдлого дутуу байсан — форм дээр 600 хэвээр үлдсэн (зассан).** Эхний өөрчлөлтөд
зөвхөн Zod validator ба DB constraint-ыг 2000 болгосон боловч `TenderForm.tsx` доторх
`<textarea maxLength={600}>` болон `{descriptionLength}/600` тоолуур хэвээр байсан — өөрөөр хэлбэл
хэрэглэгч UI-аас 600-аас дээш бичих боломжгүй, шинэ хязгаар **хүрэхгүй** байв. Одоо нэг л эх
сувгаас: `TENDER_DESCRIPTION_MIN_LENGTH`/`MAX_LENGTH` (`src/lib/constants.ts`) → `validators/tender.ts`
(`.min/.max`) → `TenderForm.tsx` (`maxLength`, анхааруулах босго, тоолуурын хуваарь) →
`db/schema.sql` дэх `tenders_description_short_check` (constraint-ыг drop хийж дахин үүсгэдэг тул
аль хэдийн deploy хийсэн DB ч шинэ хязгаарт нийлнэ). Мөн нууц `fullDescription` (20000) нь
буруу мессеж (`descriptionMax` = 2000 гэж хэлдэг байсан)-ийг `fullDescriptionMax` болгож зассан.
**Баталгаа (built bundle):** `/tenders/new` нь нэвтрэлт шаарддаг тул форм руу browser-аар
оруулж шалгах боломжгүй — оронд нь production chunk-оос уншсан: `maxLength`, анхааруулах босго,
тоолуур бүгд **нэг** minifier тэмдэгт рүү заадаг (`D.wc`, `173-5249ab62178c532c.js` доторх
`wc:function(){return r}` ба `r=2e3`) — өөрөөр хэлбэл 2000, 600 гэсэн литерал хаана ч үлдээгүй.

**7. Санал илгээх — «ноцтой санал»-ын шаардлага + хавсралт файл.** Хуучин форм зөвхөн үнэ +
чөлөөт текст авдаг байсан тул нэг мөр «Би хийж чадна» гэсэн санал ч шатанд шилжих боломжтой байв.
Одоо (client **ба** server дээр давхар шалгана):
- **Үнийн санал** — заавал, 0-ээс их;
- **Гүйцэтгэх хугацаа (өдөр)** — заавал, 1..3650 (`proposals.duration_days`);
- **Ажлын төлөвлөгөө** — дор хаяж **50** тэмдэгт (өмнө 10), дээд тал 3000;
- **Хавсралт** — дор хаяж **1**, дээд тал 3 файл, 10MB, PDF/DOC/DOCX/XLSX/PNG/JPG.
Файл нь **private** `proposal-files` bucket-д `<tender_id>/<bidder_id>/<file>` замд орно
(`proposals.attachments` jsonb). Форм нь Modal дотроос FileList-ийг шууд харж, шаардлагын
жагсаалтыг ил харуулна; засах үед хавсралт өөрчлөгдөхгүй (хуучин объект orphan болохоос сэргийлж).
Хүлээн авсан санал дээр: үнэ, **хугацааны chip**, төлөвлөгөө, дараа нь **Оролцогчийн ирүүлсэн
бичиг** — гарын үсэгтэй (5 мин) URL-аар татна (`FileDownloadList`, `ConfidentialPanel`-тай
хуваалцсан).

**8. Гурван талын нууцлал — `SECURITY.md`.** Зарлагч / оролцогч / **платформын оператор**
гэсэн 3 талын харж болох/болохгүй зүйлийг хүснэгтээр, дараа нь дүрэм бүр хаана хэрэгжсэнийг
(RLS бодлогууд, `public_tenders` view + `mask_owner_name()`, 3 bucket-ийн policy, сервер талын
давхар шалгалт) бичсэн. Операторын хандалт **техникийн хувьд** хаалттай: апп ажиллах үед
`SUPABASE_SERVICE_ROLE_KEY` (RLS-ийг тойрох цорын ганц түлхүүр) огт хэрэглэгддэггүй —
`grep`-ээр бүх tree-д байхгүйг баталсан. Private bucket руу орох цорын ганц зам нь хугацаат
signed URL. **Нээлттэй асуулт:** зарлагч санал илгээсэн хүний профайл (нэр, компани, холбоо
барих) хэзээ харж эхлэх вэ — одоо санал ирмэгц; «битүүмжилсэн санал» болгох бол
`Owners can read bidders on own tenders` бодлогыг `shortlisted/accepted` болгож нарийсгах
хэрэгтэй (хэрэглэгчээс асууж байна).

**Шалгалт (production build, бодит Chrome/CDP):** `tsc` 0 · `lint` 0 · `build` амжилттай (18 route) ·
логоны `б` нь жинхэнэ текст (U+431, U+43D, U+2E; Inter, weight 800, fontLoaded ✓) · картын
3 утга нэг шугамд, мөр бүрийн өндөр 330px · hero-гийн хоёр давхарга пиксел буддаг (SHA1 харьцуулалт).
**Preview зураг:** `design/ui-preview/{tenders-light,tenders-dark,home-light,home-dark}.png`.
**Хязгаарлалт:** `/dashboard`-ыг нэвтрэлтгүйгээр browser-аар шалгах боломжгүй тул «Миний тендерүүд»-ийн
шинэ UI-г зөвхөн `tsc`+`build`-ээр баталсан; мөн `npm run db:apply` дахин ажиллуулж байж шинэ
constraint болон `proposal-files` bucket үүснэ.

## Админ самбар — S0 (subdomain архитектур)

**Шийдвэрүүд (асуулт асуухгүйгээр):**

1. **Аль замыг админ host дээр үзүүлэх вэ.** Нэг дүрэм: админ host дээр угтваргүй (`/`) бүх зам
   `src/app/admin/*` деректорийн харгалзах route руу `rewrite` хийнэ. Ингэснээр админд хамаарахгүй
   хуудсууд (`/about`, `/dashboard`, `/auth/login`, `/api/assistant`) нь **өөрөө 404** болно —
   тусад нь хориглох жагсаалт барих шаардлагагүй, мартах эрсдэл байхгүй. Зөвхөн framework-ийн
   дотоод зам (`/_next/*`), telemetry API (`/api/telemetry`) ба админы `robots.txt` л шууд өнгөрнө.
2. **Нийтийн host дээрх `/admin`.** "Байхгүй" гэдгийг илрүүлэхгүйн тулд ямар ч route-той таарахгүй
   зам руу `rewrite` хийж, Next-ийн өөрийн 404 хуудсыг **жинхэнэ 404 статустай** буцаана
   (баталгаа: `curl -H 'Host: localhost:3000' /admin` → `404`).
3. **Route group.** Нийтийн chrome (Header/Footer/Assistant) `src/app/(site)/layout.tsx` руу,
   админ shell `src/app/admin/(panel)/layout.tsx` руу шилжсэн тул root layout нь зөвхөн
   `html/body` + provider. URL өөрчлөгдөөгүй (`git mv` ашигласан). Админ login нь (panel) shell-ийн
   ГАДНА ("src/app/admin/login") — тэгэхгүй бол нэвтрэх хуудсаа өөрөө хаах байсан.
4. **Хаалт нь 2 давхарга.** Middleware дээр session-гүй бол шууд `307 → /login` (панелийн HTML
   огт илгээгдэхгүй), дараа нь `requireAdmin()` (src/lib/admin/require-admin.ts): нэвтрээгүй →
   `/login`, админ биш → **404** (403 биш — панель байгааг илрүүлэхгүй), aal1 → `/security`.
5. **Session тусдаа.** Бүх Supabase helper `domain` cookie тавихгүй (шалгасан) → админ ба нийтийн
   session зориуд тусдаа. "Гарах" нь `signOut({ scope: 'local' })` — нөгөө host-ийн session үлдэнэ.
6. **Админ хаяг бүр `adminHref()`/`getAdminUrl()`** (`src/lib/hosts.ts`): панель дотор зөвхөн
   root-relative зам, нийтийн header-ээс админ руу абсолют URL-аар шилжинэ.

**Файлууд:** `src/lib/hosts.ts` (шинэ) · `src/middleware.ts` (host routing + `X-Robots-Tag` +
`safeNextPath`) · `src/app/layout.tsx` (минимал болсон) · `src/app/(site)/layout.tsx` (шинэ) ·
`src/app/(site)/{page,tenders,auth,dashboard,about,terms,privacy}` (шилжүүлсэн, URL ижил) ·
`src/app/admin/{layout,login/page,security/page}.tsx` (шинэ) · `src/app/admin/(panel)/{layout,page}.tsx`
(шинэ) · `src/lib/admin/require-admin.ts` (шинэ) · `src/components/admin/{AdminLoginForm,
AdminLogoutButton,AdminMfaPanel}.tsx` (шинэ) · `src/app/robots.ts` (host мэдэрдэг) ·
`src/lib/supabase/queries.ts` (`getHeaderUser` → `isAdmin`) · `src/components/layout/Header.tsx`
(зөвхөн админд "Админ самбар") · `src/lib/i18n/mn.ts` (`admin` хэсэг) · `.env.example`, `README.md`.

**Баталгаа (production build + бодит HTTP хүсэлт):** нийтийн host дээр `/`, `/tenders`, `/about`,
`/terms`, `/privacy`, `/robots.txt`, `/auth/login` = **200**, `/admin`, `/admin/users` = **404**,
`/dashboard` = **307 → /auth/login?next=...**; админ host дээр `/` ба `/security` = **307 → /login**
(session-гүй үед), `/login` = **200**, `/about` `/dashboard` `/auth/login` `/admin` `/users` = **404**,
бүх админ хариулт `x-robots-tag: noindex, nofollow` + `x-middleware-rewrite: /admin...`; админы
`robots.txt` = `Disallow: /`, нийтийн нь хэвийн + `Sitemap`.

**Хязгаарлалт:** админ нэвтрэлт/`/security`/header-ийн "Админ самбар" линкийг бодит админ
хэрэглэгчгүйгээр шалгаагүй (DB дээр `is_admin = true` тавих шаардлагатай) — S1-ийн
`verify-admin.mjs` ба S2-ын гараар хийх шалгалтаар нөхнө.

## Админ самбар — S1 (DB давхарга + нууцлалын хатуужилт)

**`db/admin.sql`-ийн аудит (spec-тэй тулгасан):** бүх зүйл аль хэдийн бэлэн байсан —
`profiles.is_admin/status` + guard trigger, `audit_logs` (append-only триггер), `reports`
(нэг хэрэглэгч = нэг нээлттэй гомдол), `site_settings` + `public_settings` view (whitelist),
`categories` (8 угтвар), `announcements`, P1 унасан бодлогууд, `admin_proposals_meta`
(price/text **байхгүй**), `admin_profiles_meta` (мэйл дарсан, утас **байхгүй**) + `mask_email`,
`admin_reveal_email` (audit-тай), зогссон хэрэглэгчийн INSERT хориг, 8 RPC + `admin_stats()`.

**Нэгэн зүйл дутуу байсныг олж зассан — aal2 шаардлага:** `public.is_admin()` зөвхөн флагийг
шалгадаг байв. Одоо JWT-ийн `aal` claim бас шалгагдана: nuugt (password-only) session = aal1 →
алдаатай. Үүний ачаар "MFA зөвхөн UI-д" биш, **мэдээллийн баазын түвшинд** хүчинтэй болно.

**Шинээр нэмсэн (зассан):**
1. `db/admin.sql` §2 — `is_admin()` дээр `request.jwt.claims ->> 'aal' = 'aal2'` шалгалт.
2. `db/admin.sql` §15 — `site_settings` анхны утгууд (site_name, contact_email, maintenance_mode,
   registration_open, assistant_enabled, telemetry_retention_days) — `on conflict do nothing`.
3. `scripts/verify-admin.mjs` — **aal1 admin = эрхгүй** гэсэн 3 шинэ шалгалт + бодит MFA хуваалц
   (enroll → чалленж → RFC 6238 TOTP код `node:crypto`-оор гараар үүсгэнэ, нэмэлт хамааралгүй) →
   aal2 болсны дараа л бүх админ шалгалт явдаг болгосон. `scripts/_db.mjs` дээр
   `connectionTimeoutMillis: 12s` + 6 retry (хуучин нь OS-ийн ~2 мин timeout дээр гацдаг байв).
4. `src/lib/actions/auth.ts` — `site_settings.registration_open = false` үед бүртгэл **сервер дээр** хаагдана.
5. `src/lib/actions/tenders.ts` + `src/lib/i18n/mn.ts` — зогссон хэрэглэгч тендер/санал илгээхэд
   RLS-ийн түүхий алдаа биш монгол мэдэгдэл (`mn.errors.suspended`) гарна.
6. `/about`, `/privacy` — оператор нууц мэдээлэл харж чадахгүй гэсэн мэдэгдэл (info тэмдэглээ) —
   мөн `mn.static.adminNotice`.

**Баталгаа (`node scripts/verify-admin.mjs`, бодит Supabase дээр):** **ALL ADMIN CHECKS PASSED**
(40 PASS / 0 FAIL), т.х. `anon cannot read audit_logs`, `normal user cannot set own is_admin`,
`normal user cannot call admin_stats`, `audit_logs UPDATE/DELETE blocked`,
`aal1 admin cannot call admin_stats` (шинэ), `aal1 admin sees 0 rows in admin_profiles_meta`
(шинэ), `admin session upgraded to aal2 (TOTP verified)` (шинэ), `admin reads 0 rows from
tender_private_details / proposals(price,text) / notifications`, `tender-files signed URL denied`,
`admin_proposals_meta columns = bidder_id, created_at, id, status, tender_id`, `emails masked
(e.g. "b***@example.com")`, `admin_profiles_meta has no phone`, `reveal_email wrote an audit row`,
`admin_stats OK (users=5, tenders=8, openReports=0)`, `admin_set_user_status suspends (DB reflects)`.

**Нээлттэй асуудал (дараагийн удаа авна):
- Supabase-ийн шууд холболтын IPv6 маршрут энэ session-д интермитенттээр тасарсан (дахин
  холбогдож байна). `npm run db:apply` амжилттай явсан (§15 settings seed-ээс бусад),
  гэхдээ `verify-admin.mjs`-ийн **fixture account-ууд цэвэрлэгдээгүй** (verify-admin-*@example.com,
  is_admin=true). `tmp/finish-db.mjs` бичиж фонд руу тавьсан — сүлжээ эргэхэд 1) fixture-ийг
  устгана, 2) `db:apply` дахин ажиллуулна. Сүлжээ эргээгүй бол гараар: `npm run db:apply` + тэдгээр
  auth.users бүртгэлийг Supabase dashboard-оос устгана.
- Админ UI дээр бодит админ хэрэглэгчээр нэвтэрч шалгаагүй (MFA нэмэлт шаардлагатай).

## Next

**Next: S2** — `requireAdmin()`-ийг бүх admin page/action дээр хэрэглэх, админ сервер үйлдлүүд
(RPC + audit + typed result + Mongolian Zod errors), re-auth modal, 5/мин rate limit,
30 мин идэвхгүй хугацаа, last login харуулах.

### Нийтийн UX-ийн үлдэгдэл (TASK 1, дараа нь)

1. Chat widget (STEP 5) нэмбэл түүний гарчигт `Тендер байна` + `Logo`-г ашиглана,
2. `apple-icon.png` + OG image (`opengraph-image`) брэнд тэмдгээр үүсгэх,
3. Тендерийн дэлгэрэнгүй хуудасны *нийтлэг тайлбар* (2000 тэмдэгт хүртэл урт текст) хэсгийг
   уншихад хялбар бүтэцтэй болгох — том компаниудын загвараар **ажлын хамрах хүрээ / шаардлага /
   гүйцэтгэх хугацаа** гэсэн тусдаа талбарууд болгож задлах (одоогоор нэг догол мөр),
4. «Битүүмжилсэн санал»: зарлагч оролцогчийн мэдээллийг шалгаруулахаас өмнө харахгүй болгох эсэхийг
   шийдэж, RLS бодлогыг тааруулах,
5. Upstash Redis rate limiter суурилуулах.
