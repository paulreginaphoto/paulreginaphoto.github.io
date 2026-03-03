const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function humanize(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'portfolio';
}

function titleFromFile(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return humanize(base) || 'Sans titre';
}

function albumFromFile(filePath) {
  const relativeDir = path.relative(photosDir, path.dirname(filePath));
  if (!relativeDir || relativeDir === '.') {
    return { name: 'Portfolio', slug: 'portfolio' };
  }

  const segments = relativeDir.split(path.sep).filter(Boolean);
  const albumName = segments.map((segment) => humanize(segment)).join(' / ');

  return {
    name: albumName || 'Portfolio',
    slug: slugify(albumName)
  };
}

function commitDateFromGit(filePath) {
  const relative = path.relative(projectRoot, filePath).split(path.sep).join('/');
  try {
    const output = execSync(`git log -1 --format=%cI -- "${relative}"`, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();

    if (output) return output;
  } catch (error) {
    // fallback below
  }

  try {
    return fs.statSync(filePath).mtime.toISOString();
  } catch (error) {
    return '';
  }
}

const images = walk(photosDir)
  .map((filePath) => {
    const album = albumFromFile(filePath);
    return {
      src: toWebPath(filePath),
      title: titleFromFile(filePath),
      album: album.name,
      albumSlug: album.slug,
      date: commitDateFromGit(filePath)
    };
  })
  .sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.src.localeCompare(b.src, undefined, { sensitivity: 'base', numeric: true });
  });

const albumMap = new Map();
const activityByDate = {};

for (const image of images) {
  if (!albumMap.has(image.albumSlug)) {
    albumMap.set(image.albumSlug, {
      name: image.album,
      slug: image.albumSlug,
      count: 0,
      cover: image.src
    });
  }

  const album = albumMap.get(image.albumSlug);
  album.count += 1;

  if (image.date) {
    const day = new Date(image.date).toISOString().slice(0, 10);
    activityByDate[day] = (activityByDate[day] || 0) + 1;
  }
}

const albums = Array.from(albumMap.values()).sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
);

const payload = {
  updatedAt: new Date().toISOString(),
  count: images.length,
  albums,
  activityByDate,
  images
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`gallery.json updated with ${images.length} image(s) in ${albums.length} album(s).`);
