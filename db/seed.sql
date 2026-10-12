-- ============================================================================
-- Тендер байна — DEV SEED DATA (safe to re-run; wipes only the 3 test accounts)
-- Run order: schema.sql -> rls.sql -> seed.sql -> storage.sql
-- Test accounts (email / password):
--   bolormaa@example.com       / Password123!   (Хувь хүн)
--   ganbaatar@company.mn       / Password123!   (Компани)
--   temuulel@company.mn        / Password123!   (Компани)
-- ============================================================================

-- Clean previous seed (cascades to profiles -> tenders -> private details ->
-- proposals -> notifications)
delete from auth.users
 where email in ('bolormaa@example.com', 'ganbaatar@company.mn', 'temuulel@company.mn');

-- ---------------------------------------------------------------------------
-- auth users (trigger on_auth_user_created auto-creates matching profiles)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'bolormaa@example.com',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Болормаа","role":"user"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'ganbaatar@company.mn',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Ганбаатар","role":"company","company_name":"Сайхан Барилга ХХК"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'temuulel@company.mn',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"name":"Тэмүүлэл","role":"company","company_name":"Тэмүүлэл Логистик ХХК"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- email identities (required for email/password sign-in)
insert into auth.identities (
  id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, 'email', u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
  from auth.users u
 where u.email in ('bolormaa@example.com', 'ganbaatar@company.mn', 'temuulel@company.mn')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- profiles (created by trigger; fill a few extra fields)
-- ---------------------------------------------------------------------------
update public.profiles set phone = '99112233'
 where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set phone = '99223344'
 where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set phone = '99334455'
 where id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- tenders (8 across categories and regions; public description <= 600 chars)
-- ---------------------------------------------------------------------------
insert into public.tenders (
  id, title, description, category, budget, currency, region, status, deadline,
  created_by_user_id, created_at
) values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   'Гэрийн засвар үйлчилгээ',
   'Баянзүрх дүүргийн 3-р хороонд байрлах 3 өрөө орон сууцны засвар үйлчилгээ: өрөөнүүдийг будаж, шал цутгаж, цонхны модыг солих шаардлагатай.',
   'Барилга', 2500000, 'MNT', 'Улаанбаатар', 'open', now() + interval '14 days',
   '11111111-1111-1111-1111-111111111111', now() - interval '2 days'),
  ('aaaaaaa1-0000-0000-0000-000000000002',
   'Вэбсайт хийлгэх',
   'Зоогийн газрын онлайн захиалгатай вэбсайт хэрэгтэй: меню үзүүлэх, захиалга авах админ панелтай байх.',
   'Технологи', 4800000, 'MNT', 'Улаанбаатар', 'open', now() + interval '21 days',
   '11111111-1111-1111-1111-111111111111', now() - interval '1 day'),
  ('aaaaaaa1-0000-0000-0000-000000000003',
   'Барилгын материал нийлүүлэлт',
   '20,000 шоо метр элс, 5,000 шоо метр чулуу, 300 тонн цементийг Улаанбаатар хот руу нийлүүлэх шаардлагатай.',
   'Барилга', 35000000, 'MNT', 'Улаанбаатар', 'open', now() + interval '10 days',
   '22222222-2222-2222-2222-222222222222', now() - interval '3 days'),
  ('aaaaaaa1-0000-0000-0000-000000000004',
   'Оффисын тавилга худалдан авалт',
   '20 ажлын байранд зориулсан ширээ, сандал, шүүгээ худалдан авна. Чанарын баталгаа, угсралтын үйлчилгээтэй байхыг шаардана.',
   'Худалдаа', 12000000, 'MNT', 'Улаанбаатар', 'open', now() + interval '7 days',
   '22222222-2222-2222-2222-222222222222', now() - interval '4 days'),
  ('aaaaaaa1-0000-0000-0000-000000000005',
   'Ачааны машин тээвэрлэлт',
   'Улаанбаатараас Дархан хот хүртэл ачаа тээвэрлэлт хийх шаардлагатай. 20 тонн ачаа, тусгай хамгаалалттай.',
   'Тээвэр', 8000000, 'MNT', 'Дархан-Уул', 'open', now() + interval '5 days',
   '33333333-3333-3333-3333-333333333333', now() - interval '2 days'),
  ('aaaaaaa1-0000-0000-0000-000000000006',
   'Маркетингийн үйлчилгээ',
   'Шинэ гар утасны аппликейшнийг сурталчлах сошиал медиа маркетингийн кампанит ажил: контент бэлтгэх, зар сурталчилгаа удирдах.',
   'Үйлчилгээ', 6500000, 'MNT', 'Орхон', 'open', now() + interval '30 days',
   '11111111-1111-1111-1111-111111111111', now() - interval '6 hours'),
  ('aaaaaaa1-0000-0000-0000-000000000007',
   'Сурагчдын сургалтын хэрэгсэл',
   'Бага ангийн 300 сурагчдад зориулсан сургалтын хэрэгсэл (ном, дэвтэр, бичгийн хэрэгсэл) худалдан авна.',
   'Боловсрол', 3200000, 'MNT', 'Хөвсгөл', 'closed', now() - interval '3 days',
   '22222222-2222-2222-2222-222222222222', now() - interval '20 days'),
  ('aaaaaaa1-0000-0000-0000-000000000008',
   'Эмнэлгийн тоног төхөөрөмж',
   'Хувийн эмнэлэгт зориулсан оношилгооны тоног төхөөрөмж нийлүүлэх: шинжилгээний аппарат, кабинетын тоног хэрэгсэл.',
   'Эрүүл мэнд', 25000000, 'MNT', 'Өмнөговь', 'awarded', now() - interval '1 day',
   '33333333-3333-3333-3333-333333333333', now() - interval '15 days')
