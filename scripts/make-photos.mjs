// Einmalig: erzeugt die Fotoversionen in src/img/ aus reference/onur-koc-gross.jpg (Original bleibt lokal).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'reference', 'onur-koc-gross.jpg');
const out = (f) => path.join(root, 'src', 'img', f);
const resize = (w, h) => sharp(src).resize(w, h, { kernel: 'lanczos3' });

for (const [name, w, h] of [['360', 360, 315], ['720', 720, 630]]) {
  await resize(w, h).jpeg({ quality: 82, mozjpeg: true }).toFile(out(`onur-koc-${name}.jpg`));
  await resize(w, h).webp({ quality: 82 }).toFile(out(`onur-koc-${name}.webp`));
}
// PDF: 32 × 28 mm bei 300 dpi = 378 × 331 px
await resize(378, 331).jpeg({ quality: 90, mozjpeg: true }).withMetadata({ density: 300 }).toFile(out('onur-koc-print.jpg'));
