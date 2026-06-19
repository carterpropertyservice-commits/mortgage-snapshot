js
  
async function main() {
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'snapshot-spec.json')));
  const cached = loadCache();

  const results = await Promise.allSettled([
    fetchAllFred(spec),
    fetchMndRss(spec)
  ]);

  const [fredResult, mndResult] = results;

  if (fredResult.status === 'rejected') {
    console.error('FRED fetch failed:', fredResult.reason?.message);
  }
  if (mndResult.status === 'rejected') {
    console.error('MND fetch failed:', mndResult.reason?.message);
  }

  const rates = fredResult.status === 'fulfilled' ? fredResult.value : cached?.rates || {};
  const mnd = mndResult.status === 'fulfilled' ? mndResult.value : cached?.mnd || {};

  const data = {
    rates,
    mnd,
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
