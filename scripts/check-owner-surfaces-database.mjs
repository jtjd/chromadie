import { fileURLToPath } from 'node:url';
import { reportSupabaseSqlResult, runSupabaseSqlFile } from './run-supabase-sql-test.mjs';

const testPath = fileURLToPath(new URL('../supabase/tests/owner_surfaces_behavior.sql', import.meta.url));
const status = reportSupabaseSqlResult(runSupabaseSqlFile(testPath));
if (status !== 0) process.exit(status);
