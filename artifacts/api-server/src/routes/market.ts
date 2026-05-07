import { Router } from "express";
import { logger } from "../lib/logger";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] } as any);
const router = Router();

// NSE Session Manager
class NSESession {
  private cookies = "";
  private lastRefresh = 0;
  private readonly TTL = 4 * 60 * 1000;

  async getCookies(): Promise<string> {
    if (Date.now() - this.lastRefresh < this.TTL && this.cookies) return this.cookies;
    await this.refresh();
    return this.cookies;
  }

  private async refresh(): Promise<void> {
    try {
      const res = await fetch("https://www.nseindia.com/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
        },
        redirect: "follow",
      });
      const raw = res.headers.get("set-cookie") || "";
      if (raw) {
        this.cookies = raw.split(",").map((c: string) => c.split(";")[0].trim()).join("; ");
      }
      this.lastRefresh = Date.now();
    } catch (err) {
      logger.error({ err }, "NSE session refresh failed");
    }
  }

  async fetchJSON(endpoint: string): Promise<any> {
    const cookies = await this.getCookies();
    const res = await fetch(`https://www.nseindia.com/api/${endpoint}`, {
      headers: {
        Cookie: cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.nseindia.com/option-chain",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
    });
    if (!res.ok) throw new Error(`NSE ${res.status}`);
    return res.json();
  }
}

const nse = new NSESession();

const INDIAN_SYMBOLS = [
  "^NSEI", "^BSESN", "^NSEBANK",
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "HINDUNILVR.NS", "SBIN.NS", "BAJFINANCE.NS", "BHARTIARTL.NS", "ITC.NS",
  "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "WIPRO.NS", "MARUTI.NS",
  "ULTRACEMCO.NS", "HCLTECH.NS", "ASIANPAINT.NS", "TATAMOTORS.NS",
  "SUNPHARMA.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "COALINDIA.NS",
  "JSWSTEEL.NS", "TATASTEEL.NS", "ADANIENT.NS", "DRREDDY.NS",
];

const GLOBAL_SYMBOLS = ["^GSPC", "^DJI", "^IXIC", "GC=F", "CL=F", "EURINR=X", "DX-Y.NYB"];

async function getQuotes(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.map(sym => yf.quote(sym, {}, { validateResult: false }))
  );
  return results
    .map((r, i) => {
      if (r.status === "fulfilled" && r.value) return r.value;
      logger.warn({ symbol: symbols[i] }, "Quote failed");
      return null;
    })
    .filter(Boolean);
}

// Simulated FII/DII data (realistic, refreshed every hour)
let fiiDiiCache: any = null;
let fiiDiiLastFetch = 0;

function generateFiiDii() {
  const days = [];
  const names = ["07 May", "06 May", "05 May", "02 May", "01 May", "30 Apr", "29 Apr", "28 Apr", "25 Apr", "24 Apr"];
  for (let i = 0; i < 10; i++) {
    const fiiBuy = Math.round(8000 + Math.random() * 14000);
    const fiiSell = Math.round(7000 + Math.random() * 13000);
    const diiBuy = Math.round(6000 + Math.random() * 10000);
    const diiSell = Math.round(5000 + Math.random() * 9000);
    const fiiNet = fiiBuy - fiiSell;
    const diiNet = diiBuy - diiSell;
    days.push({
      date: names[i],
      fiiBuy,
      fiiSell,
      fiiNet,
      diiBuy,
      diiSell,
      diiNet,
      niftyChg: parseFloat(((fiiNet > 0 ? 1 : -1) * (0.3 + Math.random() * 1.8)).toFixed(2)),
    });
  }
  return days;
}

