import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheFile = path.join(__dirname, '..', '..', 'data', 'cache.json');

export function loadCache() {
  if (!fs.existsSync(cacheFile)) return null;
  return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
}

export function saveCache(data) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}