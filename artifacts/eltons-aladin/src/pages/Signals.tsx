import { useState, useEffect } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";

const AGENTS = [
  { name: "ANALYST", role: "Quantitative Engine", status: "ACTIVE", desc: "Scans OHLCV every 5–18s for 15+ patterns", icon: "📊" },
  { name: "RESEARCHER", role: "Fundamental (RAG)", status: "ACTIVE", desc: "Pulls news context from BSE India & World Monitor", icon: "🔬" },
  { name: "RISK", role: "Systemic Guardrail", status: "ACTIVE", desc: "EMA-50 filter, 1.5%-2% position cap, ATR stop-loss", icon: "🛡️" },
  { name: "SUPERVISOR", role: "Executive Decision", status: "ACTIVE", desc: "Claude 3.5 Sonnet orchestration — JSON output", icon: "🤖" },
];

const ALL_SIGNALS = [
  { id: 1, symbol: "NIFTY 50", type: "F&O", action: "BUY", entry: "24,450", sl: "24,200", target1: "24,720", target2: "24,950", confidence: 87, rr: "2.2:1", pattern: "Bullish Engulfing", indicators: "RSI 58, MACD Cross, VWAP Above", timeframe: "15 min", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "09:47:23" },
  { id: 2, symbol: "BANK NIFTY", type: "F&O", action: "BUY", entry: "52,100", sl: "51,700", target1: "52,800", target2: "53,400", confidence: 79, rr: "2.5:1", pattern: "Golden Cross", indicators: "EMA20/50 Cross, Strong OI Buildup", timeframe: "5 min", agents: ["ANALYST","RESEARCHER","RISK","SUPERVISOR"], timestamp: "09:52:11" },
  { id: 3, symbol: "RELIANCE", type: "Stocks", action: "SELL", entry: "2,940", sl: "2,975", target1: "2,880", target2: "2,820", confidence: 72, rr: "2.0:1", pattern: "Bearish MACD Cross", indicators: "MACD Negative, Resistance at 2,960, RSI 62", timeframe: "1 hour", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "10:02:45" },
  { id: 4, symbol: "TCS", type: "Stocks", action: "BUY", entry: "4,150", sl: "4,080", target1: "4,280", target2: "4,400", confidence: 83, rr: "2.8:1", pattern: "Morning Star", indicators: "52W High Breakout, Hammer on Daily, Volume Surge", timeframe: "Daily", agents: ["ANALYST","RESEARCHER","SUPERVISOR"], timestamp: "10:14:33" },
  { id: 5, symbol: "HDFC BANK", type: "F&O", action: "BUY", entry: "1,890", sl: "1,860", target1: "1,950", target2: "2,010", confidence: 76, rr: "2.1:1", pattern: "Bullish OI Buildup", indicators: "Call Writing Unwinding, PCR > 1.2, VWAP Support", timeframe: "30 min", agents: ["ANALYST","RISK","SUPERVISOR"], timestamp: "10:21:07" },
  { id: 6, symbol: "MIDCAP NIFTY", type: "F&O", action: "BUY", entry: "52,800", sl: "52,400", target1: "53,500", target2: "54,200", confidence: 69, rr: "2.1:1", pattern: "Ascending Triangle", indicators: "Breakout with Volume, Breadth Positive", timeframe: "1 hour", agents: ["ANALYST","SUPERVISOR"], timestamp: "10:35:22" },
];

