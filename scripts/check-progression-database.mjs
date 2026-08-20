import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { reportSupabaseSqlResult, runSupabaseSqlFile } from './run-supabase-sql-test.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testPath = path.join(repoRoot, 'supabase', 'tests', 'progression_behavior.sql');

try {
  await access(testPath);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`Progression database behavior test is missing: ${path.relative(repoRoot, testPath)}`);
  } else {
    console.error(`Progression database behavior test could not be read: ${error.message}`);
  }
  process.exit(1);
}

const status = reportSupabaseSqlResult(runSupabaseSqlFile(testPath));
if (status !== 0) process.exit(status);
console.log('Progression database behavior checks passed.');
