import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testPath = fileURLToPath(new URL('../supabase/tests/launch_security.sql', import.meta.url));
const container = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_Chromadie';
const result = spawnSync(
  'docker',
  ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres'],
  {
    input: readFileSync(testPath, 'utf8'),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  }
);

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.status !== 0) process.exit(result.status || 1);
