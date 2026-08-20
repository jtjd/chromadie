import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { reportSupabaseSqlResult, runSupabaseSql } from './run-supabase-sql-test.mjs';

const testPath = fileURLToPath(new URL('../supabase/tests/launch_security.sql', import.meta.url));
const source = readFileSync(testPath, 'utf8');
const scoreBaseline = `
CREATE TEMP TABLE audit_score_baseline AS
SELECT count(*)::bigint AS score_count FROM public.scores;
`;
const scoreAssertion = /SELECT pg_temp\.audit_assert\(\s*\(SELECT count\(\*\) = 0 FROM public\.scores\),\s*'guest roll wrote a score'\s*\);/;
if (!scoreAssertion.test(source)) {
  console.error('Launch security test no longer contains the guest score-write assertion expected by its isolation adapter.');
  process.exit(1);
}
const isolatedSource = source
  .replace(/^BEGIN;\s*/m, match => `${match}${scoreBaseline}`)
  .replace(scoreAssertion, `SELECT pg_temp.audit_assert(
  (SELECT count(*) = (SELECT score_count FROM audit_score_baseline) FROM public.scores),
  'guest roll wrote a score'
);`);

const status = reportSupabaseSqlResult(runSupabaseSql(isolatedSource));
if (status !== 0) process.exit(status);
console.log('Database security checks passed.');
