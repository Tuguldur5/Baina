// Creates a throwaway verify-admin-* fixture account so the admin CLI tools
// (make-admin / list-admins / cleanup-fixtures) can be tested end-to-end.
// Usage: node tmp/mk-user.mjs <email>
import { randomUUID } from 'node:crypto';
import { connect } from '../scripts/_db.mjs';

const email = process.argv[2];
if (!email) {
  console.error('usage: node tmp/mk-user.mjs <email>');
  process.exit(1);
}
const id = randomUUID();
const client = await connect();
try {
  await client.query(
    `insert into auth.users (
       instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, email_change, email_change_token_new, recovery_token
     ) values (
       '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
       $2, crypt($3, gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', $4, now(), now(), '', '', '', ''
     )
     on conflict (id) do nothing`,
    [id, email, `TmpTool-${randomUUID().slice(0, 8)}`, JSON.stringify({ name: 'Tmp Tool', role: 'user' })]
  );
  const check = await client.query(`select id from public.profiles where email = $1`, [email]);
  console.log(`CREATED ${email} profile=${check.rowCount === 1}`);
} finally {
  try {
    await client.end();
  } catch {
    /* closed */
  }
}
