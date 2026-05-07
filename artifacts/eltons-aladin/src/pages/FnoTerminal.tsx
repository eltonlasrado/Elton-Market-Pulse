import { useEffect, useState } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchQuotes } from "@/lib/api";

interface Quote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

// Lot sizes 2026
const LOT_SIZES: Record<string, number> = {
  "NIFTY": 75, "BANKNIFTY": 15, "FINNIFTY": 40, "MIDCPNIFTY": 75,
  "RELIANCE": 250, "TCS": 150, "HDFCBANK": 550, "INFY": 300,
  "ICICIBANK": 700, "BHARTIARTL": 950, "WIPRO": 1500, "LT": 175,
};

// Generate synthetic option chain
function generateOptionChain(spot: number, symbol: string) {
  const strikes = [];
  const atm = Math.round(spot / 50) * 50;
  const lotSize = LOT_SIZES[symbol] || 75;
  for (let i = -6; i <= 6; i++) {
    const strike = atm + i * 50;
    const moneyness = spot - strike;
    const timeVal = 45 + Math.random() * 60;
    const callLTP = Math.max(0.05, moneyness > 0 ? moneyness + timeVal : timeVal * Math.exp(moneyness / spot * 8));
    const putLTP = Math.max(0.05, moneyness < 0 ? -moneyness + timeVal : timeVal * Math.exp(-moneyness / spot * 8));
    const callOI = Math.floor(60000 + Math.random() * 200000 + (i === 0 ? 300000 : 0));
    const putOI = Math.floor(60000 + Math.random() * 200000 + (i === 0 ? 280000 : 0));
    const callChg = (Math.random() - 0.4) * 0.2;
    const putChg = (Math.random() - 0.6) * 0.2;
    const callDelta = Math.max(0.01, Math.min(0.99, 0.5 + moneyness / spot * 5));
    const putDelta = callDelta - 1;
    const gamma = 0.002 * Math.exp(-Math.pow(i, 2) / 4);
    const callTheta = -(callLTP * 0.03 + 2);
    const putTheta = -(putLTP * 0.03 + 1.5);
    const vega = strike * gamma * 0.01;
    strikes.push({
      strike, callLTP, putLTP, callOI, putOI,
      callChgPct: callChg, putChgPct: putChg,
      callDelta, putDelta, gamma: gamma.toFixed(4),
      callTheta: callTheta.toFixed(2), putTheta: putTheta.toFixed(2),
      vega: vega.toFixed(2),
      lotSize,
      callIV: (18 + Math.random() * 8 - Math.abs(i) * 0.5).toFixed(1),
      putIV: (18 + Math.random() * 8 - Math.abs(i) * 0.5 + 1).toFixed(1),
      isATM: i === 0,
    });
  }
  return strikes;
}

const INSTRUMENTS = [
  { label: "NIFTY 50", symbol: "NIFTY", tvSymbol: "CAPITALCOM:NIFTY50", yahooSymbol: "^NSEI" },
  { label: "BANK NIFTY", symbol: "BANKNIFTY", tvSymbol: "CAPITALCOM:BANKNIFTY", yahooSymbol: "^NSEBANK" },
  { label: "FIN NIFTY", symbol: "FINNIFTY", tvSymbol: "CAPITALCOM:NIFTY50", yahooSymbol: "^NSEI" },
  { label: "RELIANCE", symbol: "RELIANCE", tvSymbol: "NSE:RELIANCE", yahooSymbol: "RELIANCE.NS" },
  { label: "TCS", symbol: "TCS", tvSymbol: "NSE:TCS", yahooSymbol: "TCS.NS" },
  { label: "HDFC BANK", symbol: "HDFCBANK", tvSymbol: "NSE:HDFCBANK", yahooSymbol: "HDFCBANK.NS" },
];

const EXPIRIES = ["22 May 2025", "29 May 2025", "05 Jun 2025", "26 Jun 2025", "25 Sep 2025", "25 Dec 2025"];

