// One-shot cleanup of the verify-admin.mjs fixture accounts (example.com).
// Bounded: connect() itself retries 6x with a 12s socket timeout.
import { connect } from '../scripts/_db.mjs';

for (let attempt = 1; attempt <= 2; attempt += 1) {
  try {
    const c = await connect();
    const before = await c.query(
      "select count(*)::int n from auth.users where email like 'verify-%@example.com'"
    );
    await c.query(
      "delete from auth.users where email like 'verify-admin-%@example.com' or email like 'verify-normal-%@example.com'"
    );
    const after = await c.query(
      "select count(*)::int n from auth.users where email like 'verify-%@example.com'"
    );
    const profiles = await c.query(
      "select count(*)::int n from public.profiles where email like 'verify-%@example.com'"
    );
    console.log(
      `attempt ${attempt}: before=${before.rows[0].n} after=${after.rows[0].n} profiles=${profiles.rows[0].n}`
    );
    await c.end();
    if (after.rows[0].n === 0 && profiles.rows[0].n === 0) {
      console.log('CLEANUP OK');
      process.exit(0);
    }
  } catch (error) {
    console.log(`attempt ${attempt}: ${error.message.slice(0, 80)}`);
  }
}
console.log('CLEANUP FAILED — run manually in the Supabase SQL editor');
process.exit(1);
