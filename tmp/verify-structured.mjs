// TEMPORARY: proves the structured public tender fields landed correctly and
// that the CHECK constraints really reject bad data.
// exit 0 = all good.
import { connect } from '../scripts/_db.mjs';

let failed = false;
const ok = (msg) => console.log(`PASS: ${msg}`);
const bad = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const c = await connect();

const types = await c.query(
  `select tender_type, count(*)::int as n from public.tenders group by 1 order by 1`
);
console.log('tender_type counts:', JSON.stringify(types.rows));
if (types.rows.length !== 2) bad(`expected 2 tender types, got ${types.rows.length}`);
else ok('tender_type mix present (eoi + tender)');

const sums = await c.query(`
  select t.title,
         (select coalesce(sum((item->>'weight')::int), 0)
            from jsonb_array_elements(t.evaluation_criteria) item) as total,
         jsonb_array_length(t.evaluation_criteria) as criteria
    from public.tenders t
   where jsonb_array_length(t.evaluation_criteria) > 0
`);
for (const row of sums.rows) {
  if (Number(row.total) !== 100) bad(`criteria of "${row.title}" sum to ${row.total}`);
}
if (!sums.rows.some((r) => Number(r.total) === 100)) bad('no tender with criteria found');
else if (!failed) ok(`evaluation weights all sum to 100 (${sums.rows.length} tenders)`);

// Constraints must REJECT bad data.
async function mustReject(label, sql) {
  try {
    await c.query('begin');
    await c.query(sql);
    await c.query('rollback');
    bad(`${label} was ACCEPTED (constraint not enforced)`);
  } catch (error) {
    await c.query('rollback').catch(() => {});
    ok(`${label} rejected -> ${error.message.slice(0, 60)}`);
  }
}

await mustReject(
  'weights not summing to 100',
  `update public.tenders set evaluation_criteria = '[{"name":"a","weight":10}]'::jsonb
    where id = 'aaaaaaa1-0000-0000-0000-000000000001'`
);
await mustReject(
  'unknown tender_type',
  `update public.tenders set tender_type = 'bogus'
    where id = 'aaaaaaa1-0000-0000-0000-000000000001'`
);
await mustReject(
  'scope list with >15 items',
  `update public.tenders set scope_items =
     (select jsonb_agg('item ' || i) from generate_series(1, 16) i)
    where id = 'aaaaaaa1-0000-0000-0000-000000000001'`
);
await mustReject(
  'summary longer than 600 chars',
  `update public.tenders set summary = repeat('x', 601)
    where id = 'aaaaaaa1-0000-0000-0000-000000000001'`
);

// has_attachments must match the confidential attachments that exist.
const attach = await c.query(`
  select t.id, t.has_attachments,
         (select count(*)::int from public.tender_private_details d
           where d.tender_id = t.id and jsonb_array_length(d.attachments) > 0) as files
    from public.tenders t
   where t.id in ('aaaaaaa1-0000-0000-0000-000000000002',
                  'aaaaaaa1-0000-0000-0000-000000000008')
`);
for (const row of attach.rows) {
  const expected = Number(row.files) > 0;
  if (row.has_attachments !== expected) {
    bad(`has_attachments=${row.has_attachments} but files=${row.files} for ${row.id}`);
  }
}
if (!failed) ok('has_attachments agrees with the confidential attachments');

await c.end();
console.log(failed ? 'RESULT: FAIL' : 'RESULT: ALL PASS');
process.exit(failed ? 1 : 0);
