/**
 * UDF donusum test kosucusu.
 * test/ dizinindeki 0*-*.html dosyalarini okur, UDF'ye donusturur,
 * ciktilari test/output/ dizinine yazar.
 *
 * Kullanim: npx tsx test/run.ts
 */
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { UDFConverter } from '../src/core/UDFConverter';
import { NodeFileSystem } from '../src/adapters/node/NodeFileSystem';

const testDir = join(__dirname);
const outputDir = join(__dirname, 'output');

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const testFiles = readdirSync(testDir)
  .filter((f) => /^\d\d-.+\.html$/.test(f))
  .sort();

if (testFiles.length === 0) {
  console.error('Test HTML dosyasi bulunamadi.');
  process.exit(1);
}

async function run() {
  const fs = new NodeFileSystem();
  const converter = new UDFConverter(fs);

  for (const file of testFiles) {
    const htmlPath = join(testDir, file);
    const udfName = basename(file, '.html') + '.udf';
    const outputPath = join(outputDir, udfName);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Donusturuluyor: ${file}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const html = readFileSync(htmlPath, 'utf-8');
      const result = await converter.convert(html, outputPath, {
        resourceDir: testDir,
      });
      console.log(`  OK -> ${outputPath} (${result.size} bytes)`);
    } catch (err: any) {
      console.error(`  HATA: ${err.message}`);
    }
  }

  console.log(`\nTum testler tamamlandi. Ciktilar: ${outputDir}/\n`);
}

run().catch(console.error);
