// Einmaliger Browser-Check: Screenshots nach docs/screenshots/, erste PDF-Seite als Bild.
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'screenshots');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };

const server = http.createServer(async (req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  try {
    const buf = await readFile(path.join(root, 'site', u));
    res.writeHead(200, { 'content-type': types[path.extname(u)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const problems = [];
for (const [lang, url] of [['en', '/'], ['de', '/de/']]) {
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: name === 'phone' ? 2 : 1 });
    page.on('requestfailed', (r) => problems.push(`${lang}/${name}: ${r.url()}`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`${lang}/${name}: ${r.status()} ${r.url()}`));
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`${lang}/${name}: horizontaler Überlauf ${overflow}px`);
    await page.screenshot({ path: path.join(out, `${lang}-${name}.png`), fullPage: true });
    await page.close();
  }
}
// 360 px: nur Überlauf prüfen
const small = await browser.newPage({ viewport: { width: 360, height: 800 } });
for (const url of ['/', '/de/']) {
  await small.goto(base + url);
  const o = await small.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 0) problems.push(`360px ${url}: Überlauf ${o}px`);
}
await browser.close();
server.close();

for (const l of ['en', 'de']) {
  execFileSync('pdftoppm', ['-png', '-r', '80', 
    path.join(root, 'site', `onur-koc-cv-${l}.pdf`), path.join(out, `pdf-${l}-seite`)]);
}
console.log(problems.length ? 'PROBLEME:\n' + problems.join('\n') : 'Browser-Check ohne Fehler (keine 4xx, kein Überlauf bei 360/390/1440 px)');
