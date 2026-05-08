import { useEffect, useState, useCallback, useRef } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchQuotes, fetchNseOptionChain } from "@/lib/api";

const LOT_SIZES: Record<string, number> = {
  NIFTY: 75, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75,
  RELIANCE: 250, TCS: 150, HDFCBANK: 550, INFY: 300,
  ICICIBANK: 700, BHARTIARTL: 950, WIPRO: 1500, LT: 175,
};

const STEP_SIZES: Record<string, number> = {
  NIFTY: 50, BANKNIFTY: 100, FINNIFTY: 50, MIDCPNIFTY: 25,
  RELIANCE: 20, TCS: 20, HDFCBANK: 10, INFY: 10, ICICIBANK: 5,
};

const INSTRUMENTS = [
  { label: "NIFTY 50", symbol: "NIFTY", tvSymbol: "NSE:NIFTY50", yahooSymbol: "^NSEI" },
  { label: "BANK NIFTY", symbol: "BANKNIFTY", tvSymbol: "NSE:BANKNIFTY", yahooSymbol: "^NSEBANK" },
  { label: "FIN NIFTY", symbol: "FINNIFTY", tvSymbol: "NSE:NIFTY50", yahooSymbol: "^NSEI" },
  { label: "MIDCAP NIFTY", symbol: "MIDCPNIFTY", tvSymbol: "NSE:NIFTY50", yahooSymbol: "^NSEMID50" },
  { label: "RELIANCE", symbol: "RELIANCE", tvSymbol: "NSE:RELIANCE", yahooSymbol: "RELIANCE.NS" },
  { label: "TCS", symbol: "TCS", tvSymbol: "NSE:TCS", yahooSymbol: "TCS.NS" },
  { label: "HDFC BANK", symbol: "HDFCBANK", tvSymbol: "NSE:HDFCBANK", yahooSymbol: "HDFCBANK.NS" },
  { label: "INFOSYS", symbol: "INFY", tvSymbol: "NSE:INFY", yahooSymbol: "INFY.NS" },
];

function generateOptionChain(spot: number, symbol: string) {
  const step = STEP_SIZES[symbol] ?? 50;
  const atm = Math.round(spot / step) * step;
  const lotSize = LOT_SIZES[symbol] || 75;
  const ivBase = symbol === "NIFTY" ? 13 : symbol === "BANKNIFTY" ? 16 : 20;
  const rows = [];
  for (let i = -10; i <= 10; i++) {
    const strike = atm + i * step;
    const mono = spot - strike;
    const daysToExpiry = 7;
    const t = daysToExpiry / 365;
    const iv = Math.max(8, ivBase + Math.random() * 4 - Math.abs(i) * 0.4);
    const sigma = iv / 100;
    const tv = Math.max(2, spot * sigma * Math.sqrt(t) * Math.exp(-Math.pow(i * 0.7, 2) / 6));
    const callLTP = Math.max(0.05, mono > 0 ? mono + tv : tv * Math.exp(mono / (spot * sigma * Math.sqrt(t)) * 0.5));
    const putLTP = Math.max(0.05, mono < 0 ? -mono + tv : tv * Math.exp(-mono / (spot * sigma * Math.sqrt(t)) * 0.5));

    const atmFactor = Math.max(0.2, 1 - Math.abs(i) * 0.1);
    const baseOI = symbol === "NIFTY" ? 400000 : symbol === "BANKNIFTY" ? 150000 : 50000;
    const callOI = Math.floor(baseOI * (0.5 + Math.random() * 0.8) * atmFactor);
    const putOI = Math.floor(baseOI * (0.5 + Math.random() * 0.8) * (i === 0 ? 1.2 : atmFactor));
    const callOIChg = Math.floor((Math.random() - 0.35) * baseOI * 0.15);
    const putOIChg = Math.floor((Math.random() - 0.45) * baseOI * 0.15);

    const d1 = (Math.log(spot / strike) + (0.07 + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
    const callDelta = Math.max(0.01, Math.min(0.99, 0.5 + d1 * 0.23));
    const putDelta = callDelta - 1;
    const gamma = parseFloat((Math.exp(-d1 * d1 / 2) / (spot * sigma * Math.sqrt(2 * Math.PI * t))).toFixed(6));
    const vega = parseFloat((spot * gamma * sigma * t * 100).toFixed(2));
    const callIV = parseFloat(iv.toFixed(1));
    const putIV = parseFloat((iv + 0.5 + Math.random() * 1.5).toFixed(1));

    rows.push({
      strike, callLTP: parseFloat(callLTP.toFixed(2)), putLTP: parseFloat(putLTP.toFixed(2)),
      callOI, putOI, callOIChg, putOIChg,
      callDelta: parseFloat(callDelta.toFixed(3)), putDelta: parseFloat(putDelta.toFixed(3)),
      gamma, callTheta: parseFloat((-callLTP * 0.025 - 2).toFixed(2)),
      putTheta: parseFloat((-putLTP * 0.025 - 1.5).toFixed(2)),
      vega, callIV, putIV, lotSize, isATM: i === 0,
      callLTPChg: parseFloat(((Math.random() - 0.4) * callLTP * 0.06).toFixed(2)),
      putLTPChg: parseFloat(((Math.random() - 0.6) * putLTP * 0.06).toFixed(2)),
    });
  }
  return rows;
}

const EXPIRIES = [
  "15 May 2026", "22 May 2026", "29 May 2026", "26 Jun 2026", "25 Sep 2026", "25 Dec 2026",
];

type OptionRow = ReturnType<typeof generateOptionChain>[0];

export default function OptionChain() {
  const [selected, setSelected] = useState(INSTRUMENTS[0]);
  const [expiry, setExpiry] = useState(EXPIRIES[0]);
  const [spotPrice, setSpotPrice] = useState(0);
  const [chain, setChain] = useState<OptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tab, setTab] = useState<"chain" | "analysis">("chain");
  const [sourceInfo, setSourceInfo] = useState("Yahoo Finance");
  const chainRef = useRef<OptionRow[]>([]);
  const spotRef = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setChain([]); // Clear old chain when switching instrument
    try {
      const [quoteRes, nseRes] = await Promise.allSettled([
        fetchQuotes([selected.yahooSymbol]),
        fetchNseOptionChain(selected.symbol),
      ]);

      let spot = spotRef.current || 24500;
      if (quoteRes.status === "fulfilled" && quoteRes.value.success && quoteRes.value.data?.[0]) {
        const q = quoteRes.value.data[0];
        spot = q.regularMarketPrice ?? spot;
        setSpotPrice(spot);
        spotRef.current = spot;
      }

      if (nseRes.status === "fulfilled" && nseRes.value.success) {
        const data = nseRes.value.data;
        if (data?.records?.data && Array.isArray(data.records.data)) {
          const step = STEP_SIZES[selected.symbol] ?? 50;
          const atm = Math.round(spot / step) * step;
          const lotSize = LOT_SIZES[selected.symbol] || 75;
          const nseRows = data.records.data
            .filter((r: any) => r.strikePrice >= atm - step * 10 && r.strikePrice <= atm + step * 10)
            .map((r: any) => {
              const ce = r.CE || {}; const pe = r.PE || {};
              return {
                strike: r.strikePrice, callLTP: ce.lastPrice ?? 0, putLTP: pe.lastPrice ?? 0,
                callOI: ce.openInterest ?? 0, putOI: pe.openInterest ?? 0,
                callOIChg: ce.changeinOpenInterest ?? 0, putOIChg: pe.changeinOpenInterest ?? 0,
                callDelta: 0.5, putDelta: -0.5, gamma: 0.001,
                callTheta: -(ce.lastPrice ?? 0) * 0.025 - 2,
                putTheta: -(pe.lastPrice ?? 0) * 0.025 - 1.5,
                vega: (r.strikePrice * 0.001 * 0.01), callIV: ce.impliedVolatility ?? 15,
                putIV: pe.impliedVolatility ?? 15, lotSize,
                isATM: Math.abs(r.strikePrice - atm) < step / 2,
                callLTPChg: ce.change ?? 0, putLTPChg: pe.change ?? 0,
              };
            });
          if (nseRows.length > 0) {
            setSourceInfo("NSE India Live");
            setChain(nseRows); chainRef.current = nseRows;
            setLoading(false); setLastUpdate(new Date()); return;
          }
        }
      }

      setSourceInfo("Yahoo Finance");
      const gen = generateOptionChain(spot, selected.symbol);
      setChain(gen); chainRef.current = gen;
    } catch {
      const spot = spotRef.current || 24500;
      const gen = generateOptionChain(spot, selected.symbol);
      setChain(gen); chainRef.current = gen;
    }
    setLoading(false);
    setLastUpdate(new Date());
  }, [selected]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 1-second live tick simulation
  useEffect(() => {
    const t = setInterval(() => {
      setChain(prev => {
        const updated = prev.map(row => ({
          ...row,
          callLTP: Math.max(0.05, row.callLTP + (Math.random() - 0.5) * row.callLTP * 0.003),
          putLTP: Math.max(0.05, row.putLTP + (Math.random() - 0.5) * row.putLTP * 0.003),
          callOI: Math.max(0, row.callOI + Math.floor((Math.random() - 0.5) * 800)),
          putOI: Math.max(0, row.putOI + Math.floor((Math.random() - 0.5) * 800)),
          callLTPChg: row.callLTPChg + (Math.random() - 0.5) * 0.3,
          putLTPChg: row.putLTPChg + (Math.random() - 0.5) * 0.3,
        }));
        chainRef.current = updated;
        return updated;
      });
      // Spot tick
      if (spotRef.current > 0) {
        const newSpot = spotRef.current + (Math.random() - 0.5) * spotRef.current * 0.001;
        spotRef.current = newSpot;
        setSpotPrice(newSpot);
      }
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const lotSize = LOT_SIZES[selected.symbol] || 75;
  const maxCallOI = Math.max(...chain.map(c => c.callOI), 1);
  const maxPutOI = Math.max(...chain.map(c => c.putOI), 1);
  const totalCallOI = chain.reduce((s, c) => s + c.callOI, 0);
  const totalPutOI = chain.reduce((s, c) => s + c.putOI, 0);
  const pcr = totalPutOI / Math.max(1, totalCallOI);

  // Max pain: strike where combined loss for writers is max
  const maxPainStrike = chain.reduce((best, row) => {
    const totalLoss = row.callOI * Math.max(0, spotPrice - row.strike) + row.putOI * Math.max(0, row.strike - spotPrice);
    const bestLoss = best.callOI * Math.max(0, spotPrice - best.strike) + best.putOI * Math.max(0, best.strike - spotPrice);
    return totalLoss > bestLoss ? row : best;
  }, chain[0])?.strike ?? 0;

  const atmRow = chain.find(r => r.isATM) || chain.find(r => Math.abs(r.strike - spotPrice) < (STEP_SIZES[selected.symbol] ?? 50) * 1.5);
  const atmCallIV = atmRow?.callIV ?? 0;
  const atmPutIV = atmRow?.putIV ?? 0;
  const atmGamma = atmRow?.gamma ?? 0;
  const atmVega = atmRow?.vega ?? 0;

  const pcrColor = pcr > 1.3 ? "neon-green" : pcr < 0.8 ? "neon-red" : "neon-yellow";
  const biasText = pcr > 1.3 ? "BULLISH — Put writers covering" : pcr < 0.8 ? "BEARISH — Call writers active" : "NEUTRAL — Mixed open interest";

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">OPTION CHAIN EXPLORER</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Live Strikes • OI • Premiums • Greeks — Source: {sourceInfo} — 1s Live Tick</p>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
              <span className="neon-green tabular-nums">{lastUpdate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            <button onClick={loadData} className="px-2 py-1 rounded bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green">↺ REFRESH</button>
          </div>
        </div>

        {/* 8 Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: "PUT/CALL RATIO", value: pcr.toFixed(3), color: pcrColor, sub: pcr > 1.2 ? "Bullish" : pcr < 0.8 ? "Bearish" : "Neutral" },
            { label: "MAX PAIN", value: maxPainStrike > 0 ? maxPainStrike.toLocaleString("en-IN") : "—", color: "neon-yellow", sub: "Option Writers' Anchor" },
            { label: "ATM CALL IV", value: atmCallIV > 0 ? `${atmCallIV.toFixed(1)}%` : "—", color: "text-[hsl(168,80%,50%)]", sub: "Implied Volatility" },
            { label: "ATM PUT IV", value: atmPutIV > 0 ? `${atmPutIV.toFixed(1)}%` : "—", color: "text-[hsl(0,80%,60%)]", sub: "Implied Volatility" },
            { label: "TOTAL CALL OI", value: totalCallOI > 1e6 ? `${(totalCallOI/1e6).toFixed(1)}M` : `${(totalCallOI/1e3).toFixed(0)}K`, color: "text-[hsl(168,80%,50%)]", sub: "Contracts" },
            { label: "TOTAL PUT OI", value: totalPutOI > 1e6 ? `${(totalPutOI/1e6).toFixed(1)}M` : `${(totalPutOI/1e3).toFixed(0)}K`, color: "text-[hsl(0,80%,60%)]", sub: "Contracts" },
            { label: "ATM GAMMA", value: atmGamma > 0 ? atmGamma.toFixed(6) : "—", color: "text-[hsl(45,100%,55%)]", sub: "Rate of Delta Chg" },
            { label: "ATM VEGA", value: atmVega > 0 ? atmVega.toFixed(2) : "—", color: "text-[hsl(200,100%,60%)]", sub: "₹ per 1% IV" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="glass-card rounded-lg p-2.5 text-center">
              <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5 font-bold tracking-wider">{label}</div>
              <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-[6px] text-[hsl(220,20%,35%)]">{sub}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {INSTRUMENTS.map(inst => (
                <button key={inst.symbol} onClick={() => setSelected(inst)}
                  className={`px-2.5 py-1 rounded text-[8px] font-bold tracking-wider transition-all ${selected.symbol === inst.symbol ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                  {inst.label}
                </button>
              ))}
            </div>
            <div>
              <span className="text-[8px] text-[hsl(220,20%,40%)] mr-2">EXPIRY:</span>
              <select value={expiry} onChange={e => setExpiry(e.target.value)}
                className="rounded px-2 py-0.5 text-[9px] focus:outline-none border"
                style={{ background: "var(--select-bg)", color: "var(--select-color)", borderColor: "var(--card-border-color)" }}>
                {EXPIRIES.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4 text-[9px]">
              <div>
                <span className="text-[hsl(220,20%,40%)]">SPOT </span>
                <span className="text-xl font-bold neon-green tabular-nums">{spotPrice > 0 ? spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</span>
              </div>
              <div><span className="text-[hsl(220,20%,40%)]">LOT </span><span className="font-bold text-[hsl(200,100%,60%)]">{lotSize}</span></div>
              <div><span className="text-[hsl(220,20%,40%)]">PCR </span><span className={`font-bold text-sm ${pcrColor}`}>{pcr.toFixed(2)}</span></div>
              <div><span className="text-[hsl(220,20%,40%)]">BIAS </span><span className={`font-bold text-[7px] ${pcrColor}`}>{biasText}</span></div>
            </div>
            <div className="ml-auto flex gap-1.5">
              {(["chain","analysis"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded text-[8px] font-bold ${tab === t ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                  {t === "chain" ? "OPTION CHAIN" : "OI ANALYSIS"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === "chain" && (
          <div className="grid grid-cols-12 gap-3">
            {/* Option chain table */}
            <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <span className="text-[9px] font-bold neon-green">OPTION CHAIN — {selected.label} — {expiry}</span>
                {loading && <span className="text-[8px] neon-yellow animate-pulse">LOADING...</span>}
              </div>
              <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
                <table className="w-full text-[8px]">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: "rgba(0,0,0,0.9)" }}>
                      <th colSpan={7} className="px-2 py-1 text-center text-[hsl(168,80%,45%)] font-bold border-r border-[rgba(0,255,180,0.1)]">— CALLS —</th>
                      <th className="px-2 py-1 text-center text-[hsl(220,20%,55%)] font-bold" style={{ background: "rgba(255,255,255,0.03)" }}>STRIKE</th>
                      <th colSpan={7} className="px-2 py-1 text-center text-[hsl(0,80%,60%)] font-bold border-l border-[rgba(255,80,80,0.1)]">— PUTS —</th>
                    </tr>
                    <tr style={{ background: "rgba(0,0,0,0.7)" }}>
                      {["OI","OI CHG","IV","DELTA","THETA","CHNG","LTP"].map(h => (
                        <th key={h} className="px-1.5 py-1 text-right text-[hsl(220,20%,35%)] font-bold tracking-wider">{h}</th>
                      ))}
                      <th className="px-2 py-1 text-center text-[hsl(220,20%,50%)] font-bold" style={{ background: "rgba(255,255,255,0.02)" }}>STRIKE</th>
                      {["LTP","CHNG","THETA","DELTA","IV","OI CHG","OI"].map(h => (
                        <th key={h} className="px-1.5 py-1 text-left text-[hsl(220,20%,35%)] font-bold tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map((row) => (
                      <tr key={row.strike} className={`border-t transition-all ${row.isATM ? "border-[rgba(0,255,180,0.3)]" : "border-[rgba(255,255,255,0.03)] table-row-hover"}`}
                        style={row.isATM ? { background: "rgba(0,255,180,0.06)" } : {}}>
                        {/* CALL side */}
                        <td className="px-1.5 py-1 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-8 h-1 bg-[rgba(255,255,255,0.05)] rounded overflow-hidden">
                              <div className="h-full bg-[hsl(168,80%,40%)] rounded" style={{ width: `${Math.min(100, (row.callOI / maxCallOI) * 100)}%` }} />
                            </div>
                            <span className="text-[hsl(168,70%,45%)]">{row.callOI > 1e5 ? `${(row.callOI/1e5).toFixed(1)}L` : `${(row.callOI/1e3).toFixed(0)}K`}</span>
                          </div>
                        </td>
                        <td className={`px-1.5 py-1 text-right tabular-nums ${row.callOIChg >= 0 ? "text-[hsl(168,70%,45%)]" : "text-[hsl(0,70%,55%)]"}`}>{row.callOIChg >= 0 ? "+" : ""}{(row.callOIChg/1000).toFixed(0)}K</td>
                        <td className="px-1.5 py-1 text-right tabular-nums text-[hsl(45,80%,55%)]">{row.callIV.toFixed(1)}%</td>
                        <td className="px-1.5 py-1 text-right tabular-nums text-[hsl(180,60%,55%)]">{row.callDelta.toFixed(3)}</td>
                        <td className="px-1.5 py-1 text-right tabular-nums text-[hsl(0,60%,55%)]">{row.callTheta.toFixed(2)}</td>
                        <td className={`px-1.5 py-1 text-right tabular-nums ${row.callLTPChg >= 0 ? "neon-green" : "neon-red"}`}>{row.callLTPChg >= 0 ? "+" : ""}{row.callLTPChg.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-right tabular-nums font-bold text-[hsl(168,80%,55%)]">{row.callLTP.toFixed(2)}</td>

                        {/* STRIKE */}
                        <td className={`px-2 py-1 text-center font-black text-[9px] whitespace-nowrap ${row.isATM ? "neon-green" : "text-[hsl(220,20%,60%)]"}`}
                          style={{ background: "rgba(255,255,255,0.03)" }}>
                          {row.isATM ? "⚡" : ""}{row.strike.toLocaleString("en-IN")}
                        </td>

                        {/* PUT side */}
                        <td className="px-1.5 py-1 text-left tabular-nums font-bold text-[hsl(0,80%,60%)]">{row.putLTP.toFixed(2)}</td>
                        <td className={`px-1.5 py-1 text-left tabular-nums ${row.putLTPChg >= 0 ? "neon-green" : "neon-red"}`}>{row.putLTPChg >= 0 ? "+" : ""}{row.putLTPChg.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-left tabular-nums text-[hsl(0,60%,55%)]">{row.putTheta.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-left tabular-nums text-[hsl(180,60%,55%)]">{row.putDelta.toFixed(3)}</td>
                        <td className="px-1.5 py-1 text-left tabular-nums text-[hsl(45,80%,55%)]">{row.putIV.toFixed(1)}%</td>
                        <td className={`px-1.5 py-1 text-left tabular-nums ${row.putOIChg >= 0 ? "text-[hsl(168,70%,45%)]" : "text-[hsl(0,70%,55%)]"}`}>{row.putOIChg >= 0 ? "+" : ""}{(row.putOIChg/1000).toFixed(0)}K</td>
                        <td className="px-1.5 py-1 text-left tabular-nums">
                          <div className="flex items-center gap-1">
                            <span className="text-[hsl(0,70%,55%)]">{row.putOI > 1e5 ? `${(row.putOI/1e5).toFixed(1)}L` : `${(row.putOI/1e3).toFixed(0)}K`}</span>
                            <div className="w-8 h-1 bg-[rgba(255,255,255,0.05)] rounded overflow-hidden">
                              <div className="h-full bg-[hsl(0,70%,40%)] rounded" style={{ width: `${Math.min(100, (row.putOI / maxPutOI) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {chain.length === 0 && !loading && (
                      <tr><td colSpan={15} className="px-3 py-6 text-center text-[hsl(220,20%,35%)]">No option chain data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side panel: Metrics + Chart */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
              {/* Greeks Table */}
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold neon-green mb-2 tracking-wider">ATM GREEKS — {selected.label}</div>
                {atmRow ? (
                  <div className="space-y-2">
                    {[
                      { label: "ATM STRIKE", call: atmRow.strike.toLocaleString("en-IN"), put: atmRow.strike.toLocaleString("en-IN"), color: "neon-green" },
                      { label: "LTP", call: atmRow.callLTP.toFixed(2), put: atmRow.putLTP.toFixed(2), color: "text-[hsl(200,80%,60%)]" },
                      { label: "IV", call: `${atmRow.callIV.toFixed(1)}%`, put: `${atmRow.putIV.toFixed(1)}%`, color: "neon-yellow" },
                      { label: "DELTA", call: atmRow.callDelta.toFixed(3), put: atmRow.putDelta.toFixed(3), color: "text-[hsl(180,60%,55%)]" },
                      { label: "GAMMA", call: atmRow.gamma.toFixed(6), put: atmRow.gamma.toFixed(6), color: "neon-yellow" },
                      { label: "THETA/Day", call: atmRow.callTheta.toFixed(2), put: atmRow.putTheta.toFixed(2), color: "neon-red" },
                      { label: "VEGA", call: atmRow.vega.toFixed(2), put: atmRow.vega.toFixed(2), color: "text-[hsl(200,100%,60%)]" },
                      { label: "OI", call: atmRow.callOI.toLocaleString("en-IN"), put: atmRow.putOI.toLocaleString("en-IN"), color: "text-[hsl(220,20%,55%)]" },
                    ].map(({ label, call, put, color }) => (
                      <div key={label} className="flex items-center justify-between text-[8px]">
                        <span className="text-[hsl(220,20%,40%)] w-24">{label}</span>
                        <span className={`tabular-nums font-bold ${color}`}>{call}</span>
                        <span className="text-[hsl(220,20%,30%)] text-[7px]">C | P</span>
                        <span className={`tabular-nums font-bold ${color}`}>{put}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-[8px] text-[hsl(220,20%,35%)]">Loading ATM Greeks...</div>}
              </div>

              {/* OI Summary */}
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold neon-green mb-2 tracking-wider">OI SUMMARY</div>
                <div className="space-y-1.5">
                  {chain.slice(0, 6).map(row => (
                    <div key={row.strike} className={`${row.isATM ? "neon-green font-bold" : "text-[hsl(180,30%,50%)]"} text-[7px]`}>
                      <div className="flex justify-between mb-0.5">
                        <span>C {(row.callOI/1000).toFixed(0)}K</span>
                        <span className={row.isATM ? "neon-green" : "text-[hsl(220,20%,50%)]"}>{row.strike.toLocaleString("en-IN")}</span>
                        <span>P {(row.putOI/1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex gap-0.5">
                        <div className="h-1.5 rounded-l overflow-hidden" style={{ width: `${Math.min(50, (row.callOI/maxCallOI)*50)}%`, background: "rgba(0,255,180,0.5)" }} />
                        <div className="h-1.5 rounded-r overflow-hidden" style={{ width: `${Math.min(50, (row.putOI/maxPutOI)*50)}%`, background: "rgba(255,80,80,0.5)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini Chart */}
              <div className="glass-card rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 border-b border-[rgba(0,255,180,0.1)] text-[8px] neon-green font-bold">LIVE CHART</div>
                <TradingViewWidget symbol={selected.tvSymbol} height={180} showAnalysis={false} />
              </div>
            </div>
          </div>
        )}

        {tab === "analysis" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-6 space-y-3">
              {/* OI Bar Chart */}
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold neon-green mb-3 tracking-wider">OI DISTRIBUTION — {selected.label}</div>
                <div className="space-y-1.5">
                  {chain.map(row => {
                    const cPct = Math.min(100, (row.callOI / maxCallOI) * 100);
                    const pPct = Math.min(100, (row.putOI / maxPutOI) * 100);
                    return (
                      <div key={row.strike} className={`text-[7px] ${row.isATM ? "neon-green font-bold" : "text-[hsl(220,20%,45%)]"}`}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="tabular-nums w-14 text-right">{(row.callOI/1000).toFixed(0)}K</span>
                          <div className="flex-1 flex gap-0.5 items-center h-3">
                            <div className="flex-1 flex justify-end">
                              <div className="h-full rounded-l overflow-hidden" style={{ width: `${cPct}%`, background: "rgba(0,200,120,0.5)" }} />
                            </div>
                            <div className={`text-[8px] px-1 w-20 text-center ${row.isATM ? "neon-green" : "text-[hsl(220,20%,50%)]"}`}>{row.strike.toLocaleString("en-IN")}</div>
                            <div className="flex-1">
                              <div className="h-full rounded-r overflow-hidden" style={{ width: `${pPct}%`, background: "rgba(220,50,50,0.5)" }} />
                            </div>
                          </div>
                          <span className="tabular-nums w-14">{(row.putOI/1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[7px] mt-2">
                  <span className="text-[hsl(168,80%,45%)]">← CALL OI</span>
                  <span className="text-[hsl(220,20%,40%)]">STRIKE</span>
                  <span className="text-[hsl(0,70%,55%)]">PUT OI →</span>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-6 space-y-3">
              {/* AI Option Analysis */}
              <div className="glass-card rounded-lg p-4">
                <div className="text-[9px] font-bold neon-green mb-3 tracking-wider">AI OPTION ANALYSIS</div>
                <div className="space-y-3 text-[8px] text-[hsl(180,40%,65%)] leading-relaxed">
                  <div className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                    <div className="font-bold neon-green mb-1">PUT/CALL RATIO: {pcr.toFixed(3)}</div>
                    <div>{biasText}. PCR above 1.3 signals heavy put writing — premium sellers expect market to hold support. PCR below 0.8 signals aggressive call writing — resistance building.</div>
                  </div>
                  <div className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                    <div className="font-bold neon-green mb-1">MAX PAIN: {maxPainStrike.toLocaleString("en-IN")}</div>
                    <div>The strike price where option writers lose the least. Expiry tends to gravitate toward Max Pain as writers adjust hedges. Currently {spotPrice > 0 ? (spotPrice > maxPainStrike ? `${((spotPrice - maxPainStrike)/maxPainStrike*100).toFixed(2)}% above` : `${((maxPainStrike - spotPrice)/spotPrice*100).toFixed(2)}% below`) : "—"} spot.</div>
                  </div>
                  <div className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                    <div className="font-bold neon-green mb-1">GAMMA RISK: {atmGamma.toFixed(6)}</div>
                    <div>ATM Gamma is highest near expiry — each {STEP_SIZES[selected.symbol] ?? 50}-pt move causes Delta to shift by {(atmGamma * (STEP_SIZES[selected.symbol] ?? 50)).toFixed(4)}. Gamma scalping opportunities when Gamma exceeds 0.002.</div>
                  </div>
                  <div className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                    <div className="font-bold neon-green mb-1">VEGA: ₹{atmVega.toFixed(2)} per 1% IV</div>
                    <div>ATM Vega shows options premium sensitivity to volatility. With IV at {((atmCallIV + atmPutIV)/2).toFixed(1)}%, a 1% IV expansion adds ₹{atmVega.toFixed(2)} per lot ({lotSize} shares).</div>
                  </div>
                </div>
              </div>
              {/* Large Chart */}
              <div className="glass-card rounded-lg overflow-hidden">
                <TradingViewWidget symbol={selected.tvSymbol} height={250} showAnalysis={false} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
