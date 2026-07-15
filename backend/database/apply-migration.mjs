#!/usr/bin/env node
/**
 * Generic migration runner.
 *
 * Usage:
 *   node backend/database/apply-migration.mjs <migration-file>
 *
 * Example:
 *   node backend/database/apply-migration.mjs backend/database/migrations/certificate_designer_studio.sql
 *
 * Reads DATABASE_URL from backend/.env and applies the SQL file. Splits the
 * file into top-level statements and runs them sequentially inside a single
 * transaction so we can pinpoint exactly which statement failed if any does.
 *
 * Safer alternative to invoking psql, which most Windows machines do not have
 * installed. Works against any Postgres-compatible DB (including Supabase
 * direct connections).
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function fail(msg) {
  console.error(`${RED}✗ ${msg}${RESET}`);
  process.exit(1);
}

const argFile = process.argv[2];
if (!argFile) {
  console.error(`${RED}Usage: node backend/database/apply-migration.mjs <path-to-sql-file>${RESET}`);
  process.exit(1);
}

const migrationPath = path.resolve(process.cwd(), argFile);
if (!fs.existsSync(migrationPath)) {
  fail(`Migration file not found: ${migrationPath}`);
}

if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL is not set. Add it to backend/.env (Supabase project → Settings → Database → Connection string).');
}

const sql = fs.readFileSync(migrationPath, 'utf8');

/**
 * Split a SQL script into individual statements.
 *
 * Postgres allows `;` inside dollar-quoted blocks ($$ ... $$), so we can't just
 * split on `;`. This walks the source character by character, tracking whether
 * we're inside a string literal, a line comment, a block comment, or a
 * dollar-quoted block, and only treats `;` as a separator at the top level.
 */
function splitSqlStatements(source) {
  const statements = [];
  let buffer = '';
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i];
    const next = i + 1 < n ? source[i + 1] : '';

    // Line comment: -- ... \n
    if (ch === '-' && next === '-') {
      const eol = source.indexOf('\n', i);
      const end = eol === -1 ? n : eol + 1;
      buffer += source.slice(i, end);
      i = end;
      continue;
    }

    // Block comment: /* ... */
    if (ch === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      buffer += source.slice(i, end);
      i = end;
      continue;
    }

    // String literal: '...'  (handles escaped quotes '')
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (source[j] === "'" && source[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (source[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      buffer += source.slice(i, j);
      i = j;
      continue;
    }

    // Dollar-quoted block:  $tag$ ... $tag$  (tag may be empty)
    if (ch === '$') {
      const tagMatch = source.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (tagMatch) {
        const tag = tagMatch[0]; // includes the $...$
        const close = source.indexOf(tag, i + tag.length);
        const end = close === -1 ? n : close + tag.length;
        buffer += source.slice(i, end);
        i = end;
        continue;
      }
    }

    if (ch === ';') {
      const trimmed = buffer.trim();
      if (trimmed) statements.push(trimmed);
      buffer = '';
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  const tail = buffer.trim();
  if (tail) statements.push(tail);

  return statements;
}

const statements = splitSqlStatements(sql);

console.log(`${CYAN}Applying migration:${RESET} ${migrationPath}`);
console.log(`${CYAN}Bytes:${RESET} ${sql.length}`);
console.log(`${CYAN}Statements:${RESET} ${statements.length}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

const start = Date.now();

function summarizeStatement(stmt) {
  const trimmed = stmt.replace(/\s+/g, ' ').trim();
  return trimmed.length > 140 ? trimmed.slice(0, 137) + '...' : trimmed;
}

try {
  const client = await pool.connect();
  console.log(`${GREEN}✓ Connected${RESET}`);
  try {
    await client.query('BEGIN');
    let stmtIndex = 0;
    for (const stmt of statements) {
      stmtIndex += 1;
      try {
        await client.query(stmt);
        process.stdout.write(`${DIM}  [${stmtIndex}/${statements.length}] OK${RESET}\r`);
      } catch (err) {
        process.stdout.write('\n');
        console.error(`${RED}✗ Statement ${stmtIndex}/${statements.length} failed:${RESET}`);
        console.error(`${YELLOW}${summarizeStatement(stmt)}${RESET}`);
        console.error(`${RED}  Error:${RESET} ${err.message}`);
        if (err.position) console.error(`${YELLOW}  Position in statement: ${err.position}${RESET}`);
        if (err.detail) console.error(`${YELLOW}  Detail: ${err.detail}${RESET}`);
        if (err.hint) console.error(`${YELLOW}  Hint: ${err.hint}${RESET}`);
        if (err.code) console.error(`${YELLOW}  SQLSTATE: ${err.code}${RESET}`);
        throw err;
      }
    }
    process.stdout.write('\n');
    await client.query('COMMIT');
    const ms = Date.now() - start;
    console.log(`${GREEN}✓ Migration applied successfully in ${ms}ms (${statements.length} statements)${RESET}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`${RED}✗ Migration failed; transaction rolled back${RESET}`);
    process.exit(1);
  } finally {
    client.release();
  }
} catch (err) {
  if (err && err.message && !err.message.includes('Migration failed')) {
    fail(`Could not connect: ${err.message}`);
  }
} finally {
  await pool.end();
}