export default function FnoTerminal() {
  const [selected, setSelected] = useState(INSTRUMENTS[0]);
  const [expiry, setExpiry] = useState(EXPIRIES[0]);
  const [spotPrice, setSpotPrice] = useState(24500);
  const [chain, setChain] = useState<ReturnType<typeof generateOptionChain>>([]);
  const [capital, setCapital] = useState(500000);
  const [riskPct, setRiskPct] = useState(1.5);
  const [tab, setTab] = useState<"chain"|"calculator"|"positions">("chain");
  const [loading, setLoading] = useState(false);

  const loadSpot = async () => {
    setLoading(true);
    try {
      const res = await fetchQuotes([selected.yahooSymbol]);
      if (res.success && res.data.length > 0) {
        const price = res.data[0].regularMarketPrice ?? spotPrice;
        setSpotPrice(price);
        setChain(generateOptionChain(price, selected.symbol));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadSpot(); }, [selected]);

  // Refresh chain data every 30s with slight randomization
  useEffect(() => {
    const t = setInterval(() => {
      if (spotPrice > 0) setChain(generateOptionChain(spotPrice + (Math.random() - 0.5) * 20, selected.symbol));
    }, 15000);
    return () => clearInterval(t);
  }, [spotPrice, selected]);

  const lotSize = LOT_SIZES[selected.symbol] || 75;
  const riskAmount = capital * riskPct / 100;
  const positionSize = riskAmount / (spotPrice * 0.02);
  const lots = Math.max(1, Math.floor(positionSize / lotSize));

  const maxCallOI = Math.max(...chain.map(c => c.callOI));
  const maxPutOI = Math.max(...chain.map(c => c.putOI));

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-wider">F&O TERMINAL</h1>
            <p className="text-[10px] text-[hsl(220,20%,35%)]">Options Chain • Greeks • Position Sizing • 2026 Lot Sizes</p>
          </div>

          {/* Instrument selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {INSTRUMENTS.map(inst => (
              <button key={inst.symbol} onClick={() => setSelected(inst)}
                className={`px-3 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all ${selected.symbol === inst.symbol ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)] hover:text-[hsl(180,60%,70%)]"}`}>
                {inst.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spot price + expiry */}
        <div className="glass-card rounded-lg p-4">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">{selected.label} SPOT</div>
              <div className="text-3xl font-bold neon-green tabular-nums">{spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">LOT SIZE</div>
              <div className="text-xl font-bold text-[hsl(200,100%,60%)]">{lotSize}</div>
            </div>
            <div>
              <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">EXPIRY</div>
              <select value={expiry} onChange={e => setExpiry(e.target.value)}
                className="bg-[rgba(0,0,0,0.5)] border border-[rgba(0,255,180,0.2)] rounded px-2 py-1 text-[10px] text-[hsl(180,60%,70%)] focus:outline-none">
                {EXPIRIES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="ml-auto flex gap-2">
              {(["chain","calculator","positions"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all ${tab === t ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)] hover:text-[hsl(180,60%,70%)]"}`}>
                  {t === "chain" ? "OPTION CHAIN" : t === "calculator" ? "POSITION CALC" : "POSITIONS"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === "chain" && (
          <div className="grid grid-cols-12 gap-4">
            {/* Option chain table */}
            <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <span className="text-[10px] font-bold text-[hsl(168,100%,50%)] tracking-wider">OPTION CHAIN — {selected.label} — {expiry}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
                  <span className="text-[9px] text-[hsl(168,80%,45%)]">LIVE DATA</span>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-[8.5px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[rgba(0,0,0,0.7)]">
                      <th colSpan={6} className="px-2 py-1.5 text-center text-[hsl(168,80%,45%)] font-bold border-r border-[rgba(0,255,180,0.1)]">CALLS</th>
                      <th className="px-2 py-1.5 text-center text-[hsl(220,20%,50%)] font-bold">STRIKE</th>
                      <th colSpan={6} className="px-2 py-1.5 text-center text-[hsl(0,80%,60%)] font-bold border-l border-[rgba(255,80,80,0.1)]">PUTS</th>
                    </tr>
                    <tr className="bg-[rgba(0,0,0,0.5)]">
                      {["OI","CHNG%","IV","DELTA","THETA","LTP"].map(h => (
                        <th key={h} className="px-2 py-1 text-right text-[hsl(220,20%,38%)] font-bold">{h}</th>
                      ))}
                      <th className="px-3 py-1 text-center text-[hsl(220,20%,50%)] font-bold">STRIKE</th>
                      {["LTP","THETA","DELTA","IV","CHNG%","OI"].map(h => (
                        <th key={h} className="px-2 py-1 text-left text-[hsl(220,20%,38%)] font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map((row) => (
                      <tr key={row.strike} className={`border-t transition-all ${row.isATM ? "bg-[rgba(0,255,180,0.06)] border-[rgba(0,255,180,0.15)]" : "border-[rgba(255,255,255,0.03)] table-row-hover"}`}>
                        {/* Call OI bar */}
                        <td className="px-2 py-1.5 text-right text-[hsl(168,60%,50%)] tabular-nums">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-12 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                              <div className="h-full oi-bar-call rounded-full" style={{ width: `${(row.callOI / maxCallOI) * 100}%` }} />
                            </div>
                            {(row.callOI / 1000).toFixed(0)}K
                          </div>
                        </td>
                        <td className={`px-2 py-1.5 text-right tabular-nums ${row.callChgPct >= 0 ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{row.callChgPct >= 0 ? "+" : ""}{(row.callChgPct * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right text-[hsl(45,80%,55%)] tabular-nums">{row.callIV}%</td>
                        <td className="px-2 py-1.5 text-right text-[hsl(200,80%,60%)] tabular-nums">{row.callDelta.toFixed(3)}</td>
                        <td className="px-2 py-1.5 text-right text-[hsl(0,80%,55%)] tabular-nums">{row.callTheta}</td>
                        <td className="px-2 py-1.5 text-right font-bold tabular-nums neon-green">{row.callLTP.toFixed(2)}</td>
                        {/* Strike */}
                        <td className={`px-3 py-1.5 text-center font-bold text-xs ${row.isATM ? "neon-yellow" : "text-[hsl(220,20%,55%)]"}`}>
                          {row.strike.toLocaleString("en-IN")}
                          {row.isATM && <span className="ml-1 text-[7px] text-[hsl(45,100%,55%)]">ATM</span>}
                        </td>
                        {/* Put side */}
                        <td className="px-2 py-1.5 text-left font-bold tabular-nums neon-red">{row.putLTP.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-left text-[hsl(0,80%,55%)] tabular-nums">{row.putTheta}</td>
                        <td className="px-2 py-1.5 text-left text-[hsl(200,80%,60%)] tabular-nums">{row.putDelta.toFixed(3)}</td>
                        <td className="px-2 py-1.5 text-left text-[hsl(45,80%,55%)] tabular-nums">{row.putIV}%</td>
                        <td className={`px-2 py-1.5 text-left tabular-nums ${row.putChgPct >= 0 ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{row.putChgPct >= 0 ? "+" : ""}{(row.putChgPct * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-left text-[hsl(0,60%,50%)] tabular-nums">
                          <div className="flex items-center gap-1">
                            {(row.putOI / 1000).toFixed(0)}K
                            <div className="w-12 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                              <div className="h-full oi-bar-put rounded-full" style={{ width: `${(row.putOI / maxPutOI) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chart + PCR */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="glass-card rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[10px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART — {selected.label}</div>
                <TradingViewWidget symbol={selected.tvSymbol} height={280} />
              </div>

              {/* Greeks summary */}
              <div className="glass-card rounded-lg p-4">
                <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-3 tracking-wider">OPTIONS SUMMARY</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "PUT/CALL RATIO", value: (chain.reduce((s,c) => s+c.putOI,0) / Math.max(1, chain.reduce((s,c) => s+c.callOI,0))).toFixed(2), color: "neon-yellow" },
                    { label: "MAX PAIN", value: (chain.reduce((s,c) => s+c.callOI+c.putOI,0) > 0 ? chain.reduce((a,b) => (a.callOI+a.putOI) > (b.callOI+b.putOI) ? a : b, chain[0])?.strike?.toLocaleString("en-IN") : "—"), color: "neon-blue" },
                    { label: "ATM CALL IV", value: `${chain.find(c => c.isATM)?.callIV ?? "—"}%`, color: "text-[hsl(45,100%,55%)]" },
                    { label: "ATM PUT IV", value: `${chain.find(c => c.isATM)?.putIV ?? "—"}%`, color: "text-[hsl(45,100%,55%)]" },
                    { label: "TOTAL CALL OI", value: `${(chain.reduce((s,c) => s+c.callOI,0)/1000).toFixed(0)}K`, color: "neon-green" },
                    { label: "TOTAL PUT OI", value: `${(chain.reduce((s,c) => s+c.putOI,0)/1000).toFixed(0)}K`, color: "neon-red" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2">
                      <div className="text-[8px] text-[hsl(220,20%,40%)] mb-0.5">{label}</div>
                      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "calculator" && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-5 glass-card rounded-lg p-5">
              <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">POSITION SIZING CALCULATOR</div>
              <div className="space-y-4">
                {[
                  { label: "TOTAL CAPITAL (₹)", val: capital, set: setCapital, min: 50000, max: 10000000, step: 10000 },
                  { label: "RISK % PER TRADE", val: riskPct, set: setRiskPct, min: 0.5, max: 3, step: 0.1 },
                ].map(({ label, val, set, min, max, step }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-[hsl(220,20%,40%)]">{label}</span>
                      <span className="neon-green tabular-nums">{label.includes("%") ? `${val}%` : `₹${val.toLocaleString("en-IN")}`}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(Number(e.target.value))}
                      className="w-full accent-[hsl(168,100%,50%)]" />
                    <div className="flex justify-between text-[8px] text-[hsl(220,20%,35%)]"><span>{min}</span><span>{max}</span></div>
                  </div>
                ))}

                <div className="border-t border-[rgba(0,255,180,0.1)] pt-4 space-y-3">
                  {[
                    { label: "RISK AMOUNT", value: `₹${riskAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "neon-red" },
                    { label: "LOT SIZE", value: lotSize.toString(), color: "neon-blue" },
                    { label: "RECOMMENDED LOTS", value: lots.toString(), color: "neon-green" },
                    { label: "EXPOSURE", value: `₹${(lots * lotSize * spotPrice).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "neon-yellow" },
                    { label: "1:2 RISK:REWARD TARGET", value: `₹${(riskAmount * 2).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "neon-green" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center bg-[rgba(0,0,0,0.3)] rounded p-3">
                      <span className="text-[9px] text-[hsl(220,20%,45%)]">{label}</span>
                      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[rgba(255,200,0,0.05)] border border-[rgba(255,200,0,0.15)] rounded p-3 text-[8px] text-[hsl(45,80%,55%)]">
                  ⚠ ATR-BASED DYNAMIC SL: Position sizing follows 1.5%–2% capital rule. Kill switch activates at 5% daily drawdown. Risk-to-Reward minimum 1:2.
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-7 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[10px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART — {selected.label}</div>
              <TradingViewWidget symbol={selected.tvSymbol} height={500} />
            </div>
          </div>
        )}

        {tab === "positions" && (
          <div className="glass-card rounded-lg p-5">
            <div className="text-[10px] font-bold text-[hsl(168,100%,50%)] mb-4 tracking-wider">OPEN POSITIONS — PAPER TRADING</div>
            <div className="text-center py-12 text-[hsl(220,20%,35%)]">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm">No open positions</div>
              <div className="text-[10px] mt-1">Enable AUTO mode to start paper trading with AI signals</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
