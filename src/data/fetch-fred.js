export async function fetchFredSeries(seriesId) {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY not set');
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: ${res.status}`);
  const json = await res.json();
  const obs = json.observations?.[0];
  return { value: parseFloat(obs?.value) || null, date: obs?.date || null };
}

export async function fetchAllFred(spec) {
  const series = spec.data.fred_series;
  const [mortgage_30y, mortgage_15y, treasury_10y] = await Promise.all([
    fetchFredSeries(series.mortgage_30y),
    fetchFredSeries(series.mortgage_15y),
    fetchFredSeries(series.treasury_10y)
  ]);
  return { mortgage_30y, mortgage_15y, treasury_10y };
}