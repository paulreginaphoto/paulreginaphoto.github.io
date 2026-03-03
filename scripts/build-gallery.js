const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const photosDir = path.join(projectRoot, 'assets', 'photos');
const outputFile = path.join(projectRoot, 'assets', 'data', 'gallery.json');
const validExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!validExtensions.has(ext)) continue;

    files.push(fullPath);
  }

  return files;
}

function toWebPath(filePath) {
  return filePath
    .replace(projectRoot + path.sep, '')
    .split(path.sep)
    .join('/');
}

function titleFromFile(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Sans titre';
}

const images = walk(photosDir)
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
  .map((filePath) => ({
    src: toWebPath(filePath),
    title: titleFromFile(filePath)
  }));

const payload = {
  updatedAt: new Date().toISOString(),
  count: images.length,
  images
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`gallery.json updated with ${images.length} image(s).`);
