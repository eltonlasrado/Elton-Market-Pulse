import { useEffect, useState } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchQuotes } from "@/lib/api";

interface Quote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
}

const SECTORS = [
  { name: "BANKING", symbol: "^NSEBANK", change: 1.24, stocks: ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","KOTAKBANK.NS"], tvSym: "NSE:BANKNIFTY" },
  { name: "IT", symbol: "^CNXIT", change: 0.87, stocks: ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS"], tvSym: "NSE:NIFTYIT" },
  { name: "AUTO", symbol: "^CNXAUTO", change: 2.14, stocks: ["MARUTI.NS","TATAMOTORS.NS","BAJAJ-AUTO.NS"], tvSym: "NSE:NIFTYAUTO" },
  { name: "PHARMA", symbol: "^CNXPHARMA", change: -0.43, stocks: ["SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS"], tvSym: "NSE:NIFTYPHARMA" },
  { name: "ENERGY", symbol: "^CNXENERGY", change: 1.65, stocks: ["RELIANCE.NS","ONGC.NS","NTPC.NS","POWERGRID.NS"], tvSym: "NSE:NIFTYENERGY" },
  { name: "METALS", symbol: "^CNXMETAL", change: -1.02, stocks: ["TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS"], tvSym: "NSE:NIFTYMETAL" },
  { name: "FMCG", symbol: "^CNXFMCG", change: 0.31, stocks: ["HINDUNILVR.NS","ITC.NS","NESTLE.NS"], tvSym: "NSE:NIFTYFMCG" },
  { name: "REALTY", symbol: "^CNXREALTY", change: 3.21, stocks: ["DLF.NS","GODREJPROP.NS","OBEROIRLTY.NS"], tvSym: "NSE:NIFTYREALTY" },
];

// Static FII/DII data (live data requires BSE subscription)
const FII_DII_DATA = [
  { date: "07 May", fii: 2840, dii: -1120, niftyChg: 1.24 },
  { date: "06 May", fii: -850, dii: 1640, niftyChg: -0.32 },
  { date: "05 May", fii: 4230, dii: -2100, niftyChg: 1.87 },
  { date: "02 May", fii: -1540, dii: 2350, niftyChg: -0.54 },
  { date: "01 May", fii: 3120, dii: -980, niftyChg: 0.93 },
  { date: "30 Apr", fii: -2890, dii: 3100, niftyChg: -1.12 },
  { date: "29 Apr", fii: 5480, dii: -1870, niftyChg: 2.14 },
];

const MACRO_DATA = [
  { label: "USD/INR", value: "83.45", change: "+0.12", type: "FOREX" },
  { label: "EUR/INR", value: "90.23", change: "-0.05", type: "FOREX" },
  { label: "GOLD (₹/10g)", value: "72,450", change: "+320", type: "COMMODITY" },
  { label: "CRUDE WTI", value: "$82.40", change: "+0.85", type: "COMMODITY" },
  { label: "BRENT", value: "$85.20", change: "+0.92", type: "COMMODITY" },
  { label: "10Y G-SEC", value: "7.08%", change: "-0.02", type: "BOND" },
  { label: "VIX", value: "13.2", change: "-0.4", type: "VOLATILITY" },
  { label: "INDIA VIX", value: "14.8", change: "+0.6", type: "VOLATILITY" },
];

const PREDICTED_RANGES = [
  { symbol: "NIFTY 50", spot: 24520, predLow: 24180, predHigh: 24880, support: [24200, 24350], resistance: [24700, 24900], bias: "BULLISH", confidence: 82 },
  { symbol: "BANK NIFTY", spot: 52150, predLow: 51600, predHigh: 53100, support: [51800, 52000], resistance: [52800, 53200], bias: "BULLISH", confidence: 75 },
  { symbol: "FINNIFTY", spot: 23840, predLow: 23600, predHigh: 24100, support: [23650, 23750], resistance: [24000, 24150], bias: "NEUTRAL", confidence: 68 },
];

export default function MarketPulse() {
  const [activeTab, setActiveTab] = useState<"overview"|"sectors"|"fii"|"macro"|"breadth">("overview");
  const [sectorQuotes, setSectorQuotes] = useState<Record<string, Quote>>({});
  const [lastUpdated] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const syms = SECTORS.map(s => s.symbol);
        const res = await fetchQuotes(syms);
        if (res.success) {
          const map: Record<string, Quote> = {};
          res.data.forEach((q: Quote) => { map[q.symbol] = q; });
          setSectorQuotes(map);
        }
      } catch {}
    };
    load();
  }, []);

  const tabs = ["overview", "sectors", "fii", "macro", "breadth"] as const;

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-wider">MARKET PULSE INSIGHTS</h1>
            <p className="text-[10px] text-[hsl(220,20%,35%)]">FII/DII Flows • Sector Analysis • Macro Data • AI Predictions</p>
          </div>
          <div className="text-[9px] text-[hsl(220,20%,35%)]">UPDATED: <span className="text-[hsl(168,100%,45%)]">{lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span></div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-[rgba(0,255,180,0.1)]">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-[9px] font-bold tracking-widest transition-all border-b-2 ${activeTab === t ? "nav-active" : "text-[hsl(220,20%,40%)] border-transparent hover:text-[hsl(180,60%,70%)]"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Predicted ranges */}
            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">🤖 AI PREDICTED RANGES — TODAY</div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {PREDICTED_RANGES.map(pr => (
                  <div key={pr.symbol} className="bg-[rgba(0,0,0,0.3)] rounded-lg p-4 border border-[rgba(0,255,180,0.08)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[hsl(180,60%,70%)]">{pr.symbol}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${pr.bias === "BULLISH" ? "bg-[rgba(0,255,180,0.15)] neon-green" : pr.bias === "BEARISH" ? "bg-[rgba(255,80,80,0.15)] neon-red" : "bg-[rgba(255,200,0,0.1)] neon-yellow"}`}>{pr.bias}</span>
                    </div>
                    <div className="text-2xl font-bold neon-green tabular-nums mb-3">{pr.spot.toLocaleString("en-IN")}</div>

                    {/* Range bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-[8px] text-[hsl(220,20%,40%)] mb-1">
                        <span>PRED LOW: <span className="neon-red">{pr.predLow.toLocaleString("en-IN")}</span></span>
                        <span>PRED HIGH: <span className="neon-green">{pr.predHigh.toLocaleString("en-IN")}</span></span>
                      </div>
                      <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,80,80,0.3)] via-[rgba(0,255,180,0.4)] to-[rgba(0,255,180,0.3)] rounded-full"></div>
                        {/* Spot indicator */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full shadow-[0_0_4px_white]"
                          style={{ left: `${((pr.spot - pr.predLow) / (pr.predHigh - pr.predLow) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[8px]">
                      <div>
                        <div className="text-[hsl(220,20%,40%)] mb-0.5">SUPPORT</div>
                        {pr.support.map(s => <div key={s} className="neon-green tabular-nums">{s.toLocaleString("en-IN")}</div>)}
                      </div>
                      <div>
                        <div className="text-[hsl(220,20%,40%)] mb-0.5">RESISTANCE</div>
                        {pr.resistance.map(r => <div key={r} className="neon-red tabular-nums">{r.toLocaleString("en-IN")}</div>)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      <div className="flex-1 h-1 bg-[rgba(255,255,255,0.05)] rounded-full">
                        <div className="h-full rounded-full bg-[hsl(168,100%,50%)]" style={{ width: `${pr.confidence}%` }} />
                      </div>
                      <span className="text-[8px] text-[hsl(220,20%,40%)]">{pr.confidence}% CONF</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TradingView global markets */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-[rgba(0,255,180,0.1)] text-[10px] font-bold text-[hsl(168,100%,50%)]">NIFTY 50 — TECHNICAL OVERVIEW</div>
                <TradingViewWidget symbol="CAPITALCOM:NIFTY50" height={400} />
              </div>
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="glass-card rounded-lg p-4">
                  <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-3 tracking-wider">MACRO SNAPSHOT</div>
                  <div className="space-y-2">
                    {MACRO_DATA.slice(0, 6).map(m => {
                      const up = !m.change.startsWith("-");
                      return (
                        <div key={m.label} className="flex justify-between items-center py-1 border-b border-[rgba(255,255,255,0.04)]">
                          <span className="text-[9px] text-[hsl(220,20%,45%)]">{m.label}</span>
                          <div className="text-right">
                            <div className="text-[9px] font-bold text-[hsl(180,50%,70%)] tabular-nums">{m.value}</div>
                            <div className={`text-[8px] tabular-nums ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{m.change}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sectors" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {SECTORS.map(s => {
                const q = sectorQuotes[s.symbol];
                const chg = q?.regularMarketChangePercent ?? s.change;
                const up = chg >= 0;
                return (
                  <div key={s.name} className="glass-card glass-card-hover rounded-lg p-4 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-bold text-[hsl(180,50%,70%)] tracking-wider">{s.name}</span>
                      <span className={`text-[9px] font-bold ${up ? "neon-green" : "neon-red"}`}>{up ? "+" : ""}{chg.toFixed(2)}%</span>
                    </div>
                    {/* Heatmap bar */}
                    <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: `rgba(${up ? "0,255,180" : "255,80,80"},0.2)` }}>
                      <div className={`h-full rounded-full ${up ? "bg-[hsl(168,100%,50%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${Math.min(100, Math.abs(chg) * 20)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {s.stocks.slice(0, 3).map(sym => (
                        <span key={sym} className="text-[7px] px-1 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[hsl(220,20%,45%)]">{sym.replace(".NS", "")}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sector heatmap visual */}
            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">SECTOR ROTATION HEATMAP</div>
              <div className="grid grid-cols-4 gap-2">
                {SECTORS.map(s => {
                  const q = sectorQuotes[s.symbol];
                  const chg = q?.regularMarketChangePercent ?? s.change;
                  const intensity = Math.min(1, Math.abs(chg) / 4);
                  const up = chg >= 0;
                  return (
                    <div key={s.name} className="rounded-lg p-4 text-center transition-all cursor-pointer"
                      style={{ background: up ? `rgba(0,255,180,${0.08 + intensity * 0.3})` : `rgba(255,80,80,${0.08 + intensity * 0.3})`, border: `1px solid rgba(${up ? "0,255,180" : "255,80,80"},${0.15 + intensity * 0.2})` }}>
                      <div className="text-[9px] font-bold text-[hsl(180,50%,80%)] mb-1">{s.name}</div>
                      <div className={`text-lg font-bold tabular-nums ${up ? "neon-green" : "neon-red"}`}>{up ? "+" : ""}{chg.toFixed(2)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "fii" && (
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">FII / DII ACTIVITY — CASH MARKET (₹ Cr)</div>
              <div className="overflow-auto">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="bg-[rgba(0,0,0,0.5)]">
                      {["DATE","FII NET (₹Cr)","DII NET (₹Cr)","NIFTY CHNG%","MARKET IMPACT"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[hsl(220,20%,40%)] font-bold tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FII_DII_DATA.map((row, i) => {
                      const fiiUp = row.fii >= 0;
                      const niftyUp = row.niftyChg >= 0;
                      return (
                        <tr key={i} className="border-t border-[rgba(255,255,255,0.04)] table-row-hover">
                          <td className="px-4 py-3 text-[hsl(180,40%,65%)] font-bold">{row.date}</td>
                          <td className={`px-4 py-3 font-bold tabular-nums ${fiiUp ? "neon-green" : "neon-red"}`}>
                            {fiiUp ? "+" : ""}{row.fii.toLocaleString("en-IN")}
                          </td>
                          <td className={`px-4 py-3 font-bold tabular-nums ${row.dii >= 0 ? "neon-green" : "neon-red"}`}>
                            {row.dii >= 0 ? "+" : ""}{row.dii.toLocaleString("en-IN")}
                          </td>
                          <td className={`px-4 py-3 font-bold tabular-nums ${niftyUp ? "neon-green" : "neon-red"}`}>
                            {niftyUp ? "+" : ""}{row.niftyChg}%
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${fiiUp ? "bg-[rgba(0,255,180,0.1)] text-[hsl(168,100%,50%)]" : "bg-[rgba(255,80,80,0.1)] text-[hsl(0,80%,60%)]"}`}>
                              {fiiUp ? "RISK-ON" : "RISK-OFF"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FII bar chart */}
            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">7-DAY FII vs DII FLOW CHART</div>
              <div className="flex items-end gap-3 h-32">
                {FII_DII_DATA.map((row, i) => {
                  const maxVal = 6000;
                  const fiiH = (Math.abs(row.fii) / maxVal) * 100;
                  const diiH = (Math.abs(row.dii) / maxVal) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: 100 }}>
                        <div className="flex-1 rounded-t transition-all"
                          style={{ height: `${fiiH}%`, background: row.fii >= 0 ? "hsl(168,100%,40%)" : "hsl(0,90%,50%)", opacity: 0.8 }} />
                        <div className="flex-1 rounded-t transition-all"
                          style={{ height: `${diiH}%`, background: row.dii >= 0 ? "hsl(200,100%,50%)" : "hsl(30,100%,55%)", opacity: 0.8 }} />
                      </div>
                      <div className="text-[7px] text-[hsl(220,20%,35%)]">{row.date.split(" ")[0]}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-[8px] mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[hsl(168,100%,40%)]"></div>FII</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[hsl(200,100%,50%)]"></div>DII</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "macro" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {MACRO_DATA.map(m => {
              const up = !m.change.startsWith("-");
              return (
                <div key={m.label} className="glass-card glass-card-hover rounded-lg p-5 transition-all">
                  <div className="text-[8px] text-[hsl(220,20%,40%)] font-bold tracking-wider mb-1">{m.type}</div>
                  <div className="text-[10px] text-[hsl(180,50%,70%)] mb-2">{m.label}</div>
                  <div className="text-2xl font-bold text-white tabular-nums mb-1">{m.value}</div>
                  <div className={`text-xs font-bold ${up ? "neon-green" : "neon-red"}`}>{m.change}</div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "breadth" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "ADVANCING", value: "1,248", total: "1,745", color: "neon-green", bg: "rgba(0,255,180,0.1)" },
                { label: "DECLINING", value: "456", total: "1,745", color: "neon-red", bg: "rgba(255,80,80,0.1)" },
                { label: "UNCHANGED", value: "41", total: "1,745", color: "neon-yellow", bg: "rgba(255,200,0,0.1)" },
                { label: "NEW 52W HIGH", value: "84", total: "—", color: "neon-green", bg: "rgba(0,255,180,0.05)" },
              ].map(b => (
                <div key={b.label} className="glass-card rounded-lg p-4" style={{ background: b.bg }}>
                  <div className="text-[9px] text-[hsl(220,20%,40%)] font-bold tracking-wider mb-2">{b.label}</div>
                  <div className={`text-3xl font-bold tabular-nums ${b.color}`}>{b.value}</div>
                  {b.total !== "—" && <div className="text-[8px] text-[hsl(220,20%,35%)] mt-1">of {b.total} stocks</div>}
                </div>
              ))}
            </div>

            {/* Advance/Decline ratio visual */}
            <div className="glass-card rounded-lg p-4">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">MARKET BREADTH — ADVANCE/DECLINE RATIO</div>
              <div className="space-y-3">
                {["NSE","BSE","NIFTY 200","NIFTY 500"].map((mkt, i) => {
                  const adv = [71.5, 67.3, 74.2, 69.8][i];
                  return (
                    <div key={mkt}>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-[hsl(220,20%,45%)]">{mkt}</span>
                        <span className="text-[hsl(180,50%,70%)]">{adv}% advancing</span>
                      </div>
                      <div className="h-2.5 bg-[rgba(255,80,80,0.3)] rounded-full overflow-hidden">
                        <div className="h-full bg-[hsl(168,100%,45%)] rounded-full transition-all" style={{ width: `${adv}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
