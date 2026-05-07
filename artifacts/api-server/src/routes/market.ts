import { Router } from "express";
import { logger } from "../lib/logger";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

const router = Router();

const INDIAN_SYMBOLS = [
  "^NSEI", "^BSESN", "^NSEBANK",
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "HINDUNILVR.NS", "SBIN.NS", "BAJFINANCE.NS", "BHARTIARTL.NS", "ITC.NS",
  "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "WIPRO.NS", "MARUTI.NS",
  "ULTRACEMCO.NS", "HCLTECH.NS", "ASIANPAINT.NS"
];

const GLOBAL_SYMBOLS = ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "^GSPC", "^DJI", "^IXIC", "GC=F", "CL=F"];

async function getQuotes(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.map(sym => yf.quote(sym, {}, { validateResult: false }))
  );
  return results
    .map((r, i) => {
      if (r.status === "fulfilled" && r.value) return r.value;
      logger.warn({ symbol: symbols[i] }, "Failed to fetch quote");
      return null;
    })
    .filter(Boolean);
}

router.get("/market/quotes", async (req, res) => {
  try {
    const symbolsParam = req.query.symbols as string;
    const symbols = symbolsParam ? symbolsParam.split(",") : [...INDIAN_SYMBOLS, ...GLOBAL_SYMBOLS];
    const quotes = await getQuotes(symbols);
    res.json({ success: true, data: quotes, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch market quotes");
    res.status(500).json({ success: false, error: "Failed to fetch market data" });
  }
});

router.get("/market/indices", async (req, res) => {
  try {
    const indices = ["^NSEI", "^BSESN", "^NSEBANK", "^GSPC", "^DJI", "GC=F", "CL=F"];
    const quotes = await getQuotes(indices);
    res.json({ success: true, data: quotes, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch indices");
    res.status(500).json({ success: false, error: "Failed to fetch indices" });
  }
});

router.get("/market/ticker", async (req, res) => {
  try {
    const all = [...INDIAN_SYMBOLS, ...GLOBAL_SYMBOLS];
    const quotes = await getQuotes(all);
    res.json({ success: true, data: quotes, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch ticker data");
    res.status(500).json({ success: false, error: "Failed to fetch ticker" });
  }
});

router.get("/market/chart/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || "5m";
    const range = (req.query.range as string) || "1d";
    const data = await yf.chart(symbol, {
      interval: interval as any,
      range: range as any,
    }, { validateResult: false });
    res.json({ success: true, data, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch chart data");
    res.status(500).json({ success: false, error: "Failed to fetch chart data" });
  }
});

router.get("/market/options/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await yf.options(symbol, {}, { validateResult: false });
    res.json({ success: true, data, timestamp: Date.now() });
  } catch (err) {
    logger.error({ err }, "Failed to fetch options data");
    res.status(500).json({ success: false, error: "Failed to fetch options data" });
  }
});

router.get("/market/movers", async (req, res) => {
  try {
    const gainers = [
      "ADANIENT.NS", "TATAMOTORS.NS", "SUNPHARMA.NS", "ONGC.NS", "NTPC.NS",
      "POWERGRID.NS", "COALINDIA.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "GRASIM.NS"
    ];
    const quotes = await getQuotes(gainers);
    const sorted = [...quotes].sort((a: any, b: any) =>
      (b.regularMarketChangePercent ?? 0) - (a.regularMarketChangePercent ?? 0)
    );
    res.json({
      success: true,
      topGainers: sorted.slice(0, 5),
      topLosers: sorted.reverse().slice(0, 5),
      timestamp: Date.now()
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch movers");
    res.status(500).json({ success: false, error: "Failed to fetch movers" });
  }
});

export default router;
