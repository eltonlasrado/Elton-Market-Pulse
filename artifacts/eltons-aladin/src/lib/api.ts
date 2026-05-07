const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

async function apiFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchIndices() {
  return apiFetch(`${API}/market/indices`);
}

export async function fetchQuotes(symbols?: string[]) {
  const url = symbols ? `${API}/market/quotes?symbols=${symbols.join(",")}` : `${API}/market/quotes`;
  return apiFetch(url);
}

export async function fetchTicker() {
  return apiFetch(`${API}/market/ticker`);
}

export async function fetchMovers() {
  return apiFetch(`${API}/market/movers`);
}

export async function fetchFiiDii() {
  return apiFetch(`${API}/market/fii-dii`);
}

export async function fetchNseOptionChain(symbol: string) {
  return apiFetch(`${API}/market/nse-option-chain?symbol=${encodeURIComponent(symbol)}`);
}

export async function fetchNseAllIndices() {
  return apiFetch(`${API}/market/nse-all-indices`);
}

export async function fetchChart(symbol: string, interval = "5m", range = "1d") {
  return apiFetch(`${API}/market/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
}

export async function fetchNews() {
  return apiFetch(`${API}/news/feed`);
}

export function formatPrice(price: number, currency = "₹") {
  if (price === undefined || price === null || isNaN(price)) return "—";
  if (price > 1000) return `${currency}${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${currency}${price.toFixed(2)}`;
}

export function formatChange(change: number, pct: number) {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
}

export function formatVolume(vol: number) {
  if (!vol) return "—";
  if (vol >= 1e7) return `${(vol / 1e7).toFixed(2)}Cr`;
  if (vol >= 1e5) return `${(vol / 1e5).toFixed(2)}L`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return vol.toString();
}

export function formatMarketCap(cap: number) {
  if (!cap) return "—";
  if (cap >= 1e12) return `₹${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `₹${(cap / 1e9).toFixed(2)}B`;
  return `₹${(cap / 1e6).toFixed(2)}M`;
}

export function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
