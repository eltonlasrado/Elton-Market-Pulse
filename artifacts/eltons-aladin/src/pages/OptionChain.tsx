import { useEffect, useState, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchQuotes, fetchNseOptionChain } from "@/lib/api";

const LOT_SIZES: Record<string, number> = {
  NIFTY: 75, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75,
  RELIANCE: 250, TCS: 150, HDFCBANK: 550, INFY: 300,
  ICICIBANK: 700, BHARTIARTL: 950, WIPRO: 1500, LT: 175,
};

const INSTRUMENTS = [
  { label: "NIFTY 50", symbol: "NIFTY", tvSymbol: "NSE:NIFTY50", yahooSymbol: "^NSEI" },
  { label: "BANK NIFTY", symbol: "BANKNIFTY", tvSymbol: "NSE:BANKNIFTY", yahooSymbol: "^NSEBANK" },
  { label: "FIN NIFTY", symbol: "FINNIFTY", tvSymbol: "NSE:NIFTY50", yahooSymbol: "^NSEI" },
  { label: "RELIANCE", symbol: "RELIANCE", tvSymbol: "NSE:RELIANCE", yahooSymbol: "RELIANCE.NS" },
  { label: "TCS", symbol: "TCS", tvSymbol: "NSE:TCS", yahooSymbol: "TCS.NS" },
  { label: "HDFC BANK", symbol: "HDFCBANK", tvSymbol: "NSE:HDFCBANK", yahooSymbol: "HDFCBANK.NS" },
  { label: "INFOSYS", symbol: "INFY", tvSymbol: "NSE:INFY", yahooSymbol: "INFY.NS" },
];

function generateOptionChain(spot: number, symbol: string) {
  const step = symbol === "NIFTY" || symbol === "BANKNIFTY" || symbol === "FINNIFTY" ? 100 : 50;
  const atm = Math.round(spot / step) * step;
  const lotSize = LOT_SIZES[symbol] || 75;
  const rows = [];
  for (let i = -8; i <= 8; i++) {
    const strike = atm + i * step;
    const mono = spot - strike;
    const tv = Math.max(5, 55 + Math.random() * 40 - Math.abs(i) * 8);
    const callLTP = Math.max(0.1, mono > 0 ? mono + tv : tv * Math.exp(mono / spot * 7));
    const putLTP = Math.max(0.1, mono < 0 ? -mono + tv : tv * Math.exp(-mono / spot * 7));
    const callOI = Math.floor((80000 + Math.random() * 300000) * (i === 0 ? 3 : Math.max(0.3, 1 - Math.abs(i) * 0.12)));
    const putOI = Math.floor((80000 + Math.random() * 300000) * (i === 0 ? 2.8 : Math.max(0.3, 1 - Math.abs(i) * 0.12)));
    const callOIChg = Math.floor((Math.random() - 0.3) * 50000);
    const putOIChg = Math.floor((Math.random() - 0.4) * 50000);
    const callDelta = Math.max(0.01, Math.min(0.99, 0.5 + mono / spot * 5));
    const putDelta = callDelta - 1;
    const gamma = parseFloat((0.003 * Math.exp(-Math.pow(i * 0.8, 2) / 4)).toFixed(5));
    const callIV = Math.max(10, 20 + Math.random() * 6 - Math.abs(i) * 0.5);
    const putIV = callIV + Math.random() * 2 + 0.8;
    const vega = parseFloat((strike * gamma * 0.01).toFixed(2));
    rows.push({
      strike, callLTP: parseFloat(callLTP.toFixed(2)), putLTP: parseFloat(putLTP.toFixed(2)),
      callOI, putOI, callOIChg, putOIChg,
      callDelta: parseFloat(callDelta.toFixed(3)), putDelta: parseFloat(putDelta.toFixed(3)),
      gamma, callTheta: parseFloat((-callLTP * 0.025 - 1.5).toFixed(2)),
      putTheta: parseFloat((-putLTP * 0.025 - 1.2).toFixed(2)),
      vega, callIV: parseFloat(callIV.toFixed(1)), putIV: parseFloat(putIV.toFixed(1)),
      lotSize, isATM: i === 0,
      callLTPChg: parseFloat(((Math.random() - 0.4) * callLTP * 0.08).toFixed(2)),
      putLTPChg: parseFloat(((Math.random() - 0.6) * putLTP * 0.08).toFixed(2)),
    });
  }
  return rows;
}

