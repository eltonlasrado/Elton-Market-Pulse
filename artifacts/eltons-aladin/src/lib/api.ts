const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/market`;

export async function fetchQuotes(symbols?: string[]) {
  const url = symbols ? `${API}/quotes?symbols=${symbols.join(",")}` : `${API}/quotes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch quotes");
  return res.json();
}

export async function fetchIndices() {
  const res = await fetch(`${API}/indices`);
  if (!res.ok) throw new Error("Failed to fetch indices");
  return res.json();
}

export async function fetchTicker() {
  const res = await fetch(`${API}/ticker`);
  if (!res.ok) throw new Error("Failed to fetch ticker");
  return res.json();
}

export async function fetchChart(symbol: string, interval = "5m", range = "1d") {
  const res = await fetch(`${API}/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
  if (!res.ok) throw new Error("Failed to fetch chart");
  return res.json();
}

export async function fetchOptions(symbol: string) {
  const res = await fetch(`${API}/options/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error("Failed to fetch options");
  return res.json();
}

export async function fetchMovers() {
  const res = await fetch(`${API}/movers`);
  if (!res.ok) throw new Error("Failed to fetch movers");
  return res.json();
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
