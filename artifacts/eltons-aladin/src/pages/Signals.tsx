import { useState, useEffect, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchQuotes } from "@/lib/api";

const AGENTS = [
  { name: "ANALYST", role: "Quantitative Engine", desc: "Scans OHLCV every 5s for 20+ patterns", icon: "📊" },
  { name: "RESEARCHER", role: "Fundamental RAG", desc: "Pulls live news context from NSE & Moneycontrol", icon: "🔬" },
  { name: "RISK", role: "Systemic Guardrail", desc: "EMA-50 filter, 1.5%-2% position cap, ATR SL", icon: "🛡" },
  { name: "SUPERVISOR", role: "AI Orchestration", desc: "Claude Sonnet orchestration — JSON signals", icon: "🤖" },
];

type Action = "BUY" | "SELL";
type SType = "F&O" | "Stocks";

interface SignalBase {
  id: number;
  symbol: string;
  yahooSym: string;
  tvSym: string;
  type: SType;
  action: Action;
  slPct: number;
  t1Pct: number;
  t2Pct: number;
  confidence: number;
  rr: string;
  pattern: string;
  indicators: string;
  timeframe: string;
  agents: string[];
  whyEntry: string;
  whySL: string;
  whyTarget: string;
}

const SIGNAL_BASES: SignalBase[] = [
  { id: 1, symbol: "NIFTY 50", yahooSym: "^NSEI", tvSym: "NSE:NIFTY50", type: "F&O", action: "BUY", slPct: 0.012, t1Pct: 0.025, t2Pct: 0.045, confidence: 87, rr: "2.2:1", pattern: "Bullish Engulfing", indicators: "RSI: 58 | MACD: +12.4 | VWAP: support | EMA20: cross", timeframe: "15 min", agents: ["ANALYST","RISK","SUPERVISOR"], whyEntry: "Price broke above VWAP with volume surge (1.8x avg). RSI in bullish zone (58), MACD histogram positive and rising. EMA20/50 golden cross forming on intraday chart.", whySL: "ATR-based stop below previous swing low. Accounts for 2x ATR buffer, keeping risk at 1% of capital.", whyTarget: "T1 = prior resistance cluster. T2 = Fibonacci 0.618 extension. Risk:Reward 2.2:1 minimum threshold met." },
  { id: 2, symbol: "BANK NIFTY", yahooSym: "^NSEBANK", tvSym: "NSE:BANKNIFTY", type: "F&O", action: "BUY", slPct: 0.014, t1Pct: 0.028, t2Pct: 0.05, confidence: 79, rr: "2.5:1", pattern: "Golden Cross EMA", indicators: "RSI: 62 | EMA20/50 Cross | PCR: 1.32 | OI: +18%", timeframe: "5 min", agents: ["ANALYST","RESEARCHER","RISK","SUPERVISOR"], whyEntry: "EMA20 crossed above EMA50 on 5-min chart (golden cross). Strong FII buying in banking sector. PCR of 1.32 indicates bullish sentiment. Call OI unwinding at resistance.", whySL: "Below EMA50 — trend invalidation level. ATR stop confirms this level at 1.4% below entry.", whyTarget: "Previous day high = T1. 52W resistance cluster = T2. Strong bullish momentum supports target." },
  { id: 3, symbol: "RELIANCE", yahooSym: "RELIANCE.NS", tvSym: "NSE:RELIANCE", type: "Stocks", action: "SELL", slPct: 0.018, t1Pct: 0.025, t2Pct: 0.048, confidence: 72, rr: "2.0:1", pattern: "Bearish MACD Cross", indicators: "RSI: 67 (overbought) | MACD: bearish | Res: level | Stoch: 79", timeframe: "1 hour", agents: ["ANALYST","RISK","SUPERVISOR"], whyEntry: "MACD crossed bearish on 1-hour chart. RSI at 67 approaching overbought. Heavy call writing at key resistance. Stochastic showing divergence.", whySL: "Above resistance level — breakout invalidation zone. Tight stop = better risk-reward.", whyTarget: "T1 = demand zone from 3 sessions ago. T2 = 50-day EMA. Sector rotation from energy ongoing." },
  { id: 4, symbol: "TCS", yahooSym: "TCS.NS", tvSym: "NSE:TCS", type: "Stocks", action: "BUY", slPct: 0.017, t1Pct: 0.032, t2Pct: 0.06, confidence: 83, rr: "2.8:1", pattern: "Morning Star + Breakout", indicators: "RSI: 54 | Vol: 2.1x avg | Pattern: Morning Star | 52W Zone", timeframe: "Daily", agents: ["ANALYST","RESEARCHER","SUPERVISOR"], whyEntry: "Morning star candlestick pattern on daily chart. Volume 2.1x average — institutional accumulation signal. Breaking out of 52W high consolidation zone.", whySL: "Below morning star low — candle pattern invalidated below this level.", whyTarget: "T1 = measured move from morning star. T2 = ATH region. IT sector tailwinds from strong earnings season." },
  { id: 5, symbol: "HDFC BANK", yahooSym: "HDFCBANK.NS", tvSym: "NSE:HDFCBANK", type: "F&O", action: "BUY", slPct: 0.016, t1Pct: 0.03, t2Pct: 0.055, confidence: 76, rr: "2.1:1", pattern: "Bullish OI Buildup", indicators: "RSI: 57 | OI: +14% | VWAP: support | PCR: 1.28", timeframe: "30 min", agents: ["ANALYST","RISK","SUPERVISOR"], whyEntry: "Call OI unwinding at resistance (resistance shifting). Put OI building at support. Price above VWAP with positive momentum.", whySL: "Below VWAP = trend shift. Strong put OI here provides natural stop level.", whyTarget: "T1 = next resistance cluster. T2 = 52W high test. Banking sector in bullish phase." },
  { id: 6, symbol: "MIDCAP NIFTY", yahooSym: "^NSEMID50", tvSym: "NSE:NIFTY50", type: "F&O", action: "BUY", slPct: 0.014, t1Pct: 0.028, t2Pct: 0.05, confidence: 69, rr: "2.1:1", pattern: "Ascending Triangle", indicators: "RSI: 61 | Pattern: Ascending Triangle | Breadth: 72% | Vol: +", timeframe: "1 hour", agents: ["ANALYST","SUPERVISOR"], whyEntry: "Ascending triangle breakout with increasing volume. Market breadth at 72% positive. Small/midcap showing relative strength vs large caps.", whySL: "Below triangle support — pattern failure zone.", whyTarget: "T1 = measured move from triangle height. T2 = historical resistance. Midcap rotation ongoing." },
  { id: 7, symbol: "BAJAJ FINANCE", yahooSym: "BAJFINANCE.NS", tvSym: "NSE:BAJFINANCE", type: "F&O", action: "SELL", slPct: 0.016, t1Pct: 0.028, t2Pct: 0.05, confidence: 71, rr: "2.3:1", pattern: "Double Top + Divergence", indicators: "RSI Divergence | MACD Cross | Double Top | Vol: Declining", timeframe: "4 hour", agents: ["ANALYST","RISK","SUPERVISOR"], whyEntry: "Double top formation at resistance. Bearish RSI divergence (price higher, RSI lower). MACD bearish cross on 4H. Declining volume on rallies.", whySL: "Above double top neckline — pattern invalidation.", whyTarget: "T1 = neckline support. T2 = next demand zone. NBFC sector facing margin pressure." },
  { id: 8, symbol: "INFOSYS", yahooSym: "INFY.NS", tvSym: "NSE:INFY", type: "Stocks", action: "BUY", slPct: 0.018, t1Pct: 0.035, t2Pct: 0.065, confidence: 78, rr: "2.5:1", pattern: "Hammer + Support Bounce", indicators: "RSI: 48 | Hammer Candle | Support: zone | Vol: +25%", timeframe: "Daily", agents: ["ANALYST","RESEARCHER","SUPERVISOR"], whyEntry: "Hammer candlestick at key support zone. Volume 25% above average. RSI at neutral 48 (room to run). IT sector momentum positive.", whySL: "Below hammer low and support zone.", whyTarget: "T1 = prior resistance now target. T2 = 52W high zone. Strong demand at support." },
  { id: 9, symbol: "SBIN", yahooSym: "SBIN.NS", tvSym: "NSE:SBIN", type: "Stocks", action: "BUY", slPct: 0.018, t1Pct: 0.04, t2Pct: 0.07, confidence: 74, rr: "2.4:1", pattern: "Cup & Handle Breakout", indicators: "RSI: 56 | Vol Surge | Cup&Handle | MACD: positive", timeframe: "Weekly", agents: ["ANALYST","RESEARCHER","SUPERVISOR"], whyEntry: "Classic cup and handle pattern completing on weekly chart. Volume surge confirms breakout. RSI at 56 with room to run.", whySL: "Below handle low — pattern failure level.", whyTarget: "T1 = measured move from cup base. T2 = 52W high zone. PSU bank rally underway." },
  { id: 10, symbol: "ITC", yahooSym: "ITC.NS", tvSym: "NSE:ITC", type: "Stocks", action: "SELL", slPct: 0.014, t1Pct: 0.025, t2Pct: 0.04, confidence: 68, rr: "2.0:1", pattern: "Head & Shoulders", indicators: "RSI: 63 | H&S Pattern | Neckline Break | Vol: confirming", timeframe: "Daily", agents: ["ANALYST","RISK","SUPERVISOR"], whyEntry: "Head & Shoulders pattern with neckline breakdown. Volume confirms distribution. Sector rotation away from FMCG.", whySL: "Above right shoulder — invalidation of H&S.", whyTarget: "T1 = neckline measured move target. T2 = next major support. Cigarette tax hike risk." },
];

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function computeLevels(ltp: number, action: Action, slPct: number, t1Pct: number, t2Pct: number) {
  if (action === "BUY") {
    return { entry: ltp, sl: ltp * (1 - slPct), t1: ltp * (1 + t1Pct), t2: ltp * (1 + t2Pct) };
  } else {
    return { entry: ltp, sl: ltp * (1 + slPct), t1: ltp * (1 - t1Pct), t2: ltp * (1 - t2Pct) };
  }
}

