import { readEnv, connect } from '../scripts/_db.mjs';

const env = readEnv();
const client = await connect();
import { readFile } from 'node:fs/promises';
const text = await readFile('tmp/single_policy.sql', 'utf8');

try {
  const r = await client.query(text);
  console.log('command:', r.command, 'rowCount:', r.rowCount, 'inserted ids:', (r.rows || []).map(x => x.id).join(','));
} catch (e) {
  console.log('QUERY ERROR:', e.message);
} finally {
  await client.end();
}
