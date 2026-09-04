import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsRoot = path.join(repoRoot, 'supabase', 'migrations');

function splitSqlValues(row, source) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === "'") {
      if (quoted && row[index + 1] === "'") {
        value += "''";
        index += 1;
      } else {
        quoted = !quoted;
      }
      value += character;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error(`Unterminated SQL string in ${source}.`);
  values.push(value.trim());
  return values;
}

function decodeSqlValue(value, source) {
  const normalized = value.trim();
  if (normalized.toUpperCase() === 'NULL') return null;
  if (normalized.toUpperCase() === 'TRUE') return true;
  if (normalized.toUpperCase() === 'FALSE') return false;
  if (normalized.startsWith("'") && normalized.endsWith("'")) {
    return normalized.slice(1, -1).replaceAll("''", "'");
  }
  if (/^-?\d+$/.test(normalized)) return Number(normalized);
  throw new Error(`Unsupported progression SQL value ${JSON.stringify(normalized)} in ${source}.`);
}

function extractRows(body, columns, source) {
  const rows = [];
  let rowStart = -1;
  let depth = 0;
  let quoted = false;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === "'") {
      if (quoted && body[index + 1] === "'") index += 1;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === '(') {
      if (depth === 0) rowStart = index + 1;
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        rows.push({ columns, values: splitSqlValues(body.slice(rowStart, index), source) });
      }
      if (depth < 0) throw new Error(`Unbalanced progression row delimiters in ${source}.`);
    }
  }

  if (quoted || depth !== 0) throw new Error(`Malformed progression INSERT in ${source}.`);
  return rows;
}

export function parseProgressionRows(sql, source = 'progression SQL') {
  const rows = [];
  const insertPattern = /INSERT\s+INTO\s+public\.progression_milestones\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?)(?=\r?\n\s*(?:ON CONFLICT|DO \$)|\r?\n\s*;|;\s*$)/gi;

  for (const match of sql.matchAll(insertPattern)) {
    const columns = match[1].split(',').map(column => column.trim());
    for (const row of extractRows(match[2], columns, source)) {
      if (row.values.length !== columns.length) {
        throw new Error(`Progression INSERT in ${source} has ${row.values.length} values for ${columns.length} columns.`);
      }
      rows.push(Object.fromEntries(columns.map((column, index) => [
        column,
        decodeSqlValue(row.values[index], source)
      ])));
    }
  }

  return rows;
}

function isSqlLiteral(value) {
  const normalized = value.trim();
  return normalized.toUpperCase() === 'NULL'
    || normalized.toUpperCase() === 'TRUE'
    || normalized.toUpperCase() === 'FALSE'
    || /^-?\d+$/.test(normalized)
    || (normalized.startsWith("'") && normalized.endsWith("'"));
}

function decodeSqlLiteralOrColumn(value, row, source) {
  const normalized = value.trim();
  if (isSqlLiteral(normalized)) return decodeSqlValue(normalized, source);
  if (/^[a-z_][a-z0-9_]*$/i.test(normalized)) return row[normalized];
  throw new Error(`Unsupported progression SQL expression ${JSON.stringify(normalized)} in ${source}.`);
}

function compareSqlValues(left, operator, right) {
  if (operator === '=') return left === right;
  if (typeof left !== 'number' || typeof right !== 'number') return false;
  if (operator === '<') return left < right;
  if (operator === '<=') return left <= right;
  if (operator === '>') return left > right;
  if (operator === '>=') return left >= right;
  return false;
}

