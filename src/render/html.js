import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const fmt  = n => n ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';
const pct  = n => (n !== null && n !== undefined && !isNaN(n)) ? n.toFixed(2) + '%' : '—';
const pct1 = n => (n !== null && n !== undefined && !isNaN(n)) ? n.toFixed(1) + '%' : '—';

function dirArrow(trend) {
  if (trend === 'Easing' || trend === 'Improving') return '↓';
  if (trend === 'Rising' || trend === 'Softening') return '↑';
  return '→';
}

function trendClass(trend, invert = false) {
  const up = invert ? 'good' : 'rising';
  const down = invert ? 'rising' : 'good';
  if (trend === 'Rising' || trend === 'Softening') return up;
  if (trend === 'Easing' || trend === 'Improving') return down;
  return 'steady';
}

export async function buildHtml(spec, data) {
  const templatePath = path.join(__dirname, 'templates', 'index.mustache');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const logoPath = path.join(root, spec.layout.logo_path);
  const logoDataUrl = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
    : '';

  const qrDataUrl = await QRCode.toDataURL(spec.brand.lead_url, { width: 120, margin: 1 });

  const county = spec.region.counties[0];
  const conv = spec.loan_limits.conventional_fhfa[county];
  const fha  = spec.loan_limits.fha_forward_hud[county];

  // --- Rates ---
  const r = data.rates || {};
  const ex = data.expandedRates || {};
  const m = data.macro || {};
  const base30y = r.mortgage_30y_daily?.value || r.mortgage_30y_weekly?.value || null;

  const rateTrend30 = (r.mortgage_30y_daily?.value && r.mortgage_30y_weekly?.value)
    ? (r.mortgage_30y_daily.value > r.mortgage_30y_weekly.value ? 'Rising' : 'Easing')
    : 'Steady';

  const t10trend = r.treasury_10y_trend || 'Steady';

  // --- At-a-Glance ---
  const glance = {
    rate_30y:         pct(base30y),
    rate_30y_label:   rateTrend30 === 'Easing' ? 'Stable ↓' : rateTrend30 === 'Rising' ? 'Watch ↑' : 'Stable →',
    rate_class:       trendClass(rateTrend30, true),
    inflation:        m.cpi ? pct1(m.cpi.yoy) : '—',
    inflation_label:  m.cpi?.trend_label || '—',
    inflation_class:  m.cpi ? trendClass(m.cpi.trend, true) : 'steady',
    jobs:             m.unemployment ? m.unemployment.value + '%' : '—',
    jobs_label:       m.unemployment?.trend_label || '—',
    jobs_class:       m.unemployment ? trendClass(m.unemployment.trend, true) : 'steady',
    wages:            m.wages?.yoy !== null ? '+' + pct1(m.wages?.yoy) : '—',
    wages_label:      m.wages?.trend_label || '—',
    wages_class:      m.wages ? trendClass(m.wages.trend) : 'steady'
  };

  // --- Expanded rates ---
  const rates = {
    mortgage_30y: { display: pct(r.mortgage_30y_daily?.value || r.mortgage_30y_weekly?.value),  date: r.mortgage_30y_daily?.date  || r.mortgage_30y_weekly?.date },
    mortgage_15y: { display: pct(r.mortgage_15y_daily?.value || r.mortgage_15y_weekly?.value),  date: r.mortgage_15y_daily?.date  || r.mortgage_15y_weekly?.date },
    treasury_10y: { display: pct(r.treasury_10y?.value), date: r.treasury_10y?.date, direction: t10trend + ' ' + dirArrow(t10trend) },
    fha:    { display: pct(ex.fha)     },
    va:     { display: pct(ex.va)      },
    usda:   { display: (ex.usda_low && ex.usda_high) ? pct(ex.usda_low) + '–' + pct(ex.usda_high) : '—' },
    arm_76: { display: pct(ex.arm_76)  },
    jumbo:  { display: pct(ex.jumbo)   },
    estimated: !!ex.estimated
  };

  // --- Macro ---
  const macro = {
    inflation:        m.cpi ? pct1(m.cpi.yoy) + ' ' + dirArrow(m.cpi.trend) : '—',
    inflation_label:  m.cpi?.trend_label || '',
    unemployment:     m.unemployment ? m.unemployment.value + '%' + ' ' + dirArrow(m.unemployment.trend) : '—',
    unemployment_label: m.unemployment?.trend_label || '',
    treasury:         pct(r.treasury_10y?.value) + ' ' + dirArrow(t10trend),
    treasury_label:   t10trend === 'Easing' ? 'Sideways/Down' : t10trend === 'Rising' ? 'Rising' : 'Sideways',
    wages_yoy:        m.wages?.yoy !== null ? '+' + pct1(m.wages?.yoy) : '—',
    wages_label:      m.wages?.trend_label || '',
    wages_vs_inflation: m.wages?.vs_inflation !== null ? (m.wages?.vs_inflation >= 0 ? '+' : '') + m.wages?.vs_inflation + '%' : '—',
    wages_vs_positive: m.wages?.vs_inflation_positive
  };

  const view = {
    ...spec,
    logoDataUrl,
    qrDataUrl,
    fromCache: data.fromCache,
    cacheTime: data.fetchedAt
      ? new Date(data.fetchedAt).toLocaleString('en-US', { timeZone: spec.data.timezone })
      : '',
    updatedAt: new Date().toLocaleString('en-US', {
      timeZone: spec.data.timezone,
      dateStyle: 'full',
      timeStyle: 'short'
    }),
    mnd: data.mnd,
    glance,
    rates,
    macro,
    limits: {
      conv: { u1: fmt(conv['1']), u2: fmt(conv['2']), u3: fmt(conv['3']), u4: fmt(conv['4']) },
      fha:  { u1: fmt(fha['1']),  u2: fmt(fha['2']),  u3: fmt(fha['3']),  u4: fmt(fha['4'])  }
    }
  };

  const html = Mustache.render(template, view);

  const cssPath = path.join(__dirname, 'css', 'snapshot.css');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const finalHtml = html.replace(
    '<link rel="stylesheet" href="css/snapshot.css">',
    `<style>${css}</style>`
  );

  fs.writeFileSync(path.join(root, 'public', 'index.html'), finalHtml);
  console.log('Built index.html');
}
