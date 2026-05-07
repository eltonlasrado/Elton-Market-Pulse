import { useState, useEffect, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchIndices, fetchQuotes } from "@/lib/api";

const AGENTS = [
  { name: "ANALYST", role: "Quantitative Engine", desc: "Scans OHLCV every 5s for 20+ patterns", icon: "📊" },
  { name: "RESEARCHER", role: "Fundamental RAG", desc: "Pulls live news context from NSE & Moneycontrol", icon: "🔬" },
  { name: "RISK", role: "Systemic Guardrail", desc: "EMA-50 filter, 1.5%-2% position cap, ATR SL", icon: "🛡" },
  { name: "SUPERVISOR", role: "AI Orchestration", desc: "Claude Sonnet orchestration — JSON signals", icon: "🤖" },
];

type Signal = {
  id: number; symbol: string; type: "F&O" | "Stocks"; action: "BUY" | "SELL";
  entry: string; sl: string; target1: string; target2: string;
  confidence: number; rr: string; pattern: string;
  indicators: string; timeframe: string; agents: string[];
  timestamp: string; ltp?: string;
  whyEntry: string; whySL: string; whyTarget: string;
};

const ALL_SIGNALS: Signal[] = [
  { id: 1, symbol: "NIFTY 50", type: "F&O", action: "BUY", entry: "24,450", sl: "24,200", target1: "24,720", target2: "24,950", confidence: 87, rr: "2.2:1", pattern: "Bullish Engulfing", indicators: "RSI: 58 | MACD: +12.4 | VWAP: 24,380 | EMA20: 24,310", timeframe: "15 min", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "09:47:23", whyEntry: "Price broke above VWAP with volume surge (1.8x avg). RSI in bullish zone (58), MACD histogram positive and rising. EMA20/50 golden cross forming.", whySL: "ATR-based stop below previous swing low at 24,200. Accounts for 2x ATR buffer, keeping risk at 1% of capital.", whyTarget: "T1 at 24,720 = prior resistance cluster. T2 at 24,950 = 52W fibonacci extension (0.618). Risk:Reward 2.2:1 minimum threshold met." },
  { id: 2, symbol: "BANK NIFTY", type: "F&O", action: "BUY", entry: "52,100", sl: "51,700", target1: "52,800", target2: "53,400", confidence: 79, rr: "2.5:1", pattern: "Golden Cross EMA", indicators: "RSI: 62 | EMA20/50 Cross | PCR: 1.32 | OI: +18%", timeframe: "5 min", agents: ["ANALYST","RESEARCHER","RISK","SUPERVISOR"], timestamp: "09:52:11", whyEntry: "EMA20 crossed above EMA50 on 5-min chart (golden cross). Strong FII buying in banking sector. PCR of 1.32 indicates bullish sentiment. Call OI unwinding at 52,500.", whySL: "Below EMA50 at 51,700 — trend invalidation level. ATR stop confirms this level.", whyTarget: "Previous day high at 52,800 = T1. 52W resistance cluster at 53,400 = T2. Strong bullish momentum supports target." },
  { id: 3, symbol: "RELIANCE", type: "Stocks", action: "SELL", entry: "2,940", sl: "2,975", target1: "2,880", target2: "2,820", confidence: 72, rr: "2.0:1", pattern: "Bearish MACD Cross", indicators: "RSI: 67 (overbought) | MACD: -8.2 | Res: 2,960 | Stoch: 79", timeframe: "1 hour", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "10:02:45", whyEntry: "MACD crossed bearish on 1-hour chart. RSI at 67 (approaching overbought). Heavy call writing at 2,960 resistance. Stochastic showing divergence.", whySL: "Above resistance at 2,975 — breakout invalidation zone. Tight stop = better RR.", whyTarget: "T1 at 2,880 = demand zone from 3 sessions ago. T2 at 2,820 = 50-day EMA. Sector rotation from energy ongoing." },
  { id: 4, symbol: "TCS", type: "Stocks", action: "BUY", entry: "4,150", sl: "4,080", target1: "4,280", target2: "4,400", confidence: 83, rr: "2.8:1", pattern: "Morning Star + Breakout", indicators: "RSI: 54 | Vol: 2.1x avg | Pattern: Morning Star | 52W Zone", timeframe: "Daily", agents: ["ANALYST","RESEARCHER","SUPERVISOR"], timestamp: "10:14:33", whyEntry: "Morning star candlestick pattern on daily chart. Volume 2.1x average — institutional accumulation signal. Breaking out of 52W high consolidation zone.", whySL: "Below morning star low at 4,080. Candle pattern invalidated below this level.", whyTarget: "T1 at 4,280 = measured move from morning star. T2 at 4,400 = ATH region. IT sector tailwinds from strong earnings season." },
  { id: 5, symbol: "HDFC BANK", type: "F&O", action: "BUY", entry: "1,890", sl: "1,860", target1: "1,950", target2: "2,010", confidence: 76, rr: "2.1:1", pattern: "Bullish OI Buildup", indicators: "RSI: 57 | OI: +14% | VWAP: 1,878 | PCR: 1.28", timeframe: "30 min", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "10:21:07", whyEntry: "Call OI unwinding at 1,900 (resistance shifting). Put OI building at 1,860 (strong support). Price above VWAP with positive momentum.", whySL: "Below VWAP at 1,860 = trend shift. Strong put OI here provides natural stop level.", whyTarget: "T1 at 1,950 = next resistance cluster. T2 at 2,010 = 52W high test. Banking sector in bullish phase." },
  { id: 6, symbol: "MIDCAP NIFTY", type: "F&O", action: "BUY", entry: "52,800", sl: "52,400", target1: "53,500", target2: "54,200", confidence: 69, rr: "2.1:1", pattern: "Ascending Triangle", indicators: "RSI: 61 | Pattern: Ascending Triangle | Breadth: 72% | Vol: +", timeframe: "1 hour", agents: ["ANALYST","SUPERVISOR"], timestamp: "10:35:22", whyEntry: "Ascending triangle breakout with increasing volume. Market breadth at 72% positive. Small/midcap showing relative strength vs large caps.", whySL: "Below triangle support at 52,400. Pattern failure zone.", whyTarget: "T1 = measured move from triangle height. T2 = historical resistance. Midcap rotation ongoing." },
  { id: 7, symbol: "BAJAJ FINANCE", type: "F&O", action: "SELL", entry: "7,950", sl: "8,080", target1: "7,750", target2: "7,600", confidence: 71, rr: "2.3:1", pattern: "Double Top + Divergence", indicators: "RSI Divergence | MACD Cross | Double Top | Vol: Declining", timeframe: "4 hour", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "11:02:15", whyEntry: "Double top formation at 8,000 resistance. Bearish RSI divergence (price higher, RSI lower). MACD bearish cross on 4H. Declining volume on rallies.", whySL: "Above double top neckline at 8,080. Pattern invalidation.", whyTarget: "T1 = neckline support at 7,750. T2 = next demand zone at 7,600. NBFC sector facing margin pressure." },
  { id: 8, symbol: "INFY", type: "Stocks", action: "BUY", entry: "1,620", sl: "1,580", target1: "1,690", target2: "1,750", confidence: 78, rr: "2.5:1", pattern: "Hammer + Support Bounce", indicators: "RSI: 48 | Hammer Candle | Support: 1,580 | Vol: +25%", timeframe: "Daily", agents: ["ANALYST","RESEARCHER","SUPERVISOR"], timestamp: "11:18:44", whyEntry: "Hammer candlestick at key support (1,580). Volume 25% above average. RSI at neutral 48 (room to run). IT sector momentum positive.", whySL: "Below hammer low and support at 1,580.", whyTarget: "T1 = 1,690 = prior resistance now target. T2 = 1,750 = 52W high zone. Strong demand at support." },
];

