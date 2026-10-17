// Finishes the two pending S1 database operations as soon as the flaky
// IPv6-only direct route recovers:
//   1. remove the verify-admin.mjs fixture accounts (example.com, is_admin)
//   2. apply db/admin.sql again so section 15 (default site_settings rows)
//      lands in the live database
// Logs progress to the console; exits when both are done.
import { spawn } from 'node:child_process';

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

for (let round = 1; round <= 40; round += 1) {
  console.log(`--- round ${round} ---`);
  const cleaned = await run(process.execPath, ['tmp/cleanup.mjs']);
  if (cleaned) {
    const applied = await run(process.execPath, ['scripts/apply-sql.mjs']);
    console.log(applied ? 'DB APPLY OK' : 'DB APPLY FAILED');
    process.exit(applied ? 0 : 1);
  }
  console.log('database still unreachable — retrying in 3 min');
  await new Promise((r) => setTimeout(r, 180_000));
}
console.log('GAVE UP after 40 rounds — run manually:');
console.log('  npm run db:apply   and delete the verify-%%@example.com auth users');
process.exit(1);
