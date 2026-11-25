#!/usr/bin/env node
/**
 * Sürüm yükseltme + etiketleme aracı.
 *
 * Akış: `main`'i günceller → lint/test/build kapıları → `package.json` sürümünü
 * artırır → CHANGELOG.md'ye başlık ekler → commit + tag atar → push eder.
 * npm yayını tag tetiklemeli GitHub Actions workflow'unda yapılır
 * (`.github/workflows/release.yml`).
 *
 * Kullanım:
 *   pnpm run release patch                     # 0.1.2 → 0.1.3
 *   pnpm run release minor                     # 0.1.2 → 0.2.0
 *   pnpm run release major                     # 0.1.2 → 1.0.0
 *   pnpm run release minor --note "UDF → HTML aracı"
 *   pnpm run release patch --dry-run           # hiçbir şeyi değiştirmeden göster
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = 'js-udf-tools';
const RELEASES_URL = `https://github.com/saruapp/${PACKAGE_NAME}/releases/tag`;
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(repoRoot);

const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith('--'));
const bump = positional[0] ?? 'patch';
const dryRun = args.includes('--dry-run');
const noteIndex = args.indexOf('--note');
const note = noteIndex !== -1 ? args[noteIndex + 1] : undefined;

const BUMP_TYPES = ['patch', 'minor', 'major'];

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function capture(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function bumpVersion(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) fail(`package.json sürümü semver değil: "${version}"`);
  let [major, minor, patch] = match.slice(1).map(Number);
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function isPublished(version) {
  try {
    const output = capture(`npm view ${PACKAGE_NAME}@${version} version --json`);
    return output.length > 0;
  } catch (error) {
    const stderr = String(error.stderr ?? '');
    if (/E404|404 Not Found/.test(stderr)) return false;
    fail(`npm registry kontrolü başarısız: ${stderr.trim() || error.message}`);
  }
}

function updateChangelog(version, date, noteText) {
  const path = join(repoRoot, 'CHANGELOG.md');
  let changelog = readFileSync(path, 'utf8');
  const entry = `## [${version}] — ${date}\n\n### Değişenler\n- ${noteText}\n\n`;
  changelog = changelog.includes('\n## ')
    ? changelog.replace('\n## ', `\n${entry}## `)
    : `${changelog.trimEnd()}\n\n${entry}`;
  changelog = `${changelog.trimEnd()}\n[${version}]: ${RELEASES_URL}/v${version}\n`;
  writeFileSync(path, changelog);
}

if (!BUMP_TYPES.includes(bump)) {
  fail(`Geçersiz sürüm tipi: "${bump}" (patch | minor | major)`);
}
if (noteIndex !== -1 && !note) {
  fail('--note için bir açıklama metni verin.');
}

// 1. Git deposu, temizlik, dal ve güncellik kontrolü.
capture('git rev-parse --is-inside-work-tree');
const dirty = capture('git status --porcelain');
if (dirty) {
  fail("Çalışma ağacı temiz değil. Önce değişiklikleri commit edin veya stash'leyin.");
}
let detached = false;
try {
  capture('git symbolic-ref -q HEAD');
} catch {
  detached = true;
}
if (detached) {
  console.log('• Detached HEAD algılandı; main dalına geçiliyor…');
  run('git checkout main');
}
const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  fail(`Sürüm yalnız main dalında kesilebilir (şu an: ${branch}).`);
}
console.log('• origin/main güncelleniyor…');
run('git pull --ff-only origin main');

// 2. Sürüm hesabı ve npm ön kontrolü.
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const current = packageJson.version;
const next = bumpVersion(current, bump);
const tag = `v${next}`;

console.log(`• Sürüm: ${current} → ${next} (${bump})`);
if (isPublished(next)) {
  fail(`${PACKAGE_NAME}@${next} npm'de zaten yayında.`);
}
try {
  capture(`git rev-parse -q --verify refs/tags/${tag}`);
  fail(`${tag} etiketi zaten var.`);
} catch {
  // Etiket yok — beklenen durum.
}

if (dryRun) {
  console.log(`\n[dry-run] Yapılacaklar:`);
  console.log('  1. lint + test + build');
  console.log(`  2. package.json sürümü → ${next}`);
  console.log(`  3. CHANGELOG.md başlığı → ${tag} (${new Date().toISOString().slice(0, 10)})`);
  console.log(`  4. commit: chore(release): ${tag}`);
  console.log(`  5. tag + push → GitHub Actions npm'e yayınlar`);
  process.exit(0);
}

// 3. Kalite kapıları — kırmızıysa hiçbir şey değişmez.
console.log('• lint…');
run('npm run lint');
console.log('• test…');
run('npm run test');
console.log('• build…');
run('npm run build');

// 4. Sürüm + changelog.
run(`npm version ${bump} --no-git-tag-version`);
updateChangelog(next, new Date().toISOString().slice(0, 10), note ?? 'Sürüm yükseltmesi.');

// 5. Commit + tag + push.
run('git add package.json CHANGELOG.md');
run(`git commit -m "chore(release): ${tag}"`);
run(`git tag -a ${tag} -m "${tag}"`);
run('git push origin main --follow-tags');

console.log(`\n✔ ${tag} push edildi; CI yayını başlatıyor.`);
console.log(`  https://github.com/saruapp/${PACKAGE_NAME}/actions`);
console.log('\n⚠ Ana repoda submodule referansını güncellemeyi unutmayın:');
console.log(`  git add packages/js-udf-tools && git commit -m "chore: js-udf-tools ${tag}"`);