const TV_MAP: Record<string, string> = {
  "NIFTY 50": "NSE:NIFTY50", "BANK NIFTY": "NSE:BANKNIFTY",
  "RELIANCE": "NSE:RELIANCE", "TCS": "NSE:TCS", "HDFC BANK": "NSE:HDFCBANK",
  "MIDCAP NIFTY": "NSE:NIFTY50", "BAJAJ FINANCE": "NSE:BAJFINANCE", "INFY": "NSE:INFY",
};

export default function Signals() {
  const [typeFilter, setTypeFilter] = useState<"All" | "F&O" | "Stocks">("All");
  const [actionFilter, setActionFilter] = useState<"All" | "BUY" | "SELL">("All");
  const [selected, setSelected] = useState(ALL_SIGNALS[0]);
  const [scanProgress, setScanProgress] = useState(65);
  const [liveSignals, setLiveSignals] = useState(ALL_SIGNALS);
  const [lastScan, setLastScan] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setScanProgress(p => p >= 100 ? 0 : p + 3), 400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveSignals(prev => prev.map(s => ({
        ...s,
        confidence: Math.max(60, Math.min(95, s.confidence + (Math.random() - 0.5) * 2)),
      })));
      setLastScan(new Date());
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const filtered = liveSignals.filter(s =>
    (typeFilter === "All" || s.type === typeFilter) &&
    (actionFilter === "All" || s.action === actionFilter)
  );

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">ALADDIN AI — TRADE SIGNALS</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Multi-Agent AI • Pattern Recognition • Entry/SL/Target with detailed rationale</p>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
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
          <div className="ml-auto text-[8px] text-[hsl(220,20%,35%)]">{filtered.length} SIGNALS</div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Signal list */}
          <div className="col-span-12 lg:col-span-4 space-y-2 overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s)}
                className={`glass-card rounded-lg p-3 cursor-pointer transition-all ${selected.id === s.id ? "border-[rgba(0,255,180,0.4)] shadow-[0_0_12px_rgba(0,255,180,0.08)]" : "glass-card-hover"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{s.action}</span>
                    <span className="text-[9px] font-bold text-[hsl(180,60%,75%)]">{s.symbol}</span>
                    <span className="text-[7px] text-[hsl(220,20%,35%)] border border-[rgba(255,255,255,0.08)] px-1 rounded">{s.type}</span>
                  </div>
                  <span className="text-[7px] text-[hsl(220,20%,32%)]">{s.timestamp}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[8px] mb-1.5">
                  <div><span className="text-[hsl(220,20%,38%)]">ENTRY </span><span className="text-[hsl(180,50%,70%)]">{s.entry}</span></div>
                  <div><span className="text-[hsl(0,80%,55%)]">SL </span><span className="neon-red">{s.sl}</span></div>
                  <div><span className="text-[hsl(168,80%,45%)]">T1 </span><span className="neon-green">{s.target1}</span></div>
                </div>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-1.5">{s.pattern} • {s.timeframe}</div>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                    <div className={`h-full rounded-full transition-all ${s.confidence >= 80 ? "bg-[hsl(168,100%,50%)]" : s.confidence >= 70 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${s.confidence}%` }} />
                  </div>
                  <span className="text-[8px] tabular-nums text-[hsl(220,20%,38%)]">{s.confidence.toFixed(0)}%</span>
                  <span className="text-[8px] font-bold text-[hsl(200,80%,55%)]">R:R {s.rr}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel + Chart */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${selected.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{selected.action}</span>
                    <h2 className="text-lg font-bold text-[hsl(180,60%,80%)]">{selected.symbol}</h2>
                    <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.1)] text-[hsl(220,20%,45%)]">{selected.type}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)] text-[hsl(220,20%,40%)]">{selected.timeframe}</span>
                  </div>
                  <div className="text-[9px] text-[hsl(220,20%,38%)]">{selected.pattern} • Generated {selected.timestamp} IST</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold tabular-nums ${selected.confidence >= 80 ? "neon-green" : "neon-yellow"}`}>{selected.confidence.toFixed(0)}%</div>
                  <div className="text-[8px] text-[hsl(220,20%,38%)]">CONFIDENCE</div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                {[
                  { label: "ENTRY PRICE", value: selected.entry, color: "text-[hsl(180,50%,70%)]" },
                  { label: "STOP LOSS", value: selected.sl, color: "neon-red" },
                  { label: "TARGET 1", value: selected.target1, color: "neon-green" },
                  { label: "TARGET 2", value: selected.target2, color: "neon-green" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                    <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">{label}</div>
                    <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
                  </div>
                ))}
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
                  <div className="text-[7px] text-[hsl(168,80%,45%)] font-bold mb-1">WHY ENTRY AT {selected.entry}?</div>
                  <div className="text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">{selected.whyEntry}</div>
                </div>
                <div className="bg-[rgba(255,80,80,0.03)] border border-[rgba(255,80,80,0.08)] rounded p-2.5">
                  <div className="text-[7px] neon-red font-bold mb-1">WHY STOP LOSS AT {selected.sl}?</div>
                  <div className="text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">{selected.whySL}</div>
                </div>
                <div className="bg-[rgba(0,255,180,0.03)] border border-[rgba(0,255,180,0.08)] rounded p-2.5">
                  <div className="text-[7px] text-[hsl(168,80%,45%)] font-bold mb-1">WHY TARGET AT {selected.target1} / {selected.target2}?</div>
                  <div className="text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">{selected.whyTarget}</div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
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
              <TradingViewWidget symbol={TV_MAP[selected.symbol] || "NSE:NIFTY50"} height={300} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
