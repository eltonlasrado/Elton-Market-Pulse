import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import MarketCard from "@/components/MarketCard";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchIndices, fetchQuotes, fetchMovers, fetchFiiDii, fetchNews, formatVolume, timeAgo } from "@/lib/api";

interface Quote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
}

const NIFTY50_STOCKS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
  "HINDUNILVR.NS","SBIN.NS","BAJFINANCE.NS","BHARTIARTL.NS","ITC.NS",
  "KOTAKBANK.NS","LT.NS","AXISBANK.NS","WIPRO.NS","MARUTI.NS",
  "ULTRACEMCO.NS","HCLTECH.NS","ASIANPAINT.NS","TATAMOTORS.NS","SUNPHARMA.NS",
];

const AI_SIGNALS = [
  { symbol: "NIFTY 50", action: "BUY" as const, entry: "24,450", sl: "24,200", target: "24,900", confidence: 87, type: "F&O", reason: "Bullish engulfing on daily, RSI 58, above VWAP, call OI buildup", indicators: "RSI: 58 | MACD: +12.4 | VWAP: 24,380" },
  { symbol: "BANK NIFTY", action: "BUY" as const, entry: "52,100", sl: "51,700", target: "53,000", confidence: 79, type: "F&O", reason: "Golden cross EMA20/50, strong FII inflow, PCR > 1.3", indicators: "RSI: 62 | EMA20/50 Cross | PCR: 1.32" },
  { symbol: "RELIANCE", action: "SELL" as const, entry: "2,940", sl: "2,975", target: "2,870", confidence: 72, type: "Stocks", reason: "Bearish MACD cross, resistance at 2,960, heavy call writing", indicators: "RSI: 67 | MACD: -8.2 | Resistance: 2,960" },
  { symbol: "TCS", action: "BUY" as const, entry: "4,150", sl: "4,080", target: "4,280", confidence: 83, type: "Stocks", reason: "Morning star pattern, 52W high breakout zone, volume surge 2x", indicators: "RSI: 54 | Volume: 2.1x avg | Pattern: Morning Star" },
  { symbol: "HDFC BANK", action: "BUY" as const, entry: "1,890", sl: "1,860", target: "1,950", confidence: 76, type: "F&O", reason: "Bullish OI buildup, call writing unwinding, VWAP support", indicators: "RSI: 57 | OI: +14% | VWAP: 1,878" },
  { symbol: "MIDCAP NIFTY", action: "BUY" as const, entry: "52,800", sl: "52,400", target: "53,800", confidence: 69, type: "F&O", reason: "Ascending triangle breakout with volume, breadth positive 72%", indicators: "RSI: 61 | Pattern: Ascending Triangle | Breadth: 72%" },
];

const TV_MAP: Record<string, string> = {
  "^NSEI": "NSE:NIFTY50",
  "^BSESN": "BSE:SENSEX",
  "^NSEBANK": "NSE:BANKNIFTY",
  "^GSPC": "SP:SPX",
  "GC=F": "COMEX:GC1!",
  "CL=F": "NYMEX:CL1!",
};

