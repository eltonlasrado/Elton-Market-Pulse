import { Router } from "express";
import { logger } from "../lib/logger";
import RSSParser from "rss-parser";

const router = Router();
const parser = new RSSParser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; AladinBot/1.0)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

interface NewsItem {
  title: string;
  link?: string;
  pubDate?: string;
  source: string;
  category?: string;
  sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
  snippet?: string;
}

const SOURCES = [
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/latestnews.xml", category: "GENERAL" },
  { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rss.cms", category: "MARKETS" },
  { name: "Mint Markets", url: "https://www.livemint.com/rss/markets", category: "MARKETS" },
  { name: "Business Standard", url: "https://www.business-standard.com/rss/home_page_top_stories.rss", category: "GENERAL" },
];

const INDIAN_KEYWORDS = [
  "nifty", "sensex", "bse", "nse", "sebi", "rbi", "india", "indian", "rupee", "inr",
  "reliance", "tcs", "infosys", "hdfc", "icici", "sbi", "axis", "kotak", "wipro",
  "ipo", "fii", "dii", "fpi", "mutual fund", "stock", "share", "equity", "market",
  "trading", "options", "futures", "f&o", "derivative", "nifty50", "bank nifty",
];

function detectSentiment(text: string): "BULLISH" | "BEARISH" | "NEUTRAL" {
  const lower = text.toLowerCase();
  const bullish = ["gain", "rise", "up", "surge", "rally", "jump", "strong", "positive", "bull", "breakout", "buy", "higher", "profit", "growth", "record"];
  const bearish = ["fall", "drop", "down", "decline", "slump", "crash", "weak", "negative", "bear", "breakdown", "sell", "lower", "loss", "concern", "risk"];
  const bScore = bullish.filter(w => lower.includes(w)).length;
  const bsScore = bearish.filter(w => lower.includes(w)).length;
  if (bScore > bsScore) return "BULLISH";
  if (bsScore > bScore) return "BEARISH";
  return "NEUTRAL";
}

function isIndianMarketNews(text: string): boolean {
  const lower = text.toLowerCase();
  return INDIAN_KEYWORDS.some(kw => lower.includes(kw));
}

let cache: { items: NewsItem[]; lastFetch: number } = { items: [], lastFetch: 0 };
const CACHE_TTL = 60000; // 1 minute

async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return (feed.items || []).slice(0, 15).map((item) => ({
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        category: source.category,
        sentiment: detectSentiment((item.title || "") + " " + (item.contentSnippet || "")),
        snippet: (item.contentSnippet || "").substring(0, 120),
      }));
    })
  );

  const allItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      const items = result.value.filter(item => isIndianMarketNews(item.title));
      allItems.push(...items);
    }
  }

  // Sort by date, newest first
  allItems.sort((a, b) => {
    const da = new Date(a.pubDate || 0).getTime();
    const db = new Date(b.pubDate || 0).getTime();
    return db - da;
  });

  return allItems.slice(0, 50);
}

router.get("/news/feed", async (req, res) => {
  try {
    const now = Date.now();
    if (now - cache.lastFetch < CACHE_TTL && cache.items.length > 0) {
      return res.json({ success: true, data: cache.items, timestamp: now, cached: true });
    }
    const items = await fetchAllNews();
    cache = { items, lastFetch: now };
    res.json({ success: true, data: items, timestamp: now });
  } catch (err) {
    logger.error({ err }, "News feed failed");
    // Return cached if available
    if (cache.items.length > 0) {
      return res.json({ success: true, data: cache.items, timestamp: Date.now(), cached: true });
    }
    res.status(500).json({ success: false, error: "News unavailable" });
  }
});

export default router;