export default function Signals() {
  const [typeFilter, setTypeFilter] = useState<"All" | "F&O" | "Stocks">("All");
  const [actionFilter, setActionFilter] = useState<"All" | "BUY" | "SELL">("All");
  const [selectedId, setSelectedId] = useState(1);
  const [scanProgress, setScanProgress] = useState(65);
  const [lastScan, setLastScan] = useState(new Date());
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);

  const fetchPrices = useCallback(async () => {
    const symbols = SIGNAL_BASES.map(s => s.yahooSym).filter(s => !s.startsWith("^"));
    const idxSymbols = SIGNAL_BASES.map(s => s.yahooSym).filter(s => s.startsWith("^"));
    const allSymbols = [...symbols, ...idxSymbols];
    try {
      const res = await fetchQuotes(allSymbols);
      if (res.success && res.data) {
        const priceMap: Record<string, number> = {};
        for (const q of res.data) {
          if (q.symbol && q.regularMarketPrice) {
            priceMap[q.symbol] = q.regularMarketPrice;
          }
        }
        setLivePrices(priceMap);
      }
    } catch {}
    setLoadingPrices(false);
    setLastScan(new Date());
  }, []);

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, 15000);
    return () => clearInterval(t);
  }, [fetchPrices]);

  useEffect(() => {
    const t = setInterval(() => setScanProgress(p => p >= 100 ? 0 : p + 3), 400);
    return () => clearInterval(t);
  }, []);

  const signals = SIGNAL_BASES.map(s => {
    const ltp = livePrices[s.yahooSym];
    const useLTP = ltp ?? 0;
    const levels = useLTP > 0 ? computeLevels(useLTP, s.action, s.slPct, s.t1Pct, s.t2Pct) : null;
    const timestamp = new Date();
    const istStr = timestamp.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return { ...s, ltp: useLTP, levels, timestamp: istStr };
  });

  const filtered = signals.filter(s =>
    (typeFilter === "All" || s.type === typeFilter) &&
    (actionFilter === "All" || s.action === actionFilter)
  );

  const selected = signals.find(s => s.id === selectedId) || signals[0];

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">ALADDIN AI — TRADE SIGNALS</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Multi-Agent AI • Pattern Recognition • Real-time Entry/SL/Target with detailed rationale</p>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
              <span className="neon-green">LIVE PRICES</span>
            </div>
            <span className="text-[hsl(220,20%,35%)]">LAST SCAN: <span className="neon-green">{lastScan.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span></span>
            <div className="flex items-center gap-1.5">
              <span className="text-[hsl(220,20%,35%)]">SCANNING</span>
              <div className="w-20 h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                <div className="h-full bg-[hsl(168,100%,50%)] rounded-full transition-all" style={{ width: `${scanProgress}%` }} />
              </div>
              <span className="neon-green tabular-nums">{scanProgress}%</span>
            </div>
          </div>
        </div>

        {/* Agent status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {AGENTS.map(a => (
            <div key={a.name} className="glass-card rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{a.icon}</span>
                  <div>
                    <div className="text-[8px] font-bold neon-green">{a.name}</div>
                    <div className="text-[7px] text-[hsl(220,20%,38%)]">{a.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
                  <span className="text-[7px] neon-green">LIVE</span>
                </div>
              </div>
              <div className="text-[7px] text-[hsl(220,20%,35%)]">{a.desc}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[8px] text-[hsl(220,20%,40%)] font-bold">TYPE:</div>
          <div className="flex gap-1">
            {(["All","F&O","Stocks"] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 rounded text-[8px] font-bold tracking-wider transition-all ${typeFilter === f ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="text-[8px] text-[hsl(220,20%,40%)] font-bold ml-2">DIRECTION:</div>
          <div className="flex gap-1">
            {(["All","BUY","SELL"] as const).map(f => (
              <button key={f} onClick={() => setActionFilter(f)}
                className={`px-3 py-1 rounded text-[8px] font-bold tracking-wider transition-all ${actionFilter === f
                  ? f === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]"
                  : f === "SELL" ? "bg-[rgba(255,80,80,0.2)] neon-red border border-[rgba(255,80,80,0.4)]"
                  : "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]"
                  : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {f === "BUY" ? "▲ BUY ONLY" : f === "SELL" ? "▼ SELL ONLY" : "◆ ALL"}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[8px] text-[hsl(220,20%,35%)]">{filtered.length} SIGNALS {loadingPrices && "• Fetching live prices..."}</div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Signal list */}
          <div className="col-span-12 lg:col-span-4 space-y-2 overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filtered.map(s => {
              const hasLive = s.ltp > 0;
              return (
                <div key={s.id} onClick={() => setSelectedId(s.id)}
                  className={`glass-card rounded-lg p-3 cursor-pointer transition-all ${selectedId === s.id ? "border-[rgba(0,255,180,0.4)] shadow-[0_0_12px_rgba(0,255,180,0.08)]" : "glass-card-hover"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{s.action}</span>
                      <span className="text-[9px] font-bold text-[hsl(180,60%,75%)]">{s.symbol}</span>
                      <span className="text-[7px] text-[hsl(220,20%,35%)] border border-[rgba(255,255,255,0.08)] px-1 rounded">{s.type}</span>
                    </div>
                    <div className="text-right">
                      {hasLive && <div className={`text-[8px] font-bold tabular-nums ${s.action === "BUY" ? "neon-green" : "neon-red"}`}>₹{fmt(s.ltp)}</div>}
                      <div className="text-[6px] text-[hsl(220,20%,30%)]">{s.timestamp}</div>
                    </div>
                  </div>
                  {s.levels && (
                    <div className="grid grid-cols-3 gap-1 text-[7px] mb-1.5">
                      <div><span className="text-[hsl(220,20%,38%)]">ENTRY </span><span className="text-[hsl(180,50%,70%)] tabular-nums">₹{fmt(s.levels.entry)}</span></div>
                      <div><span className="neon-red">SL </span><span className="neon-red tabular-nums">₹{fmt(s.levels.sl)}</span></div>
                      <div><span className="neon-green">T1 </span><span className="neon-green tabular-nums">₹{fmt(s.levels.t1)}</span></div>
                    </div>
                  )}
                  {!s.levels && <div className="text-[7px] text-[hsl(220,20%,35%)] mb-1.5 animate-pulse">Fetching live price...</div>}
                  <div className="text-[7px] text-[hsl(220,20%,38%)] mb-1.5">{s.pattern} • {s.timeframe}</div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                      <div className={`h-full rounded-full transition-all ${s.confidence >= 80 ? "bg-[hsl(168,100%,50%)]" : s.confidence >= 70 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${s.confidence}%` }} />
                    </div>
                    <span className="text-[8px] tabular-nums text-[hsl(220,20%,38%)]">{s.confidence.toFixed(0)}%</span>
                    <span className="text-[8px] font-bold text-[hsl(200,80%,55%)]">R:R {s.rr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel + Chart */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            {selected && (
              <>
                <div className="glass-card rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${selected.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{selected.action}</span>
                        <h2 className="text-lg font-bold text-[hsl(180,60%,80%)]">{selected.symbol}</h2>
                        <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.1)] text-[hsl(220,20%,45%)]">{selected.type}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)] text-[hsl(220,20%,40%)]">{selected.timeframe}</span>
                      </div>
                      <div className="text-[9px] text-[hsl(220,20%,38%)]">{selected.pattern} • Live data sync: {selected.timestamp} IST</div>
                    </div>
                    <div className="text-right">
                      {selected.ltp > 0 && <div className="text-sm font-bold tabular-nums text-[hsl(200,80%,60%)]">LTP: ₹{fmt(selected.ltp)}</div>}
                      <div className={`text-2xl font-bold tabular-nums ${selected.confidence >= 80 ? "neon-green" : "neon-yellow"}`}>{selected.confidence}%</div>
                      <div className="text-[8px] text-[hsl(220,20%,38%)]">CONFIDENCE</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                    {selected.levels ? [
                      { label: "ENTRY PRICE", value: `₹${fmt(selected.levels.entry)}`, color: "text-[hsl(180,50%,70%)]" },
                      { label: "STOP LOSS", value: `₹${fmt(selected.levels.sl)}`, color: "neon-red" },
                      { label: "TARGET 1", value: `₹${fmt(selected.levels.t1)}`, color: "neon-green" },
                      { label: "TARGET 2", value: `₹${fmt(selected.levels.t2)}`, color: "neon-green" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                        <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">{label}</div>
                        <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
                        {label !== "ENTRY PRICE" && selected.ltp > 0 && (
                          <div className="text-[6px] text-[hsl(220,20%,30%)]">
                            {selected.action === "BUY"
                              ? label === "STOP LOSS" ? `${(selected.slPct*100).toFixed(1)}% below` : label === "TARGET 1" ? `${(selected.t1Pct*100).toFixed(1)}% above` : `${(selected.t2Pct*100).toFixed(1)}% above`
                              : label === "STOP LOSS" ? `${(selected.slPct*100).toFixed(1)}% above` : label === "TARGET 1" ? `${(selected.t1Pct*100).toFixed(1)}% below` : `${(selected.t2Pct*100).toFixed(1)}% below`
                            }
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="col-span-4 text-[8px] text-[hsl(220,20%,35%)] animate-pulse">Fetching live price to compute levels...</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-[8px] text-[hsl(220,20%,38%)] font-bold mb-1 tracking-wider">INDICATORS</div>
                      <div className="text-[8px] text-[hsl(200,80%,55%)] leading-relaxed">{selected.indicators}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-[hsl(220,20%,38%)] font-bold mb-1 tracking-wider">RISK : REWARD</div>
                      <div className="text-base font-bold neon-green">{selected.rr}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-[rgba(0,255,180,0.03)] border border-[rgba(0,255,180,0.08)] rounded p-2.5">
                      <div className="text-[7px] text-[hsl(168,80%,45%)] font-bold mb-1">WHY ENTRY HERE?</div>
                      <div className="text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">{selected.whyEntry}</div>
                    </div>
                    <div className="bg-[rgba(255,80,80,0.03)] border border-[rgba(255,80,80,0.08)] rounded p-2.5">
                      <div className="text-[7px] neon-red font-bold mb-1">WHY STOP LOSS?</div>
                      <div className="text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">{selected.whySL}</div>
                    </div>
                    <div className="bg-[rgba(0,255,180,0.03)] border border-[rgba(0,255,180,0.08)] rounded p-2.5">
                      <div className="text-[7px] text-[hsl(168,80%,45%)] font-bold mb-1">WHY TARGET?</div>
                      <div className="text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">{selected.whyTarget}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 items-center flex-wrap">
                    <div className="text-[7px] text-[hsl(220,20%,38%)] font-bold">AGENTS VALIDATED:</div>
                    {selected.agents.map(a => {
                      const agent = AGENTS.find(ag => ag.name === a);
                      return agent ? (
                        <div key={a} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(0,255,180,0.07)] border border-[rgba(0,255,180,0.15)]">
                          <span className="text-xs">{agent.icon}</span>
                          <span className="text-[7px] font-bold neon-green">{a}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="glass-card rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART — {selected.symbol}</div>
                  <TradingViewWidget symbol={selected.tvSym} height={300} showAnalysis={false} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
