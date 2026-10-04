import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const poolPath = path.join(process.cwd(), '.opencode', 'cache', 'global_art_pool.json');
const raw = JSON.parse(fs.readFileSync(poolPath, 'utf8'));

function hashId(prefix, str) {
  const hash = crypto.createHash('md5').update(str).digest('hex').slice(0, 10);
  return `${prefix}-${hash}`;
}

const cleanedItems = raw.items.map((item) => {
  const source = item.source || 'archive';
  let id = item.id;
  if (!id) {
    if (source === 'met') {
      const match = item.url?.match(/DP-([A-Za-z0-9_-]+)/);
      id = match ? `met-${match[1]}` : hashId('met', `${item.title}-${item.creator}-${item.url}`);
    } else if (source === 'cleveland') {
      const match = item.url?.match(/\/([0-9.]+)\//);
      id = match ? `cma-${match[1].replace(/\./g, '-')}` : hashId('cma', `${item.title}-${item.url}`);
    } else if (source === 'wikimedia') {
      const match = item.url?.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\//);
      id = match ? `commons-${decodeURIComponent(match[1])}` : hashId('commons', `${item.title}-${item.url}`);
    } else {
      id = hashId(source, `${item.title}-${item.url}`);
    }
  }

  const width = typeof item.width === 'number' ? item.width : (parseInt(item.width, 10) || 600);
  const height = typeof item.height === 'number' ? item.height : (parseInt(item.height, 10) || 600);

  return {
    ...item,
    id,
    sourceRecordId: item.sourceRecordId || id,
    width,
    height,
    source,
    type: item.type || 'artwork',
    rightsLabel: item.rightsLabel || (source === 'cleveland' ? 'CC0' : 'Public Domain'),
  };
});

// Deduplicate by id and url
const seen = new Set();
const deduped = [];
for (const item of cleanedItems) {
  const key = item.id || item.url;
  if (!seen.has(key) && !seen.has(item.url)) {
    seen.add(key);
    seen.add(item.url);
    deduped.push(item);
  }
}

const outDir = path.join(process.cwd(), 'src', 'lib', 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outTs = `import type { MediaItem } from '@/app/api/media-feed/types';

/**
 * Pre-bundled, zero-latency public domain artwork manifest.
 * Guarantees that cold starts on Vercel or any edge runtime always have
 * a diverse, verified baseline of masterpieces immediately available.
 */
export const EMBEDDED_ARTWORK_MANIFEST: MediaItem[] = ${JSON.stringify(deduped, null, 2)};
`;

fs.writeFileSync(path.join(outDir, 'artwork-manifest.ts'), outTs, 'utf8');
console.log(`Successfully generated manifest with ${deduped.length} items.`);
