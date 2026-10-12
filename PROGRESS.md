# PROGRESS.md — Тендер байна

Монгол хэл дээрх талын тендерийн маркетплейс. Энэ файл төслийн "санах ой" юм.

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
- `npm run build` ✅ (16 route)
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

## Next

1. Chat widget (STEP 5) нэмбэл түүний гарчигт `Тендер байна` + `Logo`-г ашиглана,
2. `apple-icon.png` + OG image (`opengraph-image`) брэнд тэмдгээр үүсгэх,
3. Тендерийн дэлгэрэнгүй хуудасны *нийтлэг тайлбар* (2000 тэмдэгт хүртэл урт текст) хэсгийг
   уншихад хялбар бүтэцтэй болгох — том компаниудын загвараар **ажлын хамрах хүрээ / шаардлага /
   гүйцэтгэх хугацаа** гэсэн тусдаа талбарууд болгож задлах (одоогоор нэг догол мөр),
4. «Битүүмжилсэн санал»: зарлагч оролцогчийн мэдээллийг шалгаруулахаас өмнө харахгүй болгох эсэхийг
   шийдэж, RLS бодлогыг тааруулах,
5. Upstash Redis rate limiter суурилуулах.