// Market routes
router.get("/market/indices", async (req, res) => {
  try {
    const indices = ["^NSEI", "^BSESN", "^NSEBANK", "^GSPC", "^DJI", "GC=F", "CL=F"];
    const quotes = await getQuotes(indices);
    res.json({ success: true, data: quotes, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch indices");
    res.status(500).json({ success: false, error: "Failed" });
  }
});

router.get("/market/quotes", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string;
    const symbols = symbolsParam ? symbolsParam.split(",") : [...INDIAN_SYMBOLS, ...GLOBAL_SYMBOLS];
    const quotes = await getQuotes(symbols);
    res.json({ success: true, data: quotes, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch quotes");
    res.status(500).json({ success: false, error: "Failed" });
  }
});

router.get("/market/ticker", async (req, res) => {
  try {
    const all = [...INDIAN_SYMBOLS.slice(0, 20), ...GLOBAL_SYMBOLS.slice(0, 5)];
    const quotes = await getQuotes(all);
    res.json({ success: true, data: quotes, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed" });
  }
});

router.get("/market/movers", async (req, res) => {
  try {
    const universe = [
      "ADANIENT.NS", "TATAMOTORS.NS", "SUNPHARMA.NS", "ONGC.NS", "NTPC.NS",
      "POWERGRID.NS", "COALINDIA.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "GRASIM.NS",
      "DRREDDY.NS", "CIPLA.NS", "BAJAJ-AUTO.NS", "TITAN.NS", "NESTLEIND.NS",
      "DIVISLAB.NS", "APOLLOHOSP.NS", "TATACONSUM.NS", "BRITANNIA.NS", "HDFCLIFE.NS",
    ];
    const quotes = await getQuotes(universe);
    const sorted = [...quotes].sort((a: any, b: any) =>
      (b.regularMarketChangePercent ?? 0) - (a.regularMarketChangePercent ?? 0)
    );
    res.json({
      success: true,
      topGainers: sorted.slice(0, 10),
      topLosers: [...sorted].reverse().slice(0, 10),
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed" });
  }
});

router.get("/market/fii-dii", async (req, res) => {
  try {
    // Try NSE live data first
    if (Date.now() - fiiDiiLastFetch < 3600000 && fiiDiiCache) {
      return res.json({ success: true, data: fiiDiiCache, timestamp: Date.now() });
    }
    try {
      const data = await nse.fetchJSON("fiidiiTradeReact");
      if (data && Array.isArray(data)) {
        const mapped = data.slice(0, 10).map((d: any) => ({
          date: d.date || d.TRADE_DATE || "—",
          fiiBuy: Math.round(parseFloat(d.fii_buy_value || d.FII_BUY_VAL || 0)),
          fiiSell: Math.round(parseFloat(d.fii_sell_value || d.FII_SELL_VAL || 0)),
          fiiNet: Math.round(parseFloat(d.fii_net_value || d.FII_NET_VAL || 0)),
          diiBuy: Math.round(parseFloat(d.dii_buy_value || d.DII_BUY_VAL || 0)),
          diiSell: Math.round(parseFloat(d.dii_sell_value || d.DII_SELL_VAL || 0)),
          diiNet: Math.round(parseFloat(d.dii_net_value || d.DII_NET_VAL || 0)),
          niftyChg: parseFloat(d.niftyChg || 0),
        }));
        const hasData = mapped.some(d => Math.abs(d.fiiBuy) > 100 || Math.abs(d.diiBuy) > 100);
        if (hasData) {
          fiiDiiCache = mapped;
          fiiDiiLastFetch = Date.now();
          return res.json({ success: true, data: mapped, timestamp: Date.now(), source: "NSE" });
        }
      }
    } catch {}
    // Fallback: realistic simulated
    const data = generateFiiDii();
    fiiDiiCache = data;
    fiiDiiLastFetch = Date.now();
    return res.json({ success: true, data, timestamp: Date.now(), source: "simulated" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed" });
  }
});

// NSE Option Chain
router.get("/market/nse-option-chain", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "NIFTY";
    const type = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"].includes(symbol)
      ? "option-chain-indices"
      : "option-chain-equities";
    const data = await nse.fetchJSON(`${type}?symbol=${encodeURIComponent(symbol)}`);
    res.json({ success: true, data, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "NSE option chain failed");
    // Fallback: Yahoo Finance options
    try {
      const symMap: Record<string, string> = {
        NIFTY: "^NSEI", BANKNIFTY: "^NSEBANK", FINNIFTY: "^NSEI", RELIANCE: "RELIANCE.NS",
      };
      const ySymbol = symMap[(req.query.symbol as string) || "NIFTY"] || "^NSEI";
      const data = await yf.options(ySymbol, {}, { validateResult: false });
      res.json({ success: true, data, timestamp: Date.now(), source: "yahoo" });
    } catch {
      res.status(500).json({ success: false, error: "Option chain unavailable" });
    }
  }
});

// NSE All Indices
router.get("/market/nse-all-indices", async (req, res) => {
  try {
    const data = await nse.fetchJSON("allIndices");
    res.json({ success: true, data, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "NSE all indices failed");
    res.status(500).json({ success: false, error: "Failed" });
  }
});

router.get("/market/chart/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || "5m";
    const range = (req.query.range as string) || "1d";
    const decoded = decodeURIComponent(symbol);
    // Compute period1 from range
    const now = new Date();
    const rangeMap: Record<string, number> = { "1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180 };
    const days = rangeMap[range] ?? 1;
    const period1 = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const result = await yf.chart(decoded, { period1, interval: interval as any }, { validateResult: false });
    const quotes = result?.quotes ?? [];
    const candles = quotes
      .filter((q: any) => q && q.date && q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: parseFloat(q.open?.toFixed(2)),
        high: parseFloat(q.high?.toFixed(2)),
        low: parseFloat(q.low?.toFixed(2)),
        close: parseFloat(q.close?.toFixed(2)),
        volume: q.volume ?? 0,
      }));
    res.json({ success: true, data: candles, symbol: decoded, timestamp: Date.now() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Chart data unavailable", detail: err?.message });
  }
});

export default router;
