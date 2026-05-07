import { useState, useEffect } from "react";

export default function RiskEngine() {
  const [capital, setCapital] = useState(1000000);
  const [dailyPnl, setDailyPnl] = useState(-22500);
  const [killActive, setKillActive] = useState(false);
  const [autoHedge, setAutoHedge] = useState(false);
  const [riskPct] = useState(1.5);

  const drawdownPct = (Math.abs(dailyPnl) / capital) * 100;
  const killThreshold = 5;
  const isNearKill = drawdownPct > 3.5;

  useEffect(() => {
    if (drawdownPct >= killThreshold) setKillActive(true);
  }, [drawdownPct]);

  const RISK_RULES = [
    { rule: "Max position size", value: "1.5% – 2% of capital", status: "OK" },
    { rule: "Daily drawdown limit", value: "5% of capital", status: isNearKill ? "WARN" : "OK" },
    { rule: "EMA-50 trend filter", value: "Price > EMA-50 for BUY", status: "OK" },
    { rule: "Min Risk:Reward", value: "1:2 minimum enforced", status: "OK" },
    { rule: "Stop-loss method", value: "ATR-based dynamic SL", status: "OK" },
    { rule: "Data staleness lock", value: "Freeze orders if latency > 5s", status: "OK" },
    { rule: "Garbage data filter", value: "WebSocket latency monitor", status: "OK" },
    { rule: "Lot size validation", value: "2026 lot sizes hardcoded", status: "OK" },
  ];

  const POSITION_HISTORY = [
    { symbol: "NIFTY 50 CE 24500", entry: "245.00", exit: "312.50", lots: 2, pnl: 10125, status: "CLOSED" },
    { symbol: "BANK NIFTY PE 52000", entry: "180.00", exit: "95.00", lots: 1, pnl: -12750, status: "CLOSED" },
    { symbol: "TCS", entry: "4120", exit: "4205", lots: 0, pnl: 8500, qty: 100, status: "CLOSED" },
    { symbol: "HDFC BANK CE 1900", entry: "42.00", exit: "—", lots: 1, pnl: -18375, status: "OPEN" },
  ];

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-wider">RISK ENGINE</h1>
            <p className="text-[10px] text-[hsl(220,20%,35%)]">Lean Six Sigma Variance Control • ATR Stop-Loss • Real-time Guardrails</p>
          </div>
        </div>

        {/* Kill switch banner */}
        {(killActive || isNearKill) && (
          <div className={`rounded-lg p-4 border-2 text-center ${killActive ? "bg-[rgba(255,0,0,0.15)] border-[hsl(0,90%,55%)]" : "bg-[rgba(255,200,0,0.1)] border-[hsl(45,100%,55%)]"}`}>
            <div className={`text-lg font-bold tracking-widest ${killActive ? "neon-red" : "neon-yellow"}`}>
              {killActive ? "⚠ KILL SWITCH ACTIVATED — ALL TRADING HALTED" : "⚠ WARNING: APPROACHING DAILY DRAWDOWN LIMIT"}
            </div>
            <div className="text-[10px] mt-1 text-[hsl(220,20%,60%)]">
              {killActive ? `Daily drawdown exceeded ${killThreshold}%. No new orders permitted.` : `Current drawdown: ${drawdownPct.toFixed(2)}% — Kill switch triggers at ${killThreshold}%`}
            </div>
          </div>
        )}

        {/* P&L Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "CAPITAL", value: `₹${capital.toLocaleString("en-IN")}`, color: "text-white" },
            { label: "DAILY P&L", value: `${dailyPnl >= 0 ? "+" : ""}₹${dailyPnl.toLocaleString("en-IN")}`, color: dailyPnl >= 0 ? "neon-green" : "neon-red" },
            { label: "DRAWDOWN", value: `${drawdownPct.toFixed(2)}%`, color: drawdownPct > 3.5 ? "neon-red" : "neon-yellow" },
            { label: "RISK/TRADE", value: `${riskPct}%`, color: "neon-blue" },
          ].map(item => (
            <div key={item.label} className="glass-card rounded-lg p-4">
              <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">{item.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Drawdown meter */}
        <div className="glass-card rounded-lg p-4">
          <div className="flex justify-between text-[9px] mb-2">
            <span className="text-[hsl(220,20%,40%)] font-bold">DAILY DRAWDOWN METER</span>
            <span className={drawdownPct > 3.5 ? "neon-red" : "neon-yellow"}>{drawdownPct.toFixed(2)}% / {killThreshold}%</span>
          </div>
          <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden relative">
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(100, (drawdownPct / killThreshold) * 100)}%`,
              background: drawdownPct > 4 ? "hsl(0,90%,55%)" : drawdownPct > 3 ? "hsl(30,100%,55%)" : "hsl(168,100%,50%)"
            }} />
            {/* Kill line marker at 100% */}
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-[hsl(0,90%,55%)]" />
          </div>
          <div className="flex justify-between text-[8px] mt-1 text-[hsl(220,20%,35%)]">
            <span>0%</span><span>KILL ZONE →</span><span>{killThreshold}%</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Risk rules */}
          <div className="col-span-12 lg:col-span-5 glass-card rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[rgba(0,255,180,0.1)] text-[10px] font-bold text-[hsl(168,100%,50%)]">RISK RULES — ACTIVE GUARDRAILS</div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {RISK_RULES.map(r => (
                <div key={r.rule} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-[hsl(180,50%,70%)]">{r.rule}</div>
                    <div className="text-[8px] text-[hsl(220,20%,40%)]">{r.value}</div>
                  </div>
                  <span className={`text-[8px] px-2 py-0.5 rounded font-bold ${r.status === "OK" ? "bg-[rgba(0,255,180,0.1)] neon-green" : "bg-[rgba(255,200,0,0.1)] neon-yellow"}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">SYSTEM CONTROLS</div>
              <div className="space-y-3">
                <button onClick={() => setKillActive(!killActive)}
                  className={`w-full py-3 rounded-lg font-bold tracking-wider text-sm transition-all ${killActive ? "bg-[rgba(255,80,80,0.3)] border-2 border-[hsl(0,90%,55%)] neon-red" : "kill-switch text-[hsl(0,80%,60%)]"}`}>
                  ⚠ KILL SWITCH<br/>
                  <span className="text-[9px]">{killActive ? "ARMED — CLICK TO DISARM" : "SAFE — CLICK TO ARM"}</span>
                </button>
                <button onClick={() => setAutoHedge(!autoHedge)}
                  className={`w-full py-2 rounded text-[10px] font-bold tracking-wider transition-all border ${autoHedge ? "bg-[rgba(0,255,180,0.15)] border-[rgba(0,255,180,0.4)] neon-green" : "border-[rgba(255,255,255,0.1)] text-[hsl(220,20%,45%)]"}`}>
                  AUTO-HEDGE: {autoHedge ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-3 tracking-wider">RISK FORMULA</div>
              <div className="bg-[rgba(0,0,0,0.4)] rounded p-3 font-mono text-[8px] space-y-1">
                <div className="text-[hsl(220,20%,40%)]">// Position sizing</div>
                <div className="text-[hsl(168,80%,60%)]">risk = capital × 0.015</div>
                <div className="text-[hsl(168,80%,60%)]">sl_pts = 2 × ATR(14)</div>
                <div className="text-[hsl(168,80%,60%)]">qty = risk / sl_pts</div>
                <div className="text-[hsl(168,80%,60%)]">lots = floor(qty / lot)</div>
                <div className="text-[hsl(220,20%,40%)] mt-2">// Target</div>
                <div className="text-[hsl(168,80%,60%)]">target = entry + 2×sl_pts</div>
              </div>
            </div>
          </div>

          {/* Position history */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[rgba(0,255,180,0.1)] text-[10px] font-bold text-[hsl(168,100%,50%)]">TRADE HISTORY</div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {POSITION_HISTORY.map((p, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-[hsl(180,50%,70%)]">{p.symbol}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${p.status === "OPEN" ? "bg-[rgba(0,255,180,0.1)] neon-green" : "bg-[rgba(255,255,255,0.05)] text-[hsl(220,20%,45%)]"}`}>{p.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[8px]">
                    <div><span className="text-[hsl(220,20%,38%)]">ENTRY: </span><span className="text-[hsl(180,40%,65%)]">{p.entry}</span></div>
                    <div><span className="text-[hsl(220,20%,38%)]">EXIT: </span><span className="text-[hsl(180,40%,65%)]">{p.exit}</span></div>
                    <div><span className={p.pnl >= 0 ? "neon-green" : "neon-red"}>{p.pnl >= 0 ? "+" : ""}₹{p.pnl.toLocaleString("en-IN")}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