on conflict (id) do nothing;

-- Backfill region for rows created by an older version of this seed
update public.tenders t set region = v.region
from (values
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Улаанбаатар'),
  ('aaaaaaa1-0000-0000-0000-000000000002', 'Улаанбаатар'),
  ('aaaaaaa1-0000-0000-0000-000000000003', 'Улаанбаатар'),
  ('aaaaaaa1-0000-0000-0000-000000000004', 'Улаанбаатар'),
  ('aaaaaaa1-0000-0000-0000-000000000005', 'Дархан-Уул'),
  ('aaaaaaa1-0000-0000-0000-000000000006', 'Орхон'),
  ('aaaaaaa1-0000-0000-0000-000000000007', 'Хөвсгөл'),
  ('aaaaaaa1-0000-0000-0000-000000000008', 'Өмнөговь')
) as v(id, region)
where t.id::text = v.id and t.region is distinct from v.region;

-- ---------------------------------------------------------------------------
-- tender_private_details (stage-2 confidential information)
-- ---------------------------------------------------------------------------
insert into public.tender_private_details (
  tender_id, full_description, requirements, address,
  contact_name, contact_phone, contact_email, attachments
) values
  ('aaaaaaa1-0000-0000-0000-000000000001',
   'Бүрэн засварын ажилд 3 ажилтан, 1 мастертай баг ажиллана. Материалыг бид өөрсдөө худалдан авна. Ажил эхэлснээс хойш 21 хоногийн дотор дуусгана. Гэрээ байгуулахдаа 30% урьдчилгаа төлнө.',
   '1. Будгийн ажил — Tikkurila эсвэл ижил түвшний брэнд\n2. Шалны хавтан — GERFLOR / ижил түвшний\n3. Ажил дууссанд баталгаа 12 сар\n4. Нэмэлт материал багтахгүй',
   'Улаанбаатар хот, Баянзүрх дүүрэг, 3-р хороо, 15-р байр, 34-р тоот',
   'Болормаа', '99112233', 'bolormaa@example.com', '[]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000002',
   'Вэбсайт нь монгол хэл дээр, mobile-д ээлтэй байх ёстой. Бидэнд 2400+ бүтээгдэхүүн, 12 менюгүй төрөл байна. Дизайныг манай багтай хамтран гаргана.',
   '1. Stack: Next.js + TypeScript + Tailwind\n2. Админ панель (захиалга, бүтээгдэхүүн)\n3. QR төлбөрийн холболт (SocialPay)\n4. Хурдан ачаалалт (LCP < 2.5s)\n5. 1 жилийн техникийн дэмжлэг',
   'Улаанбаатар хот, Сүхбаатар дүүрэг, Сөүлийн гудамж 42, Ico Tower 8-р давхар',
   'Болормаа', '99112233', 'bolormaa@example.com',
   '[{"name":"tech-spec.pdf","path":"aaaaaaa1-0000-0000-0000-000000000002/tech-spec.pdf"}]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000003',
   'Нийлүүлэлтийг 4 удаагийн ээлжээр хийнэ: сар бүр 5,000 шоо метр элс, 1,250 шоо метр чулуу, 75 тонн цемент. Бүх ачааг бетон зуурмагийн үйлдвэрт шууд хүргэнэ.',
   '1. Элс — мөрний, угаасан, шүүсэн\n2. Чулуу — 5-20 мм фракц\n3. Цемент — CEM II/A 42.5\n4. Тээврийн баримт бүрдүүлнэ\n5. Хүргэлт 07:00-18:00 хооронд',
   'Улаанбаатар хот, Хан-Уул дүүрэг, Үйлдвэрлэлийн 14-р гудамж, “Тэгш Бетон” үйлдвэр',
   'Ганбаатар', '99223344', 'ganbaatar@company.mn', '[]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000004',
   'Оффисын шинэ байранд зориулсан тавилга: 20 ширхэг ширээ (1600×800), 20 ширхэг эргэдэг сандал, 12 ширхэг шүүгээ, уулзалтын 1 ширхэг ширээ (6 хүний). Угсралтыг нийлүүлэгч хийнэ.',
   '1. Мод — 18мм зөөлөн модон плита\n2. Утасгүй цэнэглэлттэй ширээний бүрээс\n3. 5 жилийн баталгаа\n4. Угсралт + хүргэлт үнэд багтана',
   'Улаанбаатар хот, Чингэлтэй дүүрэг, Барилгачдын 33-р гудамж, Sky Residence, 12-р давхар',
   'Ганбаатар', '99223344', 'ganbaatar@company.mn', '[]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000005',
   'Улаанбаатар → Дархан чиглэлд 20 тонн хүнд даацын ачаа (цемент) тээвэрлэнэ. Сард 4 удаа. Ачааг Улаанбаатарын агуулахаас авч, Дарханы үйлдвэрт хүргэнэ.',
   '1. Ачааны машин — нойл хамгаалалттай\n2. Жолооч — 5+ жилийн туршлага\n3. Даатгалтай\n4. Хүргэлтийн баримт бүрдүүлнэ',
   'Улаанбаатар хот, Баянзүрх дүүрэг, Агаарын тээврийн 1-р гудамж, Агуулах №4',
   'Тэмүүлэл', '99334455', 'temuulel@company.mn', '[]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000006',
   '3 сарын хугацаатай сошиал медиа кампанит ажил: Instagram, Facebook, TikTok. 120 пост, 30 reels, 6 удаагийн live. Нэмэлтэнд зар сурталчилгааны бүрэн удирдлага.',
   '1. Контент төлөвлөгөө (сар бүр)\n2. График дизайн (Canva/Figma)\n3. Хэрэглэгчийн тохирсон 25+ насны хүрээ\n4. Сар тутмын тайлан (reach, engagement)\n5. Монгол/Англи хоёр хэл дээр',
   'Орхон аймаг, Эрдэнэт хот, Баянбулагийн 7-р байр, “Медиа Хөгжил” Оффис',
   'Болормаа', '99112233', 'bolormaa@example.com', '[]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000007',
   '300 сурагчдад зориулсан багцыг нэг удаа худалдан авна: дүрмэвтэй толь, математикийн дэвтэр, бал, өнгөт зураас, хэрэглэлүүд.',
   '1. Багц дүрмэвтэй толь 1 ширхэг\n2. А4 дэвтэр 5 ширхэг\n3. Бал 10 ширхэг\n4. Нийт 300 багц\n5. 7 хоногийн дотор хүргэх',
   'Хөвсгөл аймаг, Мөрөн сум, Боловсролын газар, 2-р сургууль',
   'Ганбаатар', '99223344', 'ganbaatar@company.mn', '[]'::jsonb),

  ('aaaaaaa1-0000-0000-0000-000000000008',
   'Хувийн эмнэлэгт зориулсан оношилгооны тоног төхөөрөмж: цус шинжилгээний анализатор, УТТ аппарат, зөөврийн кардиограф. Угсралт, ашиглалтын сургалт шаардлагатай.',
   '1. CE баталгаатай\n2. Монгол хэлний заавар, интерфэйс\n3. 2 жилийн баталгаа\n4. Техникч 2 удаа ирж сургалт явуулна\n5. Засвар үйлчилгээний гэрээ',
   'Өмнөговь аймаг, Даланзадгад сум, “Говийн Эрүүл Мэнд” ХХК, 1-р давхар',
   'Тэмүүлэл', '99334455', 'temuulel@company.mn', '[]'::jsonb)
