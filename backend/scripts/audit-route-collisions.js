/**
 * Report duplicate Express route registrations.
 *
 * Two bugs in this codebase came from the same cause: the same METHOD + path
 * registered by two routers, where Express silently serves whichever was
 * mounted first. `/api/student/courses/browse` was declared public in one file
 * and auth-gated in another; the auth-gated one won and returned 401.
 *
 * Run: node scripts/audit-route-collisions.js
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const APP = path.join(SRC, 'app.ts');

const appSource = fs.readFileSync(APP, 'utf8');

// import x from './routes/y'  ->  { x: 'routes/y' }
const importsByName = {};
for (const m of appSource.matchAll(/import\s+(\w+)\s+from\s+'\.\/([^']+)'/g)) {
  importsByName[m[1]] = m[2];
}

// this.app.use('/api/x', yRoutes)
const mounts = [];
for (const m of appSource.matchAll(/this\.app\.use\(\s*'([^']+)'\s*,\s*(\w+)\s*\)/g)) {
  if (importsByName[m[2]]) mounts.push({ prefix: m[1], module: importsByName[m[2]], varName: m[2] });
}

const normalise = (prefix, route) => {
  const joined = `${prefix.replace(/\/$/, '')}/${route.replace(/^\//, '')}`.replace(/\/+/g, '/');
  // Param names differ between files for the same slot; compare by shape.
  return joined.replace(/:[A-Za-z0-9_]+/g, ':p').replace(/\/$/, '') || '/';
};

const seen = new Map();
const collisions = [];

for (const mount of mounts) {
  const file = path.join(SRC, `${mount.module}.ts`);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');

  for (const r of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*\n?\s*'([^']+)'/g)) {
    const method = r[1].toUpperCase();
    const key = `${method} ${normalise(mount.prefix, r[2])}`;
    if (seen.has(key)) {
      collisions.push({ key, first: seen.get(key), second: `${mount.module} (mounted ${mount.prefix})` });
    } else {
      seen.set(key, `${mount.module} (mounted ${mount.prefix})`);
    }
  }
}

console.log(`Scanned ${mounts.length} router mounts, ${seen.size} distinct routes.\n`);

if (collisions.length === 0) {
  console.log('No duplicate route registrations found.');
} else {
  console.log(`${collisions.length} duplicate registration(s) — first mounted wins:\n`);
  for (const c of collisions) {
    console.log(`  ${c.key}`);
    console.log(`      serves: ${c.first}`);
    console.log(`      shadowed: ${c.second}\n`);
  }
}
