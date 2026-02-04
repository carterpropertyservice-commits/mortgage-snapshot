import { fetchAllFred } from './data/fetch-fred.js';
import { fetchMndRss } from './data/fetch-mnd-rss.js';
import { loadCache, saveCache } from './data/cache.js';
import { buildHtml } from './render/html.js';
import { renderAssets } from './export/render-assets.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function main() {
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'snapshot-spec.json')));
  let data = { rates: {}, mnd: {}, fetchedAt: null, fromCache: false };

  try {
    const [rates, mnd] = await Promise.all([fetchAllFred(spec), fetchMndRss(spec)]);
    data.rates = rates;
    data.mnd = mnd;
    data.fetchedAt = new Date().toISOString();
    saveCache(data);
    console.log('Fetched fresh data');
  } catch (err) {
    console.error('Fetch failed:', err.message);
    const cached = loadCache();
    if (cached) {
      data = { ...cached, fromCache: true };
      console.log('Using cached data');
    } else {
      throw new Error('No cache available');
    }
  }

  fs.mkdirSync(path.join(root, 'public', 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public', 'social'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'data', 'latest.json'), JSON.stringify(data, null, 2));

  await buildHtml(spec, data);
  await renderAssets();
  console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });