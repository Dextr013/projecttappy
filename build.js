import { build } from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const dist = path.join(root, 'dist');

async function copyFileRel(src) {
  const from = path.join(root, src);
  const to = path.join(dist, src);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function copyDir(dir) {
  const from = path.join(root, dir);
  const to = path.join(dist, dir);
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(dir, e.name);
    if (e.isDirectory()) await copyDir(src);
    else await copyFileRel(src);
  }
}

async function run() {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  await build({
    entryPoints: ['js/main.js'],
    bundle: true,
    minify: true,
    format: 'iife',
    sourcemap: false,
    outfile: 'dist/js/bundle.js',
    loader: { '.png': 'file' },
    metafile: true
  });

  // Copy HTML/CSS and assets
  await copyFileRel('index.html');
  await copyFileRel('styles.css');
  const assets = [
    'background.png','rock.png','rockDown.png','groundDirt.png','groundGrass.png','groundIce.png','groundRock.png','groundSnow.png','puffLarge.png','puffSmall.png','starBronze.png','starSilver.png','starGold.png','LICENSE'
  ];
  for (const a of assets) { try { await copyFileRel(a); } catch {} }
  await copyDir('Planes');
  await copyDir('UI');

  // Inject compiled script reference into HTML
  const htmlPath = path.join(dist, 'index.html');
  let html = await fs.readFile(htmlPath, 'utf8');
  html = html.replace('/js/main.js', '/js/bundle.js');
  await fs.writeFile(htmlPath, html);

  console.log('Build complete: dist');
}

run().catch((e) => { console.error(e); process.exit(1); });