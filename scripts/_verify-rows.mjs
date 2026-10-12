// One-off verification of applied schema + seed via direct Postgres connection.
import { connect } from './_db.mjs';

const client = await connect();
try {
  const counts = await client.query(`
    select
      (select count(*) from public.profiles)  as profiles,
      (select count(*) from public.tenders)   as tenders,
      (select count(*) from public.proposals) as proposals,
      (select count(*) from auth.users)       as auth_users,
      (select count(*) from public.tenders where winner_proposal_id is not null) as awarded
  `);
  console.log('counts:', JSON.stringify(counts.rows[0]));

  const checks = await client.query(`
    select
      (select count(*) from pg_indexes where schemaname='public' and indexname='tenders_search_idx') as fts_index,
      (select count(*) from pg_policies where schemaname='public') as policies,
      (select count(*) from information_schema.tables where table_schema='public' and table_name in ('profiles','tenders','proposals')) as tables,
      (select count(*) from pg_proc where proname='close_expired_tenders') as close_fn,
      (select count(*) from pg_trigger where tgname='on_auth_user_created') as signup_trigger
  `);
  console.log('schema:', JSON.stringify(checks.rows[0]));

  const expired = await client.query('select public.close_expired_tenders() as closed');
  console.log('close_expired_tenders() ran, closed:', expired.rows[0].closed);
} finally {
  await client.end();
}