on conflict (tender_id) do update
  set full_description = excluded.full_description,
      requirements = excluded.requirements,
      address = excluded.address,
      contact_name = excluded.contact_name,
      contact_phone = excluded.contact_phone,
      contact_email = excluded.contact_email,
      attachments = excluded.attachments;

-- ---------------------------------------------------------------------------
-- proposals (6; unique per tender+bidder, never on own tender)
-- One proposal is shortlisted to demonstrate stage-2 access.
-- ---------------------------------------------------------------------------
insert into public.proposals (
  id, tender_id, bidder_id, price_offer, proposal_text, status, created_at
) values
  ('bbbbbbb1-0000-0000-0000-000000000001',
   'aaaaaaa1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
   2300000, 'Бид 10 жилийн туршлагатай багаар ажиллана. Материалыг 3 хоногийн дотор бүрэн шийдвэрлэнэ.',
   'pending', now() - interval '1 day'),
  ('bbbbbbb1-0000-0000-0000-000000000002',
   'aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   2450000, 'Манай компанийн мэргэжилтнүүд 7 хоногийн дотор ажлыг бүрэн гүйцэтгэнэ. 1 жилийн баталгаа өгнө.',
   'shortlisted', now() - interval '18 hours'),
  ('bbbbbbb1-0000-0000-0000-000000000003',
   'aaaaaaa1-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   4500000, 'Next.js + React дээр хурдан, mobile-д ээлтээ вэбсайт хийнэ. Админ панель, онлайн захиалгыг багтаана.',
   'pending', now() - interval '12 hours'),
  ('bbbbbbb1-0000-0000-0000-000000000004',
   'aaaaaaa1-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
   33000000, 'Бид өөрийн ачааны паркаар бүх материалыг хугацаанд нь хүргэнэ. Үнийн саналдаа тээврийн зардлыг багтаасан.',
   'pending', now() - interval '2 days'),
  ('bbbbbbb1-0000-0000-0000-000000000005',
   'aaaaaaa1-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   11000000, 'Чанартай модон тавилга нийлүүлнэ. Үнэ болон чанараараа өрсөлдөхөд бэлэн.',
   'pending', now() - interval '1 day'),
  ('bbbbbbb1-0000-0000-0000-000000000006',
   'aaaaaaa1-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222',
   24000000, 'Бид эмнэлгийн тоног төхөөрөмжийн албан ёсны борлуулагч юм. Угсралт, сургалтыг багтаасан.',
   'accepted', now() - interval '10 days')
on conflict (id) do nothing;

-- mark the winner on the awarded tender
update public.tenders
   set winner_proposal_id = 'bbbbbbb1-0000-0000-0000-000000000006'
 where id = 'aaaaaaa1-0000-0000-0000-000000000008';

-- ---------------------------------------------------------------------------
-- dev notifications (demonstrates the bell / notifications tab)
-- ---------------------------------------------------------------------------
insert into public.notifications (id, user_id, type, title, body, link, read, created_at)
select gen_random_uuid(), u.id, 'welcome', 'Тавтай морилно уу',        'Тендер байна платформд тавтай морилно уу. Профайлаа бөглөн эхлэнэ үү.',
       '/dashboard', false, now()
  from auth.users u
 where u.email = 'bolormaa@example.com'
   and not exists (
     select 1 from public.notifications n
      where n.user_id = u.id and n.type = 'welcome'
   );
