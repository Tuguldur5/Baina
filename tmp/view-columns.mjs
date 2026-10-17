// TEMPORARY: proves the columns the admin list filters on really exist on the
// admin_profiles_meta view (a wrong column name would make supabase-js error
// and getAdminProfiles would silently return []).
// exit 0 = all filter columns present, 1 = missing, 2 = database unreachable.
import { connect } from '../scripts/_db.mjs';

const REQUIRED = ['role', 'is_admin', 'status', 'company_name', 'email_masked'];

let client;
try {
  client = await connect();
} catch (error) {
  console.error(`UNREACHABLE: ${error.message.split('\n')[0]}`);
  process.exit(2);
}

const res = await client.query(
  `select column_name from information_schema.columns where table_name = 'admin_profiles_meta'`
);
await client.end();

const found = new Set(res.rows.map((row) => row.column_name));
const missing = REQUIRED.filter((name) => !found.has(name));
console.log(`admin_profiles_meta columns: ${[...found].sort().join(', ')}`);
console.log(
  missing.length === 0
    ? `FILTER COLUMNS OK: ${REQUIRED.join(', ')}`
    : `MISSING: ${missing.join(', ')}`
);
process.exit(missing.length === 0 ? 0 : 1);
