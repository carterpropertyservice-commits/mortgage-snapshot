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
  const s = spec.data.fred_series;

  const [
    mortgage_30y_daily,
    mortgage_15y_daily,
    mortgage_30y_weekly,
    mortgage_15y_weekly,
    treasury_10y
  ] = await Promise.all([
    fetchFredSeries(s.mortgage_30y_daily),
    fetchFredSeries(s.mortgage_15y_daily),
    fetchFredSeries(s.mortgage_30y_weekly),
    fetchFredSeries(s.mortgage_15y_weekly),
    fetchFredSeries(s.treasury_10y)
  ]);

  return {
    mortgage_30y_daily,
    mortgage_15y_daily,
    mortgage_30y_weekly,
    mortgage_15y_weekly,
    treasury_10y
  };
}
