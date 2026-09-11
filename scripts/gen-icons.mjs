import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = join(root, 'assets');
const size = 1024;
const sourcePath = join(assets, 'icon.svg');
const sourceSvg = await readFile(sourcePath, 'utf8');
const sourceDefs = sourceSvg.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
const backgroundContent = sourceSvg.match(/<\/defs>([\s\S]*?)<g id="mark"/)?.[1];
const markContent = sourceSvg.match(/<g id="mark"[\s\S]*?<\/g>/)?.[0];

if (!sourceDefs || !backgroundContent || !markContent) {
  throw new Error('assets/icon.svg must contain <defs>, background art, and <g id="mark">');
}

function wrapSvg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;
}

function scaledMark(scale = 1) {
  return scale === 1
    ? markContent
    : `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${markContent}</g>`;
}

function backgroundSvg() {
  return wrapSvg(`${sourceDefs}${backgroundContent.replace(' rx="224"', '')}`);
}

function foregroundSvg() {
  return wrapSvg(`${sourceDefs}${scaledMark(0.88)}`);
}

function splashSvg() {
  return wrapSvg(`${sourceDefs}${scaledMark()}`);
}

function monochromeSvg() {
  const monoMark = markContent
    .replace(' filter="url(#shadow)"', '')
    .replaceAll('fill="url(#coin)"', 'fill="#FFFFFF"')
    .replaceAll('stroke="#6C8CFF"', 'stroke="#FFFFFF"')
    .replaceAll('stroke="#0E1016"', 'stroke="#000000"');

  return wrapSvg(`<g transform="translate(512 512) scale(0.88) translate(-512 -512)">${monoMark}</g>`);
}

async function writePng(name, svg, { flatten = false, width = size, height = size } = {}) {
  let image = sharp(Buffer.from(svg, 'utf8'), { density: 384 }).resize(width, height, { fit: 'contain' });
  if (flatten) image = image.flatten({ background: '#0E1016' });
  await image.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(assets, name));
}

await mkdir(assets, { recursive: true });
await writePng('icon.png', sourceSvg, { flatten: true });
await writePng('android-icon-foreground.png', foregroundSvg());
await writePng('android-icon-background.png', backgroundSvg(), { flatten: true });
await writePng('android-icon-monochrome.png', monochromeSvg());
await writePng('splash-icon.png', splashSvg());
await writePng('favicon.png', sourceSvg, { flatten: true, width: 48, height: 48 });

console.log('Generated app icons from assets/icon.svg');