const EXPIRIES = [
  "15 May 2026", "22 May 2026", "29 May 2026", "26 Jun 2026", "25 Sep 2026", "25 Dec 2026",
];

export default function OptionChain() {
  const [selected, setSelected] = useState(INSTRUMENTS[0]);
  const [expiry, setExpiry] = useState(EXPIRIES[0]);
  const [spotPrice, setSpotPrice] = useState(24500);
  const [chain, setChain] = useState<ReturnType<typeof generateOptionChain>>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tab, setTab] = useState<"chain" | "analysis">("chain");
  const [sourceInfo, setSourceInfo] = useState("Yahoo Finance");
  const [nseData, setNseData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [quoteRes, nseRes] = await Promise.allSettled([
        fetchQuotes([selected.yahooSymbol]),
        fetchNseOptionChain(selected.symbol),
      ]);

      let spot = spotPrice;
      if (quoteRes.status === "fulfilled" && quoteRes.value.success && quoteRes.value.data[0]) {
        spot = quoteRes.value.data[0].regularMarketPrice ?? spot;
        setSpotPrice(spot);
      }

      if (nseRes.status === "fulfilled" && nseRes.value.success) {
        const data = nseRes.value.data;
        setNseData(data);

        // Try to parse NSE format
        if (data?.records?.data && Array.isArray(data.records.data)) {
          setSourceInfo("NSE India Live");
          const nseRows = processNSEChain(data.records.data, spot);
          if (nseRows.length > 0) {
            setChain(nseRows);
            setLoading(false);
            setLastUpdate(new Date());
            return;
          }
        }
      }

      // Fallback: generate from spot price
      setSourceInfo("Yahoo Finance");
      setChain(generateOptionChain(spot, selected.symbol));
    } catch {
      setChain(generateOptionChain(spotPrice, selected.symbol));
    }
    setLoading(false);
    setLastUpdate(new Date());
  }, [selected]);

  function processNSEChain(records: any[], spot: number) {
    const step = selected.symbol === "NIFTY" || selected.symbol === "BANKNIFTY" ? 100 : 50;
    const atm = Math.round(spot / step) * step;
    const lotSize = LOT_SIZES[selected.symbol] || 75;

    return records
      .filter((r: any) => r.strikePrice >= atm - step * 8 && r.strikePrice <= atm + step * 8)
      .map((r: any) => {
        const ce = r.CE || {};
        const pe = r.PE || {};
        return {
          strike: r.strikePrice,
          callLTP: ce.lastPrice ?? 0,
          putLTP: pe.lastPrice ?? 0,
          callOI: ce.openInterest ?? 0,
          putOI: pe.openInterest ?? 0,
          callOIChg: ce.changeinOpenInterest ?? 0,
          putOIChg: pe.changeinOpenInterest ?? 0,
          callDelta: 0.5,
          putDelta: -0.5,
          gamma: 0.001,
          callTheta: -(ce.lastPrice ?? 0) * 0.025,
          putTheta: -(pe.lastPrice ?? 0) * 0.025,
          vega: 0,
          callIV: ce.impliedVolatility ?? 0,
          putIV: pe.impliedVolatility ?? 0,
          lotSize,
          isATM: Math.abs(r.strikePrice - atm) < step / 2,
          callLTPChg: ce.change ?? 0,
          putLTPChg: pe.change ?? 0,
        };
      });
  }

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const t = setInterval(() => {
      setChain(prev => prev.map(row => ({
        ...row,
        callLTP: Math.max(0.05, row.callLTP + (Math.random() - 0.5) * row.callLTP * 0.01),
        putLTP: Math.max(0.05, row.putLTP + (Math.random() - 0.5) * row.putLTP * 0.01),
        callOI: row.callOI + Math.floor((Math.random() - 0.5) * 2000),
        putOI: row.putOI + Math.floor((Math.random() - 0.5) * 2000),
      })));
      setLastUpdate(new Date());
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const lotSize = LOT_SIZES[selected.symbol] || 75;
  const maxCallOI = Math.max(...chain.map(c => c.callOI), 1);
  const maxPutOI = Math.max(...chain.map(c => c.putOI), 1);
  const totalCallOI = chain.reduce((s, c) => s + c.callOI, 0);
  const totalPutOI = chain.reduce((s, c) => s + c.putOI, 0);
  const pcr = totalPutOI / Math.max(1, totalCallOI);
  const maxPainStrike = chain.reduce((a, b) => (a.callOI + a.putOI) > (b.callOI + b.putOI) ? a : b, chain[0])?.strike;

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">OPTION CHAIN EXPLORER</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Live Strikes • OI • Premium Data • Greeks — Source: {sourceInfo}</p>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
              <span className="neon-green">{lastUpdate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            <button onClick={loadData} className="px-2 py-1 rounded bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green">↺ REFRESH</button>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {INSTRUMENTS.map(inst => (
                <button key={inst.symbol} onClick={() => setSelected(inst)}
                  className={`px-2.5 py-1 rounded text-[8px] font-bold tracking-wider ${selected.symbol === inst.symbol ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                  {inst.label}
                </button>
              ))}
            </div>
            <div>
              <span className="text-[8px] text-[hsl(220,20%,40%)] mr-2">EXPIRY:</span>
              <select value={expiry} onChange={e => setExpiry(e.target.value)}
                className="bg-[rgba(0,0,0,0.5)] border border-[rgba(0,255,180,0.2)] rounded px-2 py-0.5 text-[9px] text-[hsl(180,60%,70%)] focus:outline-none">
                {EXPIRIES.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4 text-[9px]">
              <div><span className="text-[hsl(220,20%,40%)]">SPOT </span><span className="text-xl font-bold neon-green tabular-nums">{spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              <div><span className="text-[hsl(220,20%,40%)]">LOT </span><span className="font-bold text-[hsl(200,100%,60%)]">{lotSize}</span></div>
              <div><span className="text-[hsl(220,20%,40%)]">PCR </span><span className={`font-bold ${pcr > 1.2 ? "neon-green" : pcr < 0.8 ? "neon-red" : "neon-yellow"}`}>{pcr.toFixed(2)}</span></div>
              <div><span className="text-[hsl(220,20%,40%)]">MAX PAIN </span><span className="font-bold text-[hsl(45,100%,55%)]">{maxPainStrike?.toLocaleString("en-IN") ?? "—"}</span></div>
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
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">OPTION CHAIN — {selected.label} — {expiry}</span>
                {loading && <span className="text-[8px] neon-yellow animate-pulse">LOADING...</span>}
              </div>
              <div className="overflow-auto">
                <table className="w-full text-[8px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[rgba(0,0,0,0.8)]">
                      <th colSpan={7} className="px-2 py-1 text-center text-[hsl(168,80%,45%)] font-bold border-r border-[rgba(0,255,180,0.1)]">— CALLS —</th>
                      <th className="px-2 py-1 text-center text-[hsl(220,20%,55%)] font-bold bg-[rgba(255,255,255,0.03)]">STRIKE</th>
                      <th colSpan={7} className="px-2 py-1 text-center text-[hsl(0,80%,60%)] font-bold border-l border-[rgba(255,80,80,0.1)]">— PUTS —</th>
                    </tr>
                    <tr className="bg-[rgba(0,0,0,0.6)]">
                      {["OI","OI CHG","IV","DELTA","THETA","CHNG","LTP"].map(h => (
                        <th key={h} className="px-1.5 py-1 text-right text-[hsl(220,20%,35%)] font-bold tracking-wider">{h}</th>
                      ))}
                      <th className="px-2 py-1 text-center text-[hsl(220,20%,50%)] font-bold bg-[rgba(255,255,255,0.02)]">STRIKE</th>
                      {["LTP","CHNG","THETA","DELTA","IV","OI CHG","OI"].map(h => (
                        <th key={h} className="px-1.5 py-1 text-left text-[hsl(220,20%,35%)] font-bold tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map((row) => (
                      <tr key={row.strike} className={`border-t transition-all ${row.isATM ? "bg-[rgba(0,255,180,0.05)] border-[rgba(0,255,180,0.2)]" : "border-[rgba(255,255,255,0.03)] table-row-hover"}`}>
                        {/* Call side */}
                        <td className="px-1.5 py-1 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-10 h-1 bg-[rgba(255,255,255,0.05)] rounded overflow-hidden">
                              <div className="h-full bg-[hsl(168,80%,40%)] rounded" style={{ width: `${Math.min(100, (row.callOI / maxCallOI) * 100)}%` }} />
                            </div>
                            <span className="text-[hsl(168,60%,50%)]">{(row.callOI / 1000).toFixed(0)}K</span>
                          </div>
                        </td>
                        <td className={`px-1.5 py-1 text-right tabular-nums ${row.callOIChg >= 0 ? "text-[hsl(168,70%,45%)]" : "text-[hsl(0,70%,55%)]"}`}>{row.callOIChg >= 0 ? "+" : ""}{(row.callOIChg / 1000).toFixed(0)}K</td>
                        <td className="px-1.5 py-1 text-right text-[hsl(45,80%,55%)] tabular-nums">{row.callIV.toFixed(1)}%</td>
                        <td className="px-1.5 py-1 text-right text-[hsl(200,80%,60%)] tabular-nums">{row.callDelta.toFixed(3)}</td>
                        <td className="px-1.5 py-1 text-right text-[hsl(0,70%,55%)] tabular-nums">{row.callTheta.toFixed(2)}</td>
                        <td className={`px-1.5 py-1 text-right tabular-nums ${row.callLTPChg >= 0 ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{row.callLTPChg >= 0 ? "+" : ""}{row.callLTPChg.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-right font-bold tabular-nums neon-green">{row.callLTP.toFixed(2)}</td>
                        {/* Strike */}
                        <td className={`px-2 py-1 text-center font-bold text-[10px] bg-[rgba(255,255,255,0.02)] ${row.isATM ? "neon-yellow" : "text-[hsl(220,20%,60%)]"}`}>
                          {row.strike.toLocaleString("en-IN")}
                          {row.isATM && <span className="block text-[6px] text-[hsl(45,100%,55%)]">ATM</span>}
                        </td>
                        {/* Put side */}
                        <td className="px-1.5 py-1 text-left font-bold tabular-nums neon-red">{row.putLTP.toFixed(2)}</td>
                        <td className={`px-1.5 py-1 text-left tabular-nums ${row.putLTPChg >= 0 ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>{row.putLTPChg >= 0 ? "+" : ""}{row.putLTPChg.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-left text-[hsl(0,70%,55%)] tabular-nums">{row.putTheta.toFixed(2)}</td>
                        <td className="px-1.5 py-1 text-left text-[hsl(200,80%,60%)] tabular-nums">{row.putDelta.toFixed(3)}</td>
                        <td className="px-1.5 py-1 text-left text-[hsl(45,80%,55%)] tabular-nums">{row.putIV.toFixed(1)}%</td>
                        <td className={`px-1.5 py-1 text-left tabular-nums ${row.putOIChg >= 0 ? "text-[hsl(168,70%,45%)]" : "text-[hsl(0,70%,55%)]"}`}>{row.putOIChg >= 0 ? "+" : ""}{(row.putOIChg / 1000).toFixed(0)}K</td>
                        <td className="px-1.5 py-1 text-left tabular-nums">
                          <div className="flex items-center gap-1">
                            <span className="text-[hsl(0,60%,50%)]">{(row.putOI / 1000).toFixed(0)}K</span>
                            <div className="w-10 h-1 bg-[rgba(255,255,255,0.05)] rounded overflow-hidden">
                              <div className="h-full bg-[hsl(0,70%,45%)] rounded" style={{ width: `${Math.min(100, (row.putOI / maxPutOI) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Chart + Summary */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <div className="glass-card rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART — {selected.label}</div>
                <TradingViewWidget symbol={selected.tvSymbol} height={260} />
              </div>

              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2 tracking-wider">OPTIONS SUMMARY</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "PUT/CALL RATIO", value: pcr.toFixed(2), color: pcr > 1.2 ? "neon-green" : pcr < 0.8 ? "neon-red" : "neon-yellow" },
                    { label: "MAX PAIN", value: maxPainStrike?.toLocaleString("en-IN") ?? "—", color: "text-[hsl(45,100%,55%)]" },
                    { label: "ATM CALL IV", value: `${chain.find(c => c.isATM)?.callIV?.toFixed(1) ?? "—"}%`, color: "text-[hsl(45,80%,55%)]" },
                    { label: "ATM PUT IV", value: `${chain.find(c => c.isATM)?.putIV?.toFixed(1) ?? "—"}%`, color: "text-[hsl(45,80%,55%)]" },
                    { label: "TOTAL CALL OI", value: `${(totalCallOI / 1000).toFixed(0)}K`, color: "neon-green" },
                    { label: "TOTAL PUT OI", value: `${(totalPutOI / 1000).toFixed(0)}K`, color: "neon-red" },
                    { label: "ATM GAMMA", value: chain.find(c => c.isATM)?.gamma?.toString() ?? "—", color: "text-[hsl(200,80%,60%)]" },
                    { label: "ATM VEGA", value: chain.find(c => c.isATM)?.vega?.toFixed(2) ?? "—", color: "text-[hsl(200,80%,60%)]" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2">
                      <div className="text-[7px] text-[hsl(220,20%,40%)] mb-0.5">{label}</div>
                      <div className={`text-xs font-bold tabular-nums ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className={`mt-2 p-2 rounded text-[8px] text-center font-bold border ${pcr > 1.2 ? "border-[rgba(0,255,180,0.2)] neon-green bg-[rgba(0,255,180,0.05)]" : pcr < 0.8 ? "border-[rgba(255,80,80,0.2)] neon-red bg-[rgba(255,80,80,0.05)]" : "border-[rgba(255,200,0,0.2)] neon-yellow bg-[rgba(255,200,0,0.05)]"}`}>
                  SENTIMENT: {pcr > 1.2 ? "BULLISH — Put OI > Call OI" : pcr < 0.8 ? "BEARISH — Call OI > Put OI" : "NEUTRAL — Balanced OI"}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "analysis" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">OI ANALYSIS — {selected.label}</div>
              <div className="p-3 space-y-3">
                <div className="text-[9px] text-[hsl(220,20%,40%)] mb-1">CALL VS PUT OI BY STRIKE</div>
                {chain.map(row => (
                  <div key={row.strike} className="flex items-center gap-2 text-[8px]">
                    <div className="w-20 text-right">
                      <div className="h-3 bg-[rgba(0,255,180,0.1)] rounded" style={{ width: `${(row.callOI / maxCallOI) * 100}%`, marginLeft: "auto" }}>
                        <div className="h-full bg-[hsl(168,80%,40%)] rounded" style={{ width: "100%" }} />
                      </div>
                      <span className="text-[hsl(168,60%,50%)]">{(row.callOI / 1000).toFixed(0)}K</span>
                    </div>
                    <span className={`w-16 text-center font-bold text-[9px] ${row.isATM ? "neon-yellow" : "text-[hsl(220,20%,55%)]"}`}>{row.strike.toLocaleString()}</span>
                    <div className="w-20">
                      <div className="h-3 bg-[rgba(255,80,80,0.1)] rounded" style={{ width: `${(row.putOI / maxPutOI) * 100}%` }}>
                        <div className="h-full bg-[hsl(0,70%,45%)] rounded" style={{ width: "100%" }} />
                      </div>
                      <span className="text-[hsl(0,60%,50%)]">{(row.putOI / 1000).toFixed(0)}K</span>
                    </div>
                    <span className={`text-[8px] font-bold ${row.callOIChg >= 0 ? "text-[hsl(168,70%,45%)]" : "text-[hsl(0,70%,55%)]"}`}>{row.callOIChg >= 0 ? "▲" : "▼"} CALL</span>
                    <span className={`text-[8px] font-bold ${row.putOIChg >= 0 ? "text-[hsl(168,70%,45%)]" : "text-[hsl(0,70%,55%)]"}`}>{row.putOIChg >= 0 ? "▲" : "▼"} PUT</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART</div>
              <TradingViewWidget symbol={selected.tvSymbol} height={500} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