export default function Dashboard() {
  const [indices, setIndices] = useState<Quote[]>([]);
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [movers, setMovers] = useState<{ topGainers: Quote[]; topLosers: Quote[] }>({ topGainers: [], topLosers: [] });
  const [fiiDii, setFiiDii] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("NSE:NIFTY50");
  const [signalFilter, setSignalFilter] = useState<"All" | "BUY" | "SELL">("All");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadData = useCallback(async () => {
    const [idxRes, stkRes, mvrRes, fiiRes, newsRes] = await Promise.allSettled([
      fetchIndices(),
      fetchQuotes(NIFTY50_STOCKS),
      fetchMovers(),
      fetchFiiDii(),
      fetchNews(),
    ]);
    if (idxRes.status === "fulfilled" && idxRes.value.success) setIndices(idxRes.value.data || []);
    if (stkRes.status === "fulfilled" && stkRes.value.success) setStocks(stkRes.value.data || []);
    if (mvrRes.status === "fulfilled" && mvrRes.value.success)
      setMovers({ topGainers: mvrRes.value.topGainers || [], topLosers: mvrRes.value.topLosers || [] });
    if (fiiRes.status === "fulfilled" && fiiRes.value.success) setFiiDii(fiiRes.value.data || []);
    if (newsRes.status === "fulfilled" && newsRes.value.success) setNews(newsRes.value.data || []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  const mainIndices = indices.filter(q => ["^NSEI","^BSESN","^NSEBANK","^GSPC","GC=F","CL=F"].includes(q.symbol));
  const filteredSignals = AI_SIGNALS.filter(s => signalFilter === "All" || s.action === signalFilter);
  const todayFii = fiiDii[0];
  const niftyQuote = indices.find(q => q.symbol === "^NSEI");

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">MARKET COMMAND CENTER</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Live NSE • BSE • Global Markets • AI Signals • FII/DII Flow</p>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
            <span className="text-[hsl(220,20%,35%)]">SYNC: <span className="text-[hsl(168,100%,45%)]">{lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span></span>
            <button onClick={loadData} className="px-2 py-1 rounded text-[9px] bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green hover:bg-[rgba(0,255,180,0.2)]">↺ REFRESH</button>
          </div>
        </div>

        {/* Indices strip */}
        {loading ? (
          <div className="grid grid-cols-6 gap-2">{Array(6).fill(0).map((_, i) => <div key={i} className="glass-card rounded-lg h-20 animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {mainIndices.map(q => (
              <MarketCard key={q.symbol} quote={q} compact onClick={() => { const s = TV_MAP[q.symbol]; if (s) setSelectedSymbol(s); }} />
            ))}
          </div>
        )}

        {/* Main grid: Chart + FII/DII + Signals */}
        <div className="grid grid-cols-12 gap-3">

          {/* Chart - 8 cols */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART</span>
                  <span className="text-[8px] text-[hsl(220,20%,38%)]">RSI • MACD • BB</span>
                </div>
                <div className="flex gap-1">
                  {[["^NSEI","NIFTY"],["^BSESN","SENSEX"],["^NSEBANK","BANK NF"],["GC=F","GOLD"],["CL=F","OIL"]].map(([sym, label]) => (
                    <button key={sym} onClick={() => setSelectedSymbol(TV_MAP[sym] || sym)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold ${selectedSymbol === TV_MAP[sym] ? "bg-[rgba(0,255,180,0.2)] neon-green" : "text-[hsl(220,20%,40%)] hover:text-[hsl(180,60%,70%)]"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <TradingViewWidget symbol={selectedSymbol} height={380} />
            </div>

            {/* FII/DII Flow */}
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)] tracking-wider">FII / DII INSTITUTIONAL FLOW</span>
                {todayFii && (
                  <div className="flex items-center gap-3 text-[8px]">
                    <span className={todayFii.fiiNet >= 0 ? "neon-green" : "neon-red"}>
                      FII: {todayFii.fiiNet >= 0 ? "+" : "-"}₹{Math.abs(todayFii.fiiNet).toLocaleString("en-IN")}Cr
                    </span>
                    <span className={todayFii.diiNet >= 0 ? "neon-green" : "neon-red"}>
                      DII: {todayFii.diiNet >= 0 ? "+" : "-"}₹{Math.abs(todayFii.diiNet).toLocaleString("en-IN")}Cr
                    </span>
                  </div>
                )}
              </div>
              <div className="overflow-auto">
                <table className="w-full text-[8px]">
                  <thead>
                    <tr className="text-[hsl(220,20%,35%)]">
                      {["DATE","FII BUY","FII SELL","FII NET","DII BUY","DII SELL","DII NET","NIFTY %"].map(h => (
                        <th key={h} className="px-2 py-1 text-right first:text-left font-bold tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(fiiDii.length ? fiiDii : Array(5).fill(null)).map((row, i) => (
                      <tr key={i} className="border-t border-[rgba(255,255,255,0.03)]">
                        <td className="px-2 py-1 text-[hsl(180,40%,60%)]">{row?.date || "—"}</td>
                        <td className="px-2 py-1 text-right text-[hsl(168,80%,45%)] tabular-nums">{row ? `₹${row.fiiBuy.toLocaleString("en-IN")}Cr` : "—"}</td>
                        <td className="px-2 py-1 text-right text-[hsl(0,80%,55%)] tabular-nums">{row ? `₹${row.fiiSell.toLocaleString("en-IN")}Cr` : "—"}</td>
                        <td className={`px-2 py-1 text-right tabular-nums font-bold ${!row ? "" : row.fiiNet >= 0 ? "neon-green" : "neon-red"}`}>{row ? `${row.fiiNet >= 0 ? "+" : ""}₹${Math.abs(row.fiiNet).toLocaleString("en-IN")}Cr` : "—"}</td>
                        <td className="px-2 py-1 text-right text-[hsl(168,80%,45%)] tabular-nums">{row ? `₹${row.diiBuy.toLocaleString("en-IN")}Cr` : "—"}</td>
                        <td className="px-2 py-1 text-right text-[hsl(0,80%,55%)] tabular-nums">{row ? `₹${row.diiSell.toLocaleString("en-IN")}Cr` : "—"}</td>
                        <td className={`px-2 py-1 text-right tabular-nums font-bold ${!row ? "" : row.diiNet >= 0 ? "neon-green" : "neon-red"}`}>{row ? `${row.diiNet >= 0 ? "+" : ""}₹${Math.abs(row.diiNet).toLocaleString("en-IN")}Cr` : "—"}</td>
                        <td className={`px-2 py-1 text-right tabular-nums ${!row ? "" : row.niftyChg >= 0 ? "neon-green" : "neon-red"}`}>{row ? `${row.niftyChg >= 0 ? "+" : ""}${row.niftyChg?.toFixed(2)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right panel: Signals + News */}
          <div className="col-span-12 lg:col-span-4 space-y-3">

            {/* AI Trade Signals */}
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">ALADDIN AI SIGNALS</span>
                <div className="flex gap-1">
                  {(["All","BUY","SELL"] as const).map(f => (
                    <button key={f} onClick={() => setSignalFilter(f)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold ${signalFilter === f ? "bg-[rgba(0,255,180,0.2)] neon-green" : "text-[hsl(220,20%,40%)]"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-2 space-y-2 overflow-auto" style={{ maxHeight: 360 }}>
                {filteredSignals.map((s, i) => (
                  <div key={i} className={`rounded p-2.5 border ${s.action === "BUY" ? "border-[rgba(0,255,180,0.15)] bg-[rgba(0,255,180,0.03)]" : "border-[rgba(255,80,80,0.15)] bg-[rgba(255,80,80,0.03)]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{s.action}</span>
                        <span className="text-[9px] font-bold text-[hsl(180,60%,75%)]">{s.symbol}</span>
                        <span className="text-[7px] text-[hsl(220,20%,38%)]">{s.type}</span>
                      </div>
                      <span className={`text-[9px] font-bold ${s.confidence >= 80 ? "neon-green" : "neon-yellow"}`}>{s.confidence}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[8px] mb-1">
                      <div><span className="text-[hsl(220,20%,40%)]">ENTRY </span><span className="text-[hsl(180,50%,70%)]">{s.entry}</span></div>
                      <div><span className="text-[hsl(0,80%,55%)]">SL </span><span className="neon-red">{s.sl}</span></div>
                      <div><span className="text-[hsl(168,80%,45%)]">TGT </span><span className="neon-green">{s.target}</span></div>
                    </div>
                    <div className="text-[7px] text-[hsl(220,20%,38%)] mb-1">{s.reason}</div>
                    <div className="text-[7px] text-[hsl(200,80%,50%)] mb-1.5">{s.indicators}</div>
                    <div className="h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                      <div className={`h-full rounded-full ${s.confidence >= 80 ? "bg-[hsl(168,100%,50%)]" : "bg-[hsl(45,100%,55%)]"}`} style={{ width: `${s.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live News */}
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE NEWS FEED</span>
                <span className="text-[7px] text-[hsl(220,20%,35%)]">MC • ET • MINT • BS</span>
              </div>
              <div className="p-2 space-y-1.5 overflow-auto" style={{ maxHeight: 280 }}>
                {(news.length ? news : Array(6).fill(null)).map((n, i) => (
                  <div key={i} className="flex gap-2 p-1.5 rounded border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(0,255,180,0.03)]">
                    {n ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <a href={n.link} target="_blank" rel="noreferrer" className="text-[8px] text-[hsl(180,50%,75%)] hover:neon-green leading-tight line-clamp-2 block">{n.title}</a>
                          <div className="flex gap-1 mt-0.5 items-center">
                            <span className="text-[6px] px-1 rounded bg-[rgba(0,255,180,0.08)] text-[hsl(168,80%,50%)]">{n.source}</span>
                            <span className={`text-[6px] px-1 rounded font-bold ${n.sentiment === "BULLISH" ? "bg-[rgba(0,255,180,0.1)] neon-green" : n.sentiment === "BEARISH" ? "bg-[rgba(255,80,80,0.1)] neon-red" : "bg-[rgba(255,200,0,0.08)] text-[hsl(45,100%,55%)]"}`}>{n.sentiment}</span>
                            <span className="text-[6px] text-[hsl(220,20%,30%)]">{timeAgo(n.pubDate)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-8 flex-1 animate-pulse bg-[rgba(0,255,180,0.03)] rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Stocks + Movers */}
        <div className="grid grid-cols-12 gap-3">

          {/* Stocks Table */}
          <div className="col-span-12 lg:col-span-7 glass-card rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">NIFTY 50 — MARKET OVERVIEW</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 280 }}>
              <table className="w-full text-[8px]">
                <thead className="sticky top-0">
                  <tr className="bg-[rgba(0,0,0,0.6)]">
                    {["SYMBOL","LTP","CHANGE","CHNG%","VOLUME","HIGH","LOW","52W HIGH","52W LOW"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.slice(0, 20).map(q => {
                    const up = (q.regularMarketChange ?? 0) >= 0;
                    return (
                      <tr key={q.symbol} className="table-row-hover border-t border-[rgba(255,255,255,0.03)]">
                        <td className="px-2 py-1 font-bold text-[hsl(180,50%,70%)] whitespace-nowrap">{q.shortName || q.symbol.replace(".NS","")}</td>
                        <td className={`px-2 py-1 tabular-nums font-bold ${up ? "neon-green" : "neon-red"}`}>{q.regularMarketPrice?.toFixed(2) ?? "—"}</td>
                        <td className={`px-2 py-1 tabular-nums ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{up ? "+" : ""}{q.regularMarketChange?.toFixed(2) ?? "—"}</td>
                        <td className={`px-2 py-1 tabular-nums ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{up ? "+" : ""}{q.regularMarketChangePercent?.toFixed(2) ?? "—"}%</td>
                        <td className="px-2 py-1 text-[hsl(220,20%,42%)] tabular-nums">{formatVolume(q.regularMarketVolume ?? 0)}</td>
                        <td className="px-2 py-1 text-[hsl(168,80%,45%)] tabular-nums">{q.regularMarketDayHigh?.toFixed(2) ?? "—"}</td>
                        <td className="px-2 py-1 text-[hsl(0,70%,55%)] tabular-nums">{q.regularMarketDayLow?.toFixed(2) ?? "—"}</td>
                        <td className="px-2 py-1 text-[hsl(45,80%,55%)] tabular-nums">{q.fiftyTwoWeekHigh?.toFixed(0) ?? "—"}</td>
                        <td className="px-2 py-1 text-[hsl(0,60%,50%)] tabular-nums">{q.fiftyTwoWeekLow?.toFixed(0) ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {stocks.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-[hsl(220,20%,35%)]">Loading market data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movers */}
          <div className="col-span-12 lg:col-span-5 glass-card rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">TOP GAINERS & LOSERS</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[rgba(255,255,255,0.05)]">
              <div className="p-3">
                <div className="text-[8px] text-[hsl(168,80%,45%)] font-bold mb-2">▲ TOP GAINERS</div>
                <div className="space-y-1.5">
                  {(movers.topGainers.slice(0, 10).length ? movers.topGainers.slice(0, 10) : Array(8).fill(null)).map((q: any, i) => (
                    <div key={i} className="flex justify-between text-[8px] items-center">
                      <span className="text-[hsl(180,40%,65%)] truncate max-w-[80px]">{q ? (q.shortName || q.symbol.replace(".NS","")) : "—"}</span>
                      <div className="text-right">
                        <div className="neon-green tabular-nums">+{q ? q.regularMarketChangePercent?.toFixed(2) : "—"}%</div>
                        <div className="text-[hsl(220,20%,35%)] tabular-nums">{q?.regularMarketPrice?.toFixed(1) ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[8px] text-[hsl(0,80%,60%)] font-bold mb-2">▼ TOP LOSERS</div>
                <div className="space-y-1.5">
                  {(movers.topLosers.slice(0, 10).length ? movers.topLosers.slice(0, 10) : Array(8).fill(null)).map((q: any, i) => (
                    <div key={i} className="flex justify-between text-[8px] items-center">
                      <span className="text-[hsl(180,40%,65%)] truncate max-w-[80px]">{q ? (q.shortName || q.symbol.replace(".NS","")) : "—"}</span>
                      <div className="text-right">
                        <div className="neon-red tabular-nums">{q ? q.regularMarketChangePercent?.toFixed(2) : "—"}%</div>
                        <div className="text-[hsl(220,20%,35%)] tabular-nums">{q?.regularMarketPrice?.toFixed(1) ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick nav cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { href: "/option-chain", label: "OPTION CHAIN", icon: "⛓", desc: "Live NSE OI" },
            { href: "/signals", label: "TRADE SIGNALS", icon: "📡", desc: "AI F&O + Stocks" },
            { href: "/market-watch", label: "MARKET WATCH", icon: "👁", desc: "Live Watchlist" },
            { href: "/market-pulse", label: "MARKET PULSE", icon: "💓", desc: "Institutional" },
            { href: "/analysis", label: "ANALYSIS", icon: "📊", desc: "VWAP + Range" },
            { href: "/ai-brain", label: "AI BRAIN", icon: "🧠", desc: "Ask Anything" },
          ].map(({ href, label, icon, desc }) => (
            <Link key={href} href={href}
              className="glass-card glass-card-hover rounded-lg p-3 text-center cursor-pointer transition-all block">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-[8px] font-bold neon-green tracking-wider">{label}</div>
              <div className="text-[7px] text-[hsl(220,20%,38%)]">{desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
