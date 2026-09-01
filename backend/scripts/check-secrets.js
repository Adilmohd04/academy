const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const includeExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.sql', '.yml', '.yaml', '.env'
]);

const ignoreDirs = new Set([
  'node_modules', '.git', '.next', 'dist', 'coverage', 'build'
]);

const knownLeakedPasswordPattern = new RegExp('Adil' + '0004', 'i');

const patterns = [
  {
    name: 'Hardcoded known leaked password token',
    regex: knownLeakedPasswordPattern,
  },
  {
    name: 'Hardcoded DB URL with literal password',
    regex: /postgres(?:ql)?:\/\/[^:\s]+:(?!password|secure_password|your_|\[|<|\$\{|YOUR|\*\*\*|example|changeme)[^@\s]+@/i,
  },
];

const findings = [];

function shouldScanFile(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (base === '.env' || base.startsWith('.env.')) return false;

  const ext = path.extname(filePath);
  return includeExtensions.has(ext);
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(absPath);
      }
      continue;
    }

    if (!shouldScanFile(absPath)) continue;

    let content;
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch {
      continue;
    }

    const relative = path.relative(repoRoot, absPath).replace(/\\/g, '/');
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          findings.push({
            file: relative,
            line: i + 1,
            rule: pattern.name,
            snippet: line.trim().slice(0, 180),
          });
        }
      }
    }
  }
}

walk(repoRoot);

if (findings.length > 0) {
  console.error('Secret scan failed. Potential hardcoded secrets found:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}] ${finding.snippet}`);
  }
  process.exit(1);
}

console.log('Secret scan passed. No hardcoded credentials detected by guard rules.');
