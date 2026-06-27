import 'dotenv/config';
import { fetchAllFred, fetchMacroData } from './data/fetch-fred.js';
import { fetchExpandedRates } from './data/fetch-mnd-rates.js';
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
  const cached = loadCache();

  const results = await Promise.allSettled([
    fetchAllFred(spec),
    fetchMacroData(spec),
    fetchMndRss(spec)
  ]);

  const [fredResult, macroResult, mndResult] = results;

  if (fredResult.status === 'rejected')  console.error('FRED rates failed:', fredResult.reason?.message);
  if (macroResult.status === 'rejected') console.error('FRED macro failed:', macroResult.reason?.message);
  if (mndResult.status === 'rejected')   console.error('MND RSS failed:',   mndResult.reason?.message);

  const fredRates = fredResult.status === 'fulfilled' ? fredResult.value : cached?.rates || {};
  const macro    = macroResult.status === 'fulfilled' ? macroResult.value : cached?.macro || {};
  const mnd      = mndResult.status === 'fulfilled'   ? mndResult.value   : cached?.mnd   || {};

  const base30y = fredRates?.mortgage_30y_daily?.value || fredRates?.mortgage_30y_weekly?.value || null;
  let expandedRates = cached?.expandedRates || null;
  if (base30y) {
    try {
      expandedRates = await fetchExpandedRates(base30y, spec);
    } catch (err) {
      console.error('Expanded rates failed:', err.message);
    }
  }

  const data = {
    rates: fredRates,
    macro,
    mnd,
    expandedRates,
    fetchedAt: new Date().toISOString(),
    fromCache: fredResult.status === 'rejected' && mndResult.status === 'rejected'
  };

  saveCache(data);

  fs.mkdirSync(path.join(root, 'public', 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public', 'social'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'data', 'latest.json'), JSON.stringify(data, null, 2));

  await buildHtml(spec, data);
  await renderAssets();
  console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });
