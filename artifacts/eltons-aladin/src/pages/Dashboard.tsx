import { useEffect, useState } from "react";
import { Link } from "wouter";
import MarketCard from "@/components/MarketCard";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchIndices, fetchQuotes, fetchMovers, formatVolume } from "@/lib/api";

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
  "KOTAKBANK.NS","LT.NS","AXISBANK.NS","WIPRO.NS","MARUTI.NS"
];

const AI_SIGNALS = [
  { symbol: "NIFTY 50", action: "BUY", entry: "24,450", sl: "24,200", target: "24,900", confidence: 87, type: "F&O", reason: "Bullish engulfing on daily, RSI 58, above VWAP" },
  { symbol: "BANK NIFTY", action: "BUY", entry: "52,100", sl: "51,700", target: "53,000", confidence: 79, type: "F&O", reason: "Golden cross EMA20/50, strong FII inflow" },
  { symbol: "RELIANCE", action: "SELL", entry: "2,940", sl: "2,975", target: "2,870", confidence: 72, type: "Stocks", reason: "Bearish MACD cross, resistance at 2,960" },
  { symbol: "TCS", action: "BUY", entry: "4,150", sl: "4,080", target: "4,280", confidence: 83, type: "Stocks", reason: "Morning star pattern, 52W high breakout zone" },
  { symbol: "HDFC BANK", action: "BUY", entry: "1,890", sl: "1,860", target: "1,950", confidence: 76, type: "F&O", reason: "Bullish OI buildup, call writing unwinding" },
];

const NEWS_ITEMS = [
  { time: "09:47", headline: "Nifty opens gap-up; IT & Banking lead gains", tag: "INDEX", sentiment: "BULLISH" },
  { time: "09:32", headline: "FII buy ₹2,840 Cr in equities; DII sell ₹1,120 Cr", tag: "FII/DII", sentiment: "BULLISH" },
  { time: "09:15", headline: "RBI holds repo rate at 6.5%; signals neutral stance", tag: "MACRO", sentiment: "NEUTRAL" },
  { time: "09:05", headline: "US markets closed positive; Nasdaq +1.2%", tag: "GLOBAL", sentiment: "BULLISH" },
  { time: "08:50", headline: "Crude oil at $82.4/bbl; rupee at 83.45 vs USD", tag: "COMMODITY", sentiment: "NEUTRAL" },
  { time: "08:30", headline: "Tata Motors Q4 PAT up 33% YoY; beats estimates", tag: "EARNINGS", sentiment: "BULLISH" },
  { time: "08:15", headline: "Japan GDP falls 0.5%; global risk-off sentiment limited", tag: "GLOBAL", sentiment: "BEARISH" },
];

export default function Dashboard() {
  const [indices, setIndices] = useState<Quote[]>([]);
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [movers, setMovers] = useState<{ topGainers: Quote[]; topLosers: Quote[] }>({ topGainers: [], topLosers: [] });
  const [selectedSymbol, setSelectedSymbol] = useState("NSE:NIFTY");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const [idxRes, stkRes, mvrRes] = await Promise.allSettled([
        fetchIndices(),
        fetchQuotes(NIFTY50_STOCKS),
        fetchMovers()
      ]);
      if (idxRes.status === "fulfilled" && idxRes.value.success) setIndices(idxRes.value.data || []);
      if (stkRes.status === "fulfilled" && stkRes.value.success) setStocks(stkRes.value.data || []);
      if (mvrRes.status === "fulfilled" && mvrRes.value.success) setMovers({ topGainers: mvrRes.value.topGainers, topLosers: mvrRes.value.topLosers });
      setLastUpdated(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, []);

  const mainIndices = indices.filter(q => ["^NSEI","^BSESN","^NSEBANK","^GSPC","GC=F","CL=F"].includes(q.symbol));

  const tvSymbolMap: Record<string,string> = {
    "^NSEI": "CAPITALCOM:NIFTY50", "^BSESN": "BSE:SENSEX", "^NSEBANK": "CAPITALCOM:BANKNIFTY",
    "^GSPC": "SP:SPX", "GC=F": "COMEX:GC1!", "CL=F": "NYMEX:CL1!",
    "RELIANCE.NS": "NSE:RELIANCE", "TCS.NS": "NSE:TCS", "HDFCBANK.NS": "NSE:HDFCBANK",
    "INFY.NS": "NSE:INFY", "ICICIBANK.NS": "NSE:ICICIBANK",
  };

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-wider">MARKET COMMAND CENTER</h1>
            <p className="text-[10px] text-[hsl(220,20%,35%)]">Real-time NSE • BSE • Global Markets • AI Signals</p>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
            <span className="text-[hsl(220,20%,35%)]">LAST SYNC: <span className="text-[hsl(168,100%,45%)]">{lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span></span>
            <button onClick={loadData} className="px-2 py-1 rounded text-[9px] bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green hover:bg-[rgba(0,255,180,0.2)] transition-all">
              ↺ REFRESH
            </button>
          </div>
        </div>

        {/* Indices strip */}
        {loading ? (
          <div className="grid grid-cols-6 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass-card rounded-lg h-28 animate-pulse bg-[rgba(0,255,180,0.03)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {mainIndices.map(q => (
              <MarketCard
                key={q.symbol}
                quote={q}
                compact
                onClick={() => {
                  const sym = tvSymbolMap[q.symbol];
                  if (sym) setSelectedSymbol(sym);
                }}
              />
            ))}
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-12 gap-4">

          {/* Chart - 8 cols */}
          <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[hsl(168,100%,50%)] tracking-wider">LIVE CHART</span>
                <span className="text-[9px] text-[hsl(220,20%,40%)]">— RSI • MACD • BOLLINGER BANDS</span>
              </div>
              <div className="flex gap-1">
                {Object.entries(tvSymbolMap).slice(0, 5).map(([sym, tv]) => {
                  const label = { "^NSEI": "NIFTY", "^BSESN": "SENSEX", "^NSEBANK": "BANK NF", "RELIANCE.NS": "RELI", "TCS.NS": "TCS" }[sym];
                  if (!label) return null;
                  return (
                    <button key={sym} onClick={() => setSelectedSymbol(tv)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${selectedSymbol === tv ? "bg-[rgba(0,255,180,0.2)] neon-green" : "text-[hsl(220,20%,40%)] hover:text-[hsl(180,60%,70%)]"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <TradingViewWidget symbol={selectedSymbol} height={420} />
          </div>

          {/* AI Signals - 4 cols */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <span className="text-[10px] font-bold text-[hsl(168,100%,50%)] tracking-wider">ALADDIN AI SIGNALS</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
                <span className="text-[9px] text-[hsl(168,80%,45%)]">LIVE</span>
              </div>
            </div>
            <div className="p-3 space-y-2 overflow-auto" style={{ maxHeight: 420 }}>
              {AI_SIGNALS.map((s, i) => (
                <div key={i} className={`rounded p-3 border transition-all glass-card-hover ${s.action === "BUY" ? "border-[rgba(0,255,180,0.15)] bg-[rgba(0,255,180,0.04)]" : "border-[rgba(255,80,80,0.15)] bg-[rgba(255,80,80,0.04)]"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{s.action}</span>
                      <span className="text-[10px] font-bold text-[hsl(180,60%,75%)]">{s.symbol}</span>
                    </div>
                    <div className="text-[9px] text-[hsl(220,20%,40%)]">{s.type}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9px] mb-1">
                    <div><span className="text-[hsl(220,20%,40%)]">ENTRY </span><span className="text-[hsl(180,60%,70%)] tabular-nums">{s.entry}</span></div>
                    <div><span className="text-[hsl(0,80%,55%)]">SL </span><span className="text-[hsl(0,80%,65%)] tabular-nums">{s.sl}</span></div>
                    <div><span className="text-[hsl(168,80%,45%)]">TGT </span><span className="neon-green tabular-nums">{s.target}</span></div>
                  </div>
                  <div className="text-[8px] text-[hsl(220,20%,40%)] mb-1">{s.reason}</div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                      <div className={`h-full rounded-full ${s.confidence >= 80 ? "bg-[hsl(168,100%,50%)]" : s.confidence >= 70 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${s.confidence}%` }} />
                    </div>
                    <span className="text-[8px] text-[hsl(220,20%,40%)]">{s.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Stocks table + News + Movers */}
        <div className="grid grid-cols-12 gap-4">

          {/* Top Stocks */}
          <div className="col-span-12 lg:col-span-5 glass-card rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <span className="text-[10px] font-bold text-[hsl(168,100%,50%)] tracking-wider">NIFTY 50 — TOP STOCKS</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 300 }}>
              <table className="w-full text-[9px]">
                <thead className="sticky top-0">
                  <tr className="bg-[rgba(0,0,0,0.5)]">
                    {["SYMBOL","LTP","CHANGE","CHNG%","VOLUME","52W HIGH","52W LOW"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[hsl(220,20%,40%)] font-bold tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.slice(0, 15).map(q => {
                    const up = (q.regularMarketChange ?? 0) >= 0;
                    return (
                      <tr key={q.symbol} className="table-row-hover border-t border-[rgba(255,255,255,0.03)]">
                        <td className="px-3 py-1.5 font-bold text-[hsl(180,50%,70%)]">{q.shortName || q.symbol.replace(".NS","")}</td>
                        <td className={`px-3 py-1.5 tabular-nums font-bold ${up ? "neon-green" : "neon-red"}`}>{q.regularMarketPrice?.toFixed(2) ?? "—"}</td>
                        <td className={`px-3 py-1.5 tabular-nums ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{up ? "+" : ""}{q.regularMarketChange?.toFixed(2) ?? "—"}</td>
                        <td className={`px-3 py-1.5 tabular-nums ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{up ? "+" : ""}{q.regularMarketChangePercent?.toFixed(2) ?? "—"}%</td>
                        <td className="px-3 py-1.5 text-[hsl(220,20%,45%)] tabular-nums">{formatVolume(q.regularMarketVolume ?? 0)}</td>
                        <td className="px-3 py-1.5 text-[hsl(45,80%,55%)] tabular-nums">{q.fiftyTwoWeekHigh?.toFixed(0) ?? "—"}</td>
                        <td className="px-3 py-1.5 text-[hsl(0,70%,55%)] tabular-nums">{q.fiftyTwoWeekLow?.toFixed(0) ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {stocks.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-[hsl(220,20%,35%)]">Loading market data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Market News */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <span className="text-[10px] font-bold text-[hsl(168,100%,50%)] tracking-wider">MARKET PULSE — NEWS</span>
              <span className="text-[8px] text-[hsl(220,20%,35%)]">NSE • BSE • MONEYCONTROL • ET</span>
            </div>
            <div className="p-3 space-y-2 overflow-auto" style={{ maxHeight: 300 }}>
              {NEWS_ITEMS.map((n, i) => (
                <div key={i} className="flex gap-2 p-2 rounded border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(0,255,180,0.03)] transition-all">
                  <div className="text-[9px] text-[hsl(220,20%,35%)] w-10 flex-shrink-0 tabular-nums">{n.time}</div>
                  <div className="flex-1">
                    <div className="text-[9px] text-[hsl(180,50%,75%)] mb-0.5 leading-tight">{n.headline}</div>
                    <div className="flex gap-1">
                      <span className="text-[7px] px-1 rounded bg-[rgba(0,255,180,0.1)] text-[hsl(168,80%,50%)]">{n.tag}</span>
                      <span className={`text-[7px] px-1 rounded font-bold ${n.sentiment === "BULLISH" ? "bg-[rgba(0,255,180,0.1)] text-[hsl(168,100%,50%)]" : n.sentiment === "BEARISH" ? "bg-[rgba(255,80,80,0.1)] text-[hsl(0,80%,60%)]" : "bg-[rgba(255,200,0,0.1)] text-[hsl(45,100%,55%)]"}`}>{n.sentiment}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Movers */}
          <div className="col-span-12 lg:col-span-3 glass-card rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[rgba(0,255,180,0.1)]">
              <span className="text-[10px] font-bold text-[hsl(168,100%,50%)] tracking-wider">TOP MOVERS</span>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <div className="text-[9px] text-[hsl(168,80%,45%)] font-bold mb-1.5 tracking-wider">▲ GAINERS</div>
                <div className="space-y-1">
                  {(movers.topGainers.length ? movers.topGainers : Array(5).fill(null)).map((q, i) => (
                    <div key={i} className="flex justify-between items-center text-[9px] py-0.5">
                      <span className="text-[hsl(180,40%,65%)]">{q ? (q.shortName || q.symbol.replace(".NS","")) : "—"}</span>
                      <span className="neon-green tabular-nums">+{q ? q.regularMarketChangePercent?.toFixed(2) : "—"}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-[rgba(255,255,255,0.05)] pt-2">
                <div className="text-[9px] text-[hsl(0,80%,60%)] font-bold mb-1.5 tracking-wider">▼ LOSERS</div>
                <div className="space-y-1">
                  {(movers.topLosers.length ? movers.topLosers : Array(5).fill(null)).map((q, i) => (
                    <div key={i} className="flex justify-between items-center text-[9px] py-0.5">
                      <span className="text-[hsl(180,40%,65%)]">{q ? (q.shortName || q.symbol.replace(".NS","")) : "—"}</span>
                      <span className="neon-red tabular-nums">{q ? q.regularMarketChangePercent?.toFixed(2) : "—"}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links to other pages */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { href: "/fno", title: "F&O TERMINAL", desc: "Options chain, Greeks, lot sizes, strike analysis for NIFTY, BANK NIFTY & more", color: "from-[rgba(0,255,180,0.1)] to-transparent", border: "rgba(0,255,180,0.2)", icon: "⚡" },
            { href: "/market-pulse", title: "MARKET PULSE INSIGHTS", desc: "FII/DII flows, institutional data, sector rotation, breadth analysis & macro", color: "from-[rgba(0,150,255,0.1)] to-transparent", border: "rgba(0,150,255,0.2)", icon: "📡" },
            { href: "/signals", title: "AI TRADE SIGNALS", desc: "Multi-agent AI scan for high-probability setups across F&O & equity universe", color: "from-[rgba(200,100,255,0.1)] to-transparent", border: "rgba(200,100,255,0.2)", icon: "🤖" },
          ].map(({ href, title, desc, color, border, icon }) => (
            <Link key={href} href={href}
              className={`block glass-card glass-card-hover rounded-lg p-4 transition-all bg-gradient-to-br ${color} cursor-pointer`}
              style={{ borderColor: border }}>
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-[10px] font-bold tracking-wider text-[hsl(168,100%,50%)] mb-1">{title}</div>
              <div className="text-[9px] text-[hsl(220,20%,45%)] leading-relaxed">{desc}</div>
              <div className="text-[9px] text-[hsl(168,80%,45%)] mt-2">→ OPEN TERMINAL</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
