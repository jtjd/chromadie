import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { reportSupabaseSqlResult, runSupabaseSqlFile } from './run-supabase-sql-test.mjs';

const testPath = fileURLToPath(new URL('../supabase/tests/profile_insights_integrity.sql', import.meta.url));
const status = reportSupabaseSqlResult(runSupabaseSqlFile(path.resolve(testPath)));
if (status !== 0) process.exit(status);
console.log('Profile insight integrity checks passed.');