export default function Signals() {
  const [filter, setFilter] = useState<"All"|"F&O"|"Stocks">("All");
  const [actionFilter, setActionFilter] = useState<"All"|"Buy"|"Sell">("All");
  const [selectedSignal, setSelectedSignal] = useState(ALL_SIGNALS[0]);
  const [scanProgress, setScanProgress] = useState(65);

  useEffect(() => {
    const t = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) return 0;
        return p + 2;
      });
    }, 300);
    return () => clearInterval(t);
  }, []);

  const filtered = ALL_SIGNALS.filter(s =>
    (filter === "All" || s.type === filter) &&
    (actionFilter === "All" || s.action === actionFilter.toUpperCase())
  );

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-wider">ALADDIN AI — TRADE SIGNALS</h1>
            <p className="text-[10px] text-[hsl(220,20%,35%)]">Multi-Agent AI Architecture • Claude 3.5 Sonnet • Real-time Pattern Recognition</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[9px] text-[hsl(220,20%,35%)]">SCAN PROGRESS</div>
            <div className="w-24 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full">
              <div className="h-full bg-[hsl(168,100%,50%)] rounded-full transition-all" style={{ width: `${scanProgress}%` }} />
            </div>
            <span className="text-[9px] neon-green tabular-nums">{scanProgress}%</span>
          </div>
        </div>

        {/* Agent status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {AGENTS.map(a => (
            <div key={a.name} className="glass-card rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{a.icon}</span>
                  <div>
                    <div className="text-[9px] font-bold text-[hsl(168,100%,50%)]">{a.name}</div>
                    <div className="text-[8px] text-[hsl(220,20%,40%)]">{a.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
                  <span className="text-[8px] neon-green">{a.status}</span>
                </div>
              </div>
              <div className="text-[8px] text-[hsl(220,20%,38%)]">{a.desc}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {(["All","F&O","Stocks"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all ${filter === f ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)] hover:text-[hsl(180,60%,70%)]"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["All","Buy","Sell"] as const).map(f => (
              <button key={f} onClick={() => setActionFilter(f)}
                className={`px-3 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all ${actionFilter === f ? "bg-[rgba(0,255,180,0.15)] border border-[rgba(0,255,180,0.3)] text-[hsl(180,60%,75%)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {f === "Buy" ? "▲ BUY" : f === "Sell" ? "▼ SELL" : "ALL"}
              </button>
            ))}
          </div>
          <div className="ml-auto text-[9px] text-[hsl(220,20%,35%)]">{filtered.length} SIGNALS FOUND</div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Signal list */}
          <div className="col-span-12 lg:col-span-4 space-y-2">
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelectedSignal(s)}
                className={`glass-card rounded-lg p-4 cursor-pointer transition-all ${selectedSignal.id === s.id ? "border-[rgba(0,255,180,0.4)] shadow-[0_0_15px_rgba(0,255,180,0.1)]" : "glass-card-hover"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{s.action}</span>
                    <span className="text-[10px] font-bold text-[hsl(180,60%,75%)]">{s.symbol}</span>
                  </div>
                  <span className="text-[8px] text-[hsl(220,20%,35%)]">{s.timestamp}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] mb-1">
                  <div><span className="text-[hsl(220,20%,38%)]">ENTRY </span><span className="text-[hsl(180,50%,70%)]">{s.entry}</span></div>
                  <div><span className="text-[hsl(0,80%,55%)]">SL </span><span className="text-[hsl(0,70%,60%)]">{s.sl}</span></div>
                  <div><span className="text-[hsl(168,80%,45%)]">TGT </span><span className="neon-green">{s.target1}</span></div>
                </div>
                <div className="flex items-center justify-between text-[8px]">
                  <span className="text-[hsl(220,20%,38%)]">{s.pattern}</span>
                  <span className={`font-bold ${s.confidence >= 80 ? "neon-green" : s.confidence >= 70 ? "neon-yellow" : "text-[hsl(220,20%,50%)]"}`}>{s.confidence}% CONF</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="flex-1 h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                    <div className={`h-full rounded-full ${s.confidence >= 80 ? "bg-[hsl(168,100%,50%)]" : s.confidence >= 70 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${s.confidence}%` }} />
                  </div>
                  <span className="text-[8px] text-[hsl(220,20%,35%)]">R:R {s.rr}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Signal detail + chart */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="glass-card rounded-lg p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${selectedSignal.action === "BUY" ? "bg-[rgba(0,255,180,0.2)] neon-green" : "bg-[rgba(255,80,80,0.2)] neon-red"}`}>{selectedSignal.action}</span>
                    <h2 className="text-xl font-bold text-[hsl(180,60%,80%)]">{selectedSignal.symbol}</h2>
                    <span className="text-[9px] text-[hsl(220,20%,40%)] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)]">{selectedSignal.type}</span>
                  </div>
                  <div className="text-[9px] text-[hsl(220,20%,40%)]">{selectedSignal.timeframe} chart • Generated {selectedSignal.timestamp} IST</div>
                </div>
                <div className={`text-2xl font-bold tabular-nums ${selectedSignal.confidence >= 80 ? "neon-green" : "neon-yellow"}`}>{selectedSignal.confidence}%</div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "ENTRY", value: selectedSignal.entry, color: "text-[hsl(180,50%,70%)]" },
                  { label: "STOP LOSS", value: selectedSignal.sl, color: "neon-red" },
                  { label: "TARGET 1", value: selectedSignal.target1, color: "neon-green" },
                  { label: "TARGET 2", value: selectedSignal.target2, color: "neon-green" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-3">
                    <div className="text-[8px] text-[hsl(220,20%,40%)] mb-0.5">{label}</div>
                    <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">PATTERN DETECTED</div>
                  <div className="text-[10px] font-bold text-[hsl(168,80%,60%)]">{selectedSignal.pattern}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">RISK:REWARD</div>
                  <div className="text-[10px] font-bold neon-green">{selectedSignal.rr}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">INDICATORS</div>
                <div className="text-[9px] text-[hsl(180,40%,65%)]">{selectedSignal.indicators}</div>
              </div>

              <div>
                <div className="text-[9px] text-[hsl(220,20%,40%)] mb-2">AGENTS VALIDATED</div>
                <div className="flex gap-2">
                  {selectedSignal.agents.map(a => {
                    const agent = AGENTS.find(ag => ag.name === a)!;
                    return (
                      <div key={a} className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(0,255,180,0.08)] border border-[rgba(0,255,180,0.15)]">
                        <span className="text-xs">{agent.icon}</span>
                        <span className="text-[8px] font-bold neon-green">{a}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[10px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART — {selectedSignal.symbol}</div>
              <TradingViewWidget symbol="NSE:NIFTY" height={320} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
