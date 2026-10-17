// TEMPORARY: reports leftover verify-% fixture rows.
// exit 0 = database clean, 1 = fixtures remain, 2 = database unreachable.
import { connect } from '../scripts/_db.mjs';

let client;
try {
  client = await connect();
} catch (error) {
  console.error(`UNREACHABLE: ${error.message.split('\n')[0]}`);
  process.exit(2);
}

const users = await client.query(`select count(*)::int as n from auth.users where email like 'verify-%'`);
const flagged = await client.query(
  `select count(*)::int as n from public.profiles where email like 'verify-%' and is_admin = true`
);
const profiles = await client.query(`select count(*)::int as n from public.profiles where email like 'verify-%'`);
await client.end();

const clean = users.rows[0].n === 0 && flagged.rows[0].n === 0 && profiles.rows[0].n === 0;
console.log(
  `fixtures: users=${users.rows[0].n} profiles=${profiles.rows[0].n} flaggedAdmins=${flagged.rows[0].n}`
);
process.exit(clean ? 0 : 1);