function evaluateCaseExpression(expression, row, source) {
  const caseMatch = expression.trim().match(/^CASE(?:\s+(?!WHEN\b)([a-z_][a-z0-9_]*))?\s+([\s\S]*?)\s+END$/i);
  if (!caseMatch) throw new Error(`Malformed progression CASE expression in ${source}.`);

  const operand = caseMatch[1];
  const body = caseMatch[2];
  const elseMatch = body.match(/\s+ELSE\s+([\s\S]*)$/i);
  const whenBody = elseMatch ? body.slice(0, elseMatch.index) : body;
  const fallback = elseMatch
    ? decodeSqlLiteralOrColumn(elseMatch[1], row, source)
    : null;

  if (operand) {
    for (const match of whenBody.matchAll(/\bWHEN\s+((?:'(?:''|[^'])*')|NULL|TRUE|FALSE|-?\d+)\s+THEN\s+([\s\S]*?)(?=\s+WHEN\b|$)/gi)) {
      const expected = decodeSqlValue(match[1], source);
      if (row[operand] === expected) return decodeSqlLiteralOrColumn(match[2], row, source);
    }
    return fallback;
  }

  for (const match of whenBody.matchAll(/\bWHEN\s+([a-z_][a-z0-9_]*)\s+(?:(IN)\s*\(([^)]*)\)|([<>=]+)\s*((?:'(?:''|[^'])*')|NULL|TRUE|FALSE|-?\d+))\s+THEN\s+([\s\S]*?)(?=\s+WHEN\b|$)/gi)) {
    const matches = match[2]
      ? splitSqlValues(match[3], source).map(value => decodeSqlValue(value, source)).includes(row[match[1]])
      : compareSqlValues(row[match[1]], match[4], decodeSqlValue(match[5], source));
    if (matches) return decodeSqlLiteralOrColumn(match[6], row, source);
  }
  return fallback;
}

function evaluateProgressionExpression(expression, row, source) {
  const normalized = expression.trim();
  if (/^CASE\b/i.test(normalized)) return evaluateCaseExpression(normalized, row, source);
  return decodeSqlLiteralOrColumn(normalized, row, source);
}

function parseWhereTerm(term, row, source) {
  let normalized = term.trim();
  while (normalized.startsWith('(') && normalized.endsWith(')')) {
    normalized = normalized.slice(1, -1).trim();
  }
  const equality = normalized.match(/^([a-z_][a-z0-9_]*)\s*=\s*((?:'(?:''|[^'])*')|NULL|TRUE|FALSE|-?\d+)$/i);
  if (equality) {
    return row[equality[1]] === decodeSqlValue(equality[2], source);
  }
  const nullity = normalized.match(/^([a-z_][a-z0-9_]*)\s+IS\s+(NOT\s+)?NULL$/i);
  if (nullity) {
    const isNull = row[nullity[1]] === null || row[nullity[1]] === undefined;
    return nullity[2] ? !isNull : isNull;
  }
  const inList = normalized.match(/^([a-z_][a-z0-9_]*)\s+IN\s*\(([^)]+)\)$/i);
  if (inList) {
    const values = splitSqlValues(inList[2], source).map(value => decodeSqlValue(value, source));
    return values.includes(row[inList[1]]);
  }
  throw new Error(`Unsupported progression UPDATE predicate ${JSON.stringify(normalized)} in ${source}.`);
}

function progressionWhereMatches(row, whereClause, source) {
  return whereClause
    .split(/\s+AND\s+/i)
    .every(term => parseWhereTerm(term, row, source));
}

function applyProgressionUpdates(manifest, sql, source = 'progression SQL') {
  const updatePattern = /UPDATE\s+public\.progression_milestones\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]*?)\s*;/gi;

  for (const match of sql.matchAll(updatePattern)) {
    const assignments = [...match[1].matchAll(/([a-z_][a-z0-9_]*)\s*=\s*([\s\S]*?)(?=\s*,\s*[a-z_][a-z0-9_]*\s*=|\s*$)/gi)];
    if (!assignments.length) continue;

    for (const existing of manifest.values()) {
      if (!progressionWhereMatches(existing, match[2], source)) continue;
      const values = Object.fromEntries(assignments.map(([, column, expression]) => [
        column,
        evaluateProgressionExpression(expression, existing, source)
      ]));
      manifest.set(existing.id, { ...existing, ...values });
    }
  }
}

export async function readProgressionManifest() {
  const files = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort();
  const manifest = new Map();

  for (const filename of files) {
    const source = path.join(migrationsRoot, filename);
    const sql = await readFile(source, 'utf8');
    for (const row of parseProgressionRows(sql, path.relative(repoRoot, source))) {
      const id = row.id;
      if (!id) continue;
      manifest.set(id, { ...(manifest.get(id) || {}), ...row });
    }
    applyProgressionUpdates(manifest, sql, path.relative(repoRoot, source));
  }

  return [...manifest.values()];
}

export function progressionRewardKeys(manifest) {
  return [...new Set(manifest
    .map(row => row.reward_item_key)
    .filter(value => typeof value === 'string' && value.length > 0))];
}

export function progressionRowValue(row, key, fallback = undefined) {
  return row && Object.prototype.hasOwnProperty.call(row, key) ? row[key] : fallback;
}
