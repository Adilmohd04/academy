import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const exts = ['.ts', '.tsx', '.js'];
const ignoreDirs = new Set(['node_modules', 'dist']);

const isSourceFile = (file) => exts.includes(path.extname(file));

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (isSourceFile(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    ...exts.map((ext) => `${base}${ext}`),
    ...exts.map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function parseDeps(fileContent) {
  const deps = [];
  const rx = /from\s+['\"]([^'\"]+)['\"]|import\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
  let m;
  while ((m = rx.exec(fileContent)) !== null) {
    deps.push(m[1] || m[2]);
  }
  return deps;
}

const files = walk(sourceRoot);
const byPath = new Set(files);
const graph = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const deps = parseDeps(content)
    .map((d) => resolveImport(file, d))
    .filter(Boolean)
    .filter((d) => byPath.has(d));
  graph.set(file, deps);
}

const roots = [
  path.join(sourceRoot, 'server.ts'),
  path.join(sourceRoot, 'app.ts'),
].filter((f) => fs.existsSync(f));

const visited = new Set();
const stack = [...roots];

while (stack.length) {
  const next = stack.pop();
  if (!next || visited.has(next)) continue;
  visited.add(next);
  const deps = graph.get(next) || [];
  for (const dep of deps) stack.push(dep);
}

const candidates = files
  .filter((f) => !visited.has(f))
  .filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`))
  .sort();

console.log('Potentially unused files (review before delete):');
for (const file of candidates) {
  console.log(path.relative(projectRoot, file));
}
console.log(`Total: ${candidates.length}`);
