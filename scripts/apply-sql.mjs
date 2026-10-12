// Applies db/schema.sql -> db/rls.sql -> db/seed.sql in order.
// Usage: npm run db:apply
import { readFileSync } from 'node:fs';
import { connect } from './_db.mjs';

const FILES = [
  'db/schema.sql',
  'db/rls.sql',
  'db/seed.sql',
  'db/storage.sql',
  'db/admin.sql',
];

const client = await connect();
console.log('Connected to Postgres.');

try {
  for (const file of FILES) {
    const sql = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    console.log(`Applying ${file} ...`);
    await client.query(sql);
    console.log(`  OK: ${file}`);
  }
  console.log('\nAll SQL applied successfully.');
} catch (error) {
  console.error(`\nFAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
