// Retries the fixture cleanup until it succeeds (the IPv6-only direct route to
// Supabase is intermittently unreachable). Runs in the background; writes to
// tmp/cleanup.log.
import { spawn } from 'node:child_process';

for (let i = 1; i <= 40; i += 1) {
  const ok = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['tmp/cleanup.mjs'], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
  if (ok) {
    console.log(`CLEANUP SUCCEEDED on round ${i}`);
    process.exit(0);
  }
  console.log(`round ${i}: not reachable yet, waiting 3 min...`);
  await new Promise((r) => setTimeout(r, 180_000));
}
console.log('CLEANUP STILL FAILING after 40 rounds');
process.exit(1);
