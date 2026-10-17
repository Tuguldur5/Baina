// Removes the leftover verify-admin.mjs fixture accounts (example.com) that
// carry is_admin=true and a shared password, plus any profiles row they left.
// Usage: npm run admin:cleanup
//
// Safe to run repeatedly: reports before/after counts and asserts that zero
// verify-% rows remain. If the DB is unreachable it prints the exact SQL to
// run manually in the Supabase SQL Editor instead of failing silently.
import { connect } from './_db.mjs';

const MANUAL_SQL = `-- Supabase SQL Editor: run this manually
update public.profiles set is_admin = false where email like 'verify-%';
delete from auth.users where email like 'verify-admin-%' or email like 'verify-normal-%';`;

async function counts(client) {
  const users = await client.query(
    `select count(*)::int as n from auth.users where email like 'verify-%'`
  );
  const profiles = await client.query(
    `select count(*)::int as n from public.profiles where email like 'verify-%'`
  );
  const flagged = await client.query(
    `select count(*)::int as n from public.profiles where email like 'verify-%' and is_admin = true`
  );
  return {
    users: users.rows[0].n,
    profiles: profiles.rows[0].n,
    flagged: flagged.rows[0].n,
  };
}

let client;
try {
  client = await connect();
} catch (error) {
  console.error(`CLEANUP: database unreachable -> ${error.message}\n`);
  console.error('Run this manually in the Supabase SQL Editor:\n');
  console.error(MANUAL_SQL);
  process.exit(1);
}

try {
  const before = await counts(client);
  console.log(
    `before: verify users=${before.users} profiles=${before.profiles} admin-flagged=${before.flagged}`
  );

  // Order matters: clear the flag first, then remove the auth rows (profiles
  // rows cascade from auth.users via the delete trigger / FK).
  await client.query(`update public.profiles set is_admin = false where email like 'verify-%'`);
  await client.query(
    `delete from auth.users where email like 'verify-admin-%' or email like 'verify-normal-%'`
  );

  const after = await counts(client);
  console.log(
    `after:  verify users=${after.users} profiles=${after.profiles} admin-flagged=${after.flagged}`
  );

  if (after.users === 0 && after.profiles === 0 && after.flagged === 0) {
    console.log('CLEANUP OK: zero verify-% rows remain.');
  } else {
    console.error('CLEANUP INCOMPLETE — rows remain. Run the manual SQL:\n');
    console.error(MANUAL_SQL);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`CLEANUP FAILED: ${error.message}\n`);
  console.error('Run this manually in the Supabase SQL Editor:\n');
  console.error(MANUAL_SQL);
  process.exitCode = 1;
} finally {
  try {
    await client.end();
  } catch {
    /* already closed */
  }
}
