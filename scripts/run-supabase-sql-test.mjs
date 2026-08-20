import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export function runSupabaseSql(sql, {
  container = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_Chromadie',
  maxBuffer = 16 * 1024 * 1024
} = {}) {
  return spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres'],
    {
      input: sql,
      encoding: 'utf8',
      maxBuffer
    }
  );
}

export function runSupabaseSqlFile(filePath, options = {}) {
  return runSupabaseSql(readFileSync(filePath, 'utf8'), options);
}

export function reportSupabaseSqlResult(result) {
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) {
    console.error(`Supabase SQL runner could not start: ${result.error.message}`);
    return result.error.code === 'ENOENT' ? 127 : 1;
  }
  return result.status || 0;
}
