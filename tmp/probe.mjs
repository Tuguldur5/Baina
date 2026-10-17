import { readEnv, connect } from '../scripts/_db.mjs';
try {
  const c = await connect();
  const u = await c.query(`select count(*)::int as n from auth.users where email like 'verify-%'`);
  const p = await c.query(`select count(*)::int as n from public.profiles where email like 'verify-%'`);
  const a = await c.query(`select count(*)::int as n from public.profiles where is_admin = true`);
  let ss = { n: -1 };
  try { ss = (await c.query(`select count(*)::int as n from public.site_settings`)).rows[0]; } catch (e) { console.log('site_settings err:', e.message); }
  console.log('FIXTURE_USERS=' + u.rows[0].n, 'FIXTURE_PROFILES=' + p.rows[0].n, 'ADMINS=' + a.rows[0].n, 'SITE_SETTINGS_ROWS=' + ss.n);
  await c.end();
} catch (e) { console.error('UNREACHABLE: ' + e.message); process.exit(1); }
