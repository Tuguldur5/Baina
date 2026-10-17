// Lists current admins (id, masked email, created_at).
// Usage: npm run admin:list
import { connect } from './_db.mjs';

/** b***@domain.tld — never print a full email from a listing script. */
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

let client;
try {
  client = await connect();
} catch (error) {
  console.error(`Cannot reach the database -> ${error.message}`);
  console.error('Retry later, or run in the Supabase SQL Editor:');
  console.error(`  select id, email, created_at from public.profiles where is_admin = true;`);
  process.exit(1);
}

try {
  const res = await client.query(
    `select id, email, status, created_at
       from public.profiles
      where is_admin = true
      order by created_at asc`
  );

  if (res.rowCount === 0) {
    console.log('No admins yet. Create one:');
    console.log('  1. Register on the public site');
    console.log('  2. npm run admin:make -- you@example.com');
    console.log('  3. Log in on the admin host and enroll TOTP on /security');
  } else {
    console.log(`Admins (${res.rowCount}):`);
    for (const row of res.rows) {
      const created = new Date(row.created_at).toISOString().slice(0, 19).replace('T', ' ');
      console.log(
        `  - ${maskEmail(row.email)}  status=${row.status}  created=${created} UTC  id=${row.id}`
      );
    }
    console.log('\nNote: an admin only gets rights after completing MFA (TOTP on /security).');
  }
} catch (error) {
  console.error(`FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    await client.end();
  } catch {
    /* already closed */
  }
}
