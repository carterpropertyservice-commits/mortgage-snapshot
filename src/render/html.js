import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const fmt = n => n ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';
const pct = n => n ? n.toFixed(2) + '%' : '—';

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
  const fha = spec.loan_limits.fha_forward_hud[county];

  const view = {
    ...spec,
    logoDataUrl,
    qrDataUrl,
    fromCache: data.fromCache,
    cacheTime: data.fetchedAt ? new Date(data.fetchedAt).toLocaleString('en-US', { timeZone: spec.data.timezone }) : '',
    updatedAt: new Date().toLocaleString('en-US', { timeZone: spec.data.timezone, dateStyle: 'full', timeStyle: 'short' }),
    mnd: data.mnd,
    rates: {
  mortgage_30y_daily: {
    display: pct(data.rates.mortgage_30y_daily?.value),
    date: data.rates.mortgage_30y_daily?.date
  },
  mortgage_15y_daily: {
    display: pct(data.rates.mortgage_15y_daily?.value),
    date: data.rates.mortgage_15y_daily?.date
  },
  mortgage_30y_weekly: {
    display: pct(data.rates.mortgage_30y_weekly?.value),
    date: data.rates.mortgage_30y_weekly?.date
  },
  mortgage_15y_weekly: {
    display: pct(data.rates.mortgage_15y_weekly?.value),
    date: data.rates.mortgage_15y_weekly?.date
  },
  treasury_10y: {
    display: pct(data.rates.treasury_10y?.value),
    date: data.rates.treasury_10y?.date
  }
},
    limits: {
      conv: { u1: fmt(conv['1']), u2: fmt(conv['2']), u3: fmt(conv['3']), u4: fmt(conv['4']) },
      fha: { u1: fmt(fha['1']), u2: fmt(fha['2']), u3: fmt(fha['3']), u4: fmt(fha['4']) }
    }
  };

  const html = Mustache.render(template, view);
  const cssPath = path.join(__dirname, 'css', 'snapshot.css');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const finalHtml = html.replace('<link rel="stylesheet" href="css/snapshot.css">', `<style>${css}</style>`);

  fs.writeFileSync(path.join(root, 'public', 'index.html'), finalHtml);
  console.log('Built index.html');
}
