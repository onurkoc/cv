// npm run build [-- --draft]: content/*.json + src/ -> site/ (Seiten, PDFs, og.png)
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { renderPage, esc } from '../src/page.mjs';
import { renderPrint } from '../src/print.mjs';

const draft = process.argv.includes('--draft');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(root, ...a);
const OUT = process.env.SITE_OUT || 'site';
const s = (...a) => p(OUT, ...a);
const langs = ['en', 'de'];

const content = {};
for (const l of langs) content[l] = JSON.parse(await readFile(p('content', `${l}.json`), 'utf8'));

// Gleiche Struktur prüfen (Schlüssel rekursiv)
const shape = (v) =>
  Array.isArray(v) ? [v.length, v[0] === undefined ? null : shape(v[0])]
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])]))
  : null;
if (JSON.stringify(shape(content.en)) !== JSON.stringify(shape(content.de)))
  throw new Error('content/en.json und content/de.json haben nicht dieselbe Struktur');

// Platzhalter: ohne --draft Abbruch
const placeholders = [];
const walk = (v, where) => {
  if (typeof v === 'string') { if (/\[(OFFEN|OPEN):/.test(v)) placeholders.push(`${where}: ${v}`); }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) if (!k.startsWith('_') && k !== 'personal') walk(x, `${where}.${k}`);
};
for (const l of langs) walk(content[l], l);
if (placeholders.length && !draft) {
  console.error(`Abbruch: ${placeholders.length} offene Stellen im Inhalt (mit --draft trotzdem bauen):\n` + placeholders.join('\n'));
  process.exit(1);
}

// site/ neu aufbauen
await rm(s(), { recursive: true, force: true });
await mkdir(s('assets', 'fonts'), { recursive: true });
await mkdir(s('assets', 'img'), { recursive: true });
await mkdir(s('de'), { recursive: true });

// Assets mit Inhalts-Hash im Dateinamen (Schriften, Bilder, dann CSS mit den gehashten Schriftnamen)
const hashName = (name, buf) => {
  const h = createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const i = name.lastIndexOf('.');
  return `${name.slice(0, i)}.${h}${name.slice(i)}`;
};
const emit = async (srcFile, dir, name) => {
  const buf = await readFile(srcFile);
  const out = hashName(name, buf);
  await writeFile(s('assets', dir, out), buf);
  return out;
};
const A = { img: {} };
const fontMap = {};
for (const f of (await readdir(p('src', 'fonts'))).filter((f) => f.endsWith('.woff2')))
  fontMap[f] = await emit(p('src', 'fonts', f), 'fonts', f);
await cp(p('src', 'fonts', 'OFL.txt'), s('assets', 'fonts', 'OFL.txt'));
for (const f of (await readdir(p('src', 'img'))).filter((f) => f !== 'onur-koc-print.jpg'))
  A.img[f] = '/assets/img/' + (await emit(p('src', 'img', f), 'img', f));
let siteCss = await readFile(p('src', 'site.css'), 'utf8');
for (const [f, h] of Object.entries(fontMap)) siteCss = siteCss.replaceAll(`fonts/${f}`, `fonts/${h}`);
const cssName = hashName('site.css', siteCss);
await writeFile(s('assets', cssName), siteCss);
A.css = '/assets/' + cssName;
A.font400 = '/assets/fonts/' + fontMap['inter-tight-latin-400-normal.woff2'];
A.font800 = '/assets/fonts/' + fontMap['inter-tight-latin-800-normal.woff2'];
await cp(p('src', 'favicon.svg'), s('favicon.svg'));
await writeFile(s('_headers'), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.pdf
  Cache-Control: public, max-age=3600

/og.png
  Cache-Control: public, max-age=86400
`);
await writeFile(s('index.html'), renderPage(content.en, content.de.meta.pdf_file, A));
await writeFile(s('de', 'index.html'), renderPage(content.de, content.en.meta.pdf_file, A));
await writeFile(s('robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://cv.onurkoc.net/sitemap.xml\n');
await writeFile(s('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['/', '/de/'].map((u) => `<url><loc>https://cv.onurkoc.net${u}</loc><xhtml:link rel="alternate" hreflang="en" href="https://cv.onurkoc.net/"/><xhtml:link rel="alternate" hreflang="de" href="https://cv.onurkoc.net/de/"/></url>`).join('\n')}
</urlset>
`);

// PDFs und og.png
const fontsUrl = pathToFileURL(p('src', 'fonts')).href;
const css = (await readFile(p('src', 'print.css'), 'utf8')).replaceAll('FONTS', fontsUrl);
await mkdir(p('.build'), { recursive: true });
const en = content.en.person;
const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Inter Tight";font-weight:800;src:url(${fontsUrl}/inter-tight-latin-800-normal.woff2) format("woff2")}
@font-face{font-family:"Inter Tight";font-weight:500;src:url(${fontsUrl}/inter-tight-latin-500-normal.woff2) format("woff2")}
html,body{margin:0}body{width:1200px;height:630px;background:#fff;color:#111;font-family:"Inter Tight",sans-serif;box-sizing:border-box;border-top:14px solid #111;padding:72px 80px}
.m{width:44px;height:44px;background:#c8261a;margin-bottom:40px}
h1{margin:0;font-size:190px;line-height:.9;font-weight:800;letter-spacing:-.045em}
p{margin:48px 0 0;font-size:36px;line-height:1.4;font-weight:500;color:#333}
</style></head><body><div class="m"></div><h1>${esc(en.name)}</h1><p>${en.roles.map(esc).join(' · ')}</p></body></html>`;
await writeFile(p('.build', 'og.html'), ogHtml);

const browser = await chromium.launch();
try {
  for (const l of langs) {
    const file = p('.build', `print-${l}.html`);
    await writeFile(file, renderPrint(content[l], css, pathToFileURL(p('src', 'img', 'onur-koc-print.jpg')).href));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: s(content[l].meta.pdf_file), format: 'A4', printBackground: true, preferCSSPageSize: true });
    await page.close();
  }
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(pathToFileURL(p('.build', 'og.html')).href);
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: s('og.png') });
} finally {
  await browser.close();
}
console.log(`site/ gebaut${draft ? ' (Entwurf, ' + placeholders.length + ' offene Stellen)' : ''}`);
