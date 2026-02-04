export async function fetchMndRss(spec) {
  const res = await fetch(spec.data.mnd_rss_url);
  if (!res.ok) throw new Error(`MND RSS: ${res.status}`);
  const text = await res.text();
  const itemMatch = text.match(/<item>([\s\S]*?)<\/item>/);
  if (!itemMatch) return { title: 'Rate update available', link: spec.data.mnd_rss_url, pubDate: null };
  const item = itemMatch[1];
  const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] 
             || item.match(/<title>(.*?)<\/title>/)?.[1] 
             || 'Rate update available';
  const link = item.match(/<link>(.*?)<\/link>/)?.[1] || spec.data.mnd_rss_url;
  const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || null;
  return { title, link, pubDate };
}