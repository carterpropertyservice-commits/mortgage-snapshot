const USER_AGENT = 'Mozilla/5.0 (compatible; CPI-Snapshot/1.0; +https://Chris.IJCoastal.com)';

async function scrapeMndRates() {
  const res = await fetch('https://www.mortgagenewsdaily.com/mortgage-rates', {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`MND rates: ${res.status}`);
  const html = await res.text();

  // Try Next.js embedded JSON
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    const nextData = JSON.parse(nextMatch[1]);
    const props = nextData?.props?.pageProps;
    const rateData = props?.rates || props?.rateData || props?.mortgageRates;
    if (rateData) return parseNextRates(rateData);
  }

  // Try to find rate numbers in HTML via common patterns
  const ratePattern = /(\d\.\d{2})%/g;
  const found = [...html.matchAll(ratePattern)].map(m => parseFloat(m[1]));
  if (found.length >= 5) {
    // Sort ascending - mortgage rates cluster in 5-8% range currently
    const filtered = found.filter(r => r >= 4.5 && r <= 10.0);
    if (filtered.length >= 4) {
      filtered.sort((a, b) => b - a);
      return {
        jumbo: filtered[0],
        rate_30y: filtered[1] || null,
        fha: filtered[2] || null,
        va: filtered[3] || null,
        scraped: true
      };
    }
  }

  throw new Error('MND HTML parse failed');
}

function parseNextRates(rateData) {
  // Navigate common MND Next.js data structures
  const lookup = (obj, keys) => {
    for (const key of keys) {
      if (obj[key] !== undefined) return parseFloat(obj[key]);
    }
    return null;
  };

  return {
    rate_30y: lookup(rateData, ['thirtyYearFixed', 'rate30', 'conventional30']),
    rate_15y: lookup(rateData, ['fifteenYearFixed', 'rate15', 'conventional15']),
    fha: lookup(rateData, ['fha30', 'fhaRate', 'fha']),
    va: lookup(rateData, ['va30', 'vaRate', 'va']),
    jumbo: lookup(rateData, ['jumbo30', 'jumboRate', 'jumbo']),
    arm_76: lookup(rateData, ['arm76', 'sevenSixArm', 'arm7']),
    scraped: true
  };
}

function spreadEstimates(base30y, spreads) {
  const b = base30y;
  return {
    fha: parseFloat((b + spreads.fha).toFixed(2)),
    va: parseFloat((b + spreads.va).toFixed(2)),
    usda_low: parseFloat((b + spreads.usda_low).toFixed(2)),
    usda_high: parseFloat((b + spreads.usda_high).toFixed(2)),
    arm_76: parseFloat((b + spreads.arm_76).toFixed(2)),
    jumbo: parseFloat((b + spreads.jumbo).toFixed(2)),
    estimated: true
  };
}

export async function fetchExpandedRates(base30y, spec) {
  const spreads = spec.data.rate_spreads;
  try {
    const scraped = await scrapeMndRates();
    if (scraped && scraped.fha && scraped.va && scraped.jumbo) {
      console.log('MND rates scraped successfully');
      return {
        fha: scraped.fha,
        va: scraped.va,
        usda_low: spreads ? parseFloat((base30y + spreads.usda_low).toFixed(2)) : null,
        usda_high: spreads ? parseFloat((base30y + spreads.usda_high).toFixed(2)) : null,
        arm_76: scraped.arm_76 || parseFloat((base30y + spreads.arm_76).toFixed(2)),
        jumbo: scraped.jumbo,
        estimated: false
      };
    }
  } catch (err) {
    console.warn('MND rates scrape failed, using spread estimates:', err.message);
  }
  return spreadEstimates(base30y, spreads);
}
