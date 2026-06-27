async function fetchFredObservations(seriesId, limit = 14) {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY not set');
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`FRED ${seriesId}: ${res.status}`);
  const json = await res.json();
  return json.observations
    .map(o => ({ value: parseFloat(o.value), date: o.date }))
    .filter(o => !isNaN(o.value));
}

export async function fetchFredSeries(seriesId) {
  const obs = await fetchFredObservations(seriesId, 1);
  return { value: obs[0]?.value || null, date: obs[0]?.date || null };
}

function calcYoY(obs) {
  if (obs.length < 13) return null;
  const recent = obs[0].value;
  const prior = obs[12].value;
  return parseFloat(((recent - prior) / prior * 100).toFixed(1));
}

function calcTrend(obs) {
  if (obs.length < 3) return 'Steady';
  const [a, b, c] = obs;
  if (a.value < b.value && b.value <= c.value) return 'Easing';
  if (a.value > b.value && b.value >= c.value) return 'Rising';
  if (a.value < b.value) return 'Easing';
  if (a.value > b.value) return 'Rising';
  return 'Steady';
}

function trendLabel(trend, type) {
  if (type === 'unemployment') {
    if (trend === 'Easing') return 'Improving';
    if (trend === 'Rising') return 'Softening';
    return 'Steady';
  }
  return trend;
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
    fetchFredObservations(s.mortgage_30y_daily, 3),
    fetchFredObservations(s.mortgage_15y_daily, 3),
    fetchFredObservations(s.mortgage_30y_weekly, 3),
    fetchFredObservations(s.mortgage_15y_weekly, 3),
    fetchFredObservations(s.treasury_10y, 3)
  ]);

  return {
    mortgage_30y_daily: mortgage_30y_daily[0],
    mortgage_15y_daily: mortgage_15y_daily[0],
    mortgage_30y_weekly: mortgage_30y_weekly[0],
    mortgage_15y_weekly: mortgage_15y_weekly[0],
    treasury_10y: treasury_10y[0],
    treasury_10y_trend: calcTrend(treasury_10y)
  };
}

export async function fetchMacroData(spec) {
  const s = spec.data.fred_series;

  const [cpiObs, unrateObs, wagesObs] = await Promise.all([
    fetchFredObservations(s.cpi, 14),
    fetchFredObservations(s.unemployment, 4),
    fetchFredObservations(s.wages, 14)
  ]);

  const cpiYoY = calcYoY(cpiObs);
  const wagesYoY = calcYoY(wagesObs);
  const cpiTrend = calcTrend(cpiObs);
  const unrateTrend = calcTrend(unrateObs);
  const wagesTrend = calcTrend(wagesObs);

  const wagesVsInflation = (wagesYoY !== null && cpiYoY !== null)
    ? parseFloat((wagesYoY - cpiYoY).toFixed(1))
    : null;

  return {
    cpi: {
      yoy: cpiYoY,
      trend: cpiTrend,
      trend_label: trendLabel(cpiTrend, 'cpi'),
      date: cpiObs[0]?.date
    },
    unemployment: {
      value: unrateObs[0]?.value?.toFixed(1) || null,
      trend: unrateTrend,
      trend_label: trendLabel(unrateTrend, 'unemployment'),
      date: unrateObs[0]?.date
    },
    wages: {
      yoy: wagesYoY,
      trend: wagesTrend,
      trend_label: trendLabel(wagesTrend, 'wages'),
      vs_inflation: wagesVsInflation,
      vs_inflation_positive: wagesVsInflation !== null && wagesVsInflation > 0,
      date: wagesObs[0]?.date
    }
  };
}
