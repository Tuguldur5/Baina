// Promotes an EXISTING registered user to admin.
// Usage: npm run admin:make -- you@example.com
//
// The flag alone is not enough: is_admin() in the database also requires an
// MFA session (aal2), so the printed next steps include TOTP enrollment.
// Parameterized query only; never prints secrets.
import { connect } from './_db.mjs';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: npm run admin:make -- you@example.com');
  process.exit(1);
}

const MANUAL_SQL = `-- Supabase SQL Editor (only if the direct route is unreachable):
update public.profiles set is_admin = true where email = '${email.replace(/'/g, "''")}';`;

let client;
try {
  client = await connect();
} catch (error) {
  console.error(`Cannot reach the database -> ${error.message}\n`);
  console.error(MANUAL_SQL);
  process.exit(1);
}

try {
  const existing = await client.query(
    `select id, is_admin, status from public.profiles where email = $1`,
    [email]
  );

  if (existing.rowCount === 0) {
    console.error(`No registered account found for ${email}.`);
    console.error('Register on the public site first, then re-run this command.');
    process.exit(1);
  }

  const { id, is_admin: isAdmin, status } = existing.rows[0];
  if (status === 'suspended') {
    console.error(`Account ${email} is SUSPENDED — activate it before granting admin.`);
    process.exit(1);
  }

  await client.query(`update public.profiles set is_admin = true where email = $1`, [email]);

  if (isAdmin) {
    console.log(`OK: ${email} was already an admin (flag re-applied).`);
  } else {
    console.log(`OK: ${email} is now an admin (id=${id}).`);
  }
  console.log('');
  console.log('Next steps:');
  console.log('  1. Open http://admin.localhost:3000/login (locally) or https://admin.baina.mn/login');
  console.log('  2. Sign in with the account password');
  console.log('  3. Complete MFA: open /security and enroll your authenticator app (TOTP)');
  console.log('     — without MFA the account has NO admin rights (DB requires aal2)');
  console.log('  4. List admins any time: npm run admin:list');
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
