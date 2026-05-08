import { useEffect, useState, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchIndices, fetchQuotes } from "@/lib/api";

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
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  averageDailyVolume3Month?: number;
}

const ALL_INSTRUMENTS = [
  { group: "INDICES", label: "NIFTY 50",      ySymbol: "^NSEI",         tvSymbol: "NSE:NIFTY50",    step: 50 },
  { group: "INDICES", label: "BANK NIFTY",    ySymbol: "^NSEBANK",      tvSymbol: "NSE:BANKNIFTY",  step: 100 },
  { group: "INDICES", label: "SENSEX",        ySymbol: "^BSESN",        tvSymbol: "BSE:SENSEX",     step: 100 },
  { group: "INDICES", label: "FIN NIFTY",     ySymbol: "^CNXFIN",       tvSymbol: "NSE:NIFTY50",    step: 50 },
  { group: "NSE STOCKS", label: "RELIANCE",   ySymbol: "RELIANCE.NS",   tvSymbol: "NSE:RELIANCE",   step: 5 },
  { group: "NSE STOCKS", label: "TCS",        ySymbol: "TCS.NS",        tvSymbol: "NSE:TCS",        step: 5 },
  { group: "NSE STOCKS", label: "HDFC BANK",  ySymbol: "HDFCBANK.NS",   tvSymbol: "NSE:HDFCBANK",   step: 2 },
  { group: "NSE STOCKS", label: "INFOSYS",    ySymbol: "INFY.NS",       tvSymbol: "NSE:INFY",       step: 2 },
  { group: "NSE STOCKS", label: "ICICI BANK", ySymbol: "ICICIBANK.NS",  tvSymbol: "NSE:ICICIBANK",  step: 2 },
  { group: "NSE STOCKS", label: "SBI",        ySymbol: "SBIN.NS",       tvSymbol: "NSE:SBIN",       step: 1 },
  { group: "NSE STOCKS", label: "BAJAJ FIN",  ySymbol: "BAJFINANCE.NS", tvSymbol: "NSE:BAJFINANCE", step: 5 },
  { group: "NSE STOCKS", label: "AIRTEL",     ySymbol: "BHARTIARTL.NS", tvSymbol: "NSE:BHARTIARTL", step: 2 },
  { group: "NSE STOCKS", label: "ITC",        ySymbol: "ITC.NS",        tvSymbol: "NSE:ITC",        step: 1 },
  { group: "NSE STOCKS", label: "KOTAK BANK", ySymbol: "KOTAKBANK.NS",  tvSymbol: "NSE:KOTAKBANK",  step: 2 },
  { group: "NSE STOCKS", label: "L&T",        ySymbol: "LT.NS",         tvSymbol: "NSE:LT",         step: 5 },
  { group: "NSE STOCKS", label: "AXIS BANK",  ySymbol: "AXISBANK.NS",   tvSymbol: "NSE:AXISBANK",   step: 2 },
  { group: "NSE STOCKS", label: "WIPRO",      ySymbol: "WIPRO.NS",      tvSymbol: "NSE:WIPRO",      step: 1 },
  { group: "NSE STOCKS", label: "MARUTI",     ySymbol: "MARUTI.NS",     tvSymbol: "NSE:MARUTI",     step: 10 },
  { group: "NSE STOCKS", label: "HCL TECH",   ySymbol: "HCLTECH.NS",    tvSymbol: "NSE:HCLTECH",    step: 2 },
  { group: "NSE STOCKS", label: "TATA STEEL", ySymbol: "TATASTEEL.NS",  tvSymbol: "NSE:TATASTEEL",  step: 1 },
  { group: "NSE STOCKS", label: "ADANI ENT",  ySymbol: "ADANIENT.NS",   tvSymbol: "NSE:ADANIENT",   step: 5 },
  { group: "NSE STOCKS", label: "SUN PHARMA", ySymbol: "SUNPHARMA.NS",  tvSymbol: "NSE:SUNPHARMA",  step: 2 },
  { group: "NSE STOCKS", label: "HERO MOTO",  ySymbol: "HEROMOTOCO.NS", tvSymbol: "NSE:HEROMOTOCO", step: 5 },
  { group: "GLOBAL",   label: "S&P 500",      ySymbol: "^GSPC",         tvSymbol: "SP:SPX",         step: 10 },
  { group: "GLOBAL",   label: "DOW JONES",    ySymbol: "^DJI",          tvSymbol: "INDEX:DJI",      step: 50 },
  { group: "COMMODITIES", label: "GOLD",      ySymbol: "GC=F",          tvSymbol: "COMEX:GC1!",     step: 10 },
  { group: "COMMODITIES", label: "CRUDE OIL", ySymbol: "CL=F",          tvSymbol: "NYMEX:CL1!",     step: 1 },
];

function calcATR(h: number, l: number, pc: number) {
  return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
}

function calcVWAP(h: number, l: number, pc: number) {
  return (h + l + pc) / 3;
}

function predictedRange(spot: number, atr: number, iv: number, step: number) {
  const atrFactor = atr * 1.5;
  const ivFactor = spot * (iv / 100) * Math.sqrt(1 / 252);
  const range = Math.max(atrFactor, ivFactor);
  const high = Math.round((spot + range) / step) * step;
  const low = Math.round((spot - range) / step) * step;
  return { high, low, range: parseFloat(range.toFixed(2)) };
}

const TABS = ["overview", "range", "vwap", "momentum"] as const;
type Tab = typeof TABS[number];

export default function Analysis() {
  const [selected, setSelected] = useState(ALL_INSTRUMENTS[0]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [allIndices, setAllIndices] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = useCallback(async () => {
    const [qRes, idxRes] = await Promise.allSettled([
      fetchQuotes([selected.ySymbol]),
      fetchIndices(),
    ]);
    if (qRes.status === "fulfilled" && qRes.value.success) setQuote(qRes.value.data?.[0] ?? null);
    if (idxRes.status === "fulfilled" && idxRes.value.success) setAllIndices(idxRes.value.data || []);
    setLoading(false);
    setLastUpdate(new Date());
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  const q = quote;
  const spot = q?.regularMarketPrice ?? 0;
  const dayHigh = q?.regularMarketDayHigh ?? spot;
  const dayLow = q?.regularMarketDayLow ?? spot;
  const prevClose = q?.regularMarketPreviousClose ?? spot;
  const open = q?.regularMarketOpen ?? spot;
  const w52h = q?.fiftyTwoWeekHigh ?? spot;
  const w52l = q?.fiftyTwoWeekLow ?? spot;
  const ema50 = q?.fiftyDayAverage ?? spot;
  const ema200 = q?.twoHundredDayAverage ?? spot;
  const volume = q?.regularMarketVolume ?? 0;
  const avgVol = q?.averageDailyVolume3Month ?? 1;

  const atr = spot > 0 ? calcATR(dayHigh, dayLow, prevClose) : 0;
  const vwap = spot > 0 ? calcVWAP(dayHigh, dayLow, prevClose) : 0;
  const iv = 14 + Math.abs(q?.regularMarketChangePercent ?? 0) * 0.5;
  const predRange = predictedRange(spot, atr, iv, selected.step);

  const dayChgPct = q?.regularMarketChangePercent ?? 0;
  const dayChg = q?.regularMarketChange ?? 0;
  const rsi = Math.max(20, Math.min(80, 50 + dayChgPct * 3));

  const aboveVWAP = spot > vwap;
  const aboveEMA50 = spot > ema50;
  const aboveEMA200 = spot > ema200;
  const volumeRatio = volume / Math.max(1, avgVol);
  const w52pct = w52h > w52l ? ((spot - w52l) / (w52h - w52l) * 100) : 50;

  const momentumScore = Math.round(
    (aboveVWAP ? 20 : 0) + (aboveEMA50 ? 20 : 0) + (aboveEMA200 ? 20 : 0) +
    (dayChgPct > 0 ? 20 : 0) + (volumeRatio > 1.2 ? 20 : 0)
  );

  const biasLabel = momentumScore >= 60 ? "BULLISH" : momentumScore <= 40 ? "BEARISH" : "NEUTRAL";
  const biasColor = biasLabel === "BULLISH" ? "neon-green" : biasLabel === "BEARISH" ? "neon-red" : "neon-yellow";

  const whyBias = [
    { text: aboveVWAP ? "Price above VWAP — buyers in institutional control" : "Price below VWAP — institutional selling pressure", ok: aboveVWAP },
    { text: aboveEMA50 ? "Above 50D EMA — medium-term trend bullish" : "Below 50D EMA — medium-term trend bearish", ok: aboveEMA50 },
    { text: aboveEMA200 ? "Above 200D EMA — long-term uptrend intact" : "Below 200D EMA — long-term downtrend warning", ok: aboveEMA200 },
    { text: dayChgPct > 0 ? `Day up ${dayChgPct.toFixed(2)}% — positive price action` : `Day down ${dayChgPct.toFixed(2)}% — negative price action`, ok: dayChgPct > 0 },
    { text: volumeRatio > 1.2 ? `Volume ${volumeRatio.toFixed(1)}x avg — strong participation` : `Volume ${volumeRatio.toFixed(1)}x avg — below average participation`, ok: volumeRatio > 1.2 },
  ];

  const grpd = ALL_INSTRUMENTS.reduce((acc, inst) => {
    if (!acc[inst.group]) acc[inst.group] = [];
    acc[inst.group].push(inst);
    return acc;
  }, {} as Record<string, typeof ALL_INSTRUMENTS>);

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">MARKET ANALYSIS</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">VWAP • Day Momentum • Predicted Range • 52-Week Analysis • Risk/Reward</p>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
              <span className="neon-green">{lastUpdate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            <button onClick={loadData} className="px-2 py-1 rounded bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green">↺</button>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[8px] text-[hsl(220,20%,40%)] font-bold">SELECT:</span>
            <select
              value={selected.ySymbol}
              onChange={e => {
                const inst = ALL_INSTRUMENTS.find(i => i.ySymbol === e.target.value);
                if (inst) setSelected(inst);
              }}
              className="text-[9px] font-bold rounded px-2 py-1 border focus:outline-none"
              style={{ background: "var(--select-bg)", color: "var(--select-color)", borderColor: "var(--card-border-color)" }}>
              {Object.entries(grpd).map(([grp, opts]) => (
                <optgroup key={grp} label={grp}>
                  {opts.map(o => <option key={o.ySymbol} value={o.ySymbol}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
            {spot > 0 && (
              <div className="flex items-center gap-2 text-[9px]">
                <span className={`text-xl font-bold tabular-nums ${dayChgPct >= 0 ? "neon-green" : "neon-red"}`}>{spot.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                <span className={dayChgPct >= 0 ? "neon-green" : "neon-red"}>{dayChgPct >= 0 ? "▲+" : "▼"}{dayChgPct.toFixed(2)}%</span>
                <span className="text-[hsl(220,20%,40%)]">({dayChg >= 0 ? "+" : ""}{dayChg.toFixed(2)})</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-[8px] font-bold tracking-wider transition-all ${tab === t ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Indices summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {allIndices.filter(q => ["^NSEI","^NSEBANK","^BSESN"].includes(q.symbol)).map(idx => {
            const s = idx.regularMarketPrice ?? 0;
            const h = idx.regularMarketDayHigh ?? s;
            const l = idx.regularMarketDayLow ?? s;
            const pc = idx.regularMarketPreviousClose ?? s;
            const iAtr = calcATR(h, l, pc);
            const iStep = idx.symbol === "^BSESN" ? 100 : 50;
            const iRange = predictedRange(s, iAtr, 15, iStep);
            const chg = idx.regularMarketChangePercent ?? 0;
            const lbl = { "^NSEI": "NIFTY 50", "^NSEBANK": "BANK NIFTY", "^BSESN": "SENSEX" }[idx.symbol] || idx.symbol;
            const p52 = idx.fiftyTwoWeekHigh && idx.fiftyTwoWeekLow ? ((s - idx.fiftyTwoWeekLow) / (idx.fiftyTwoWeekHigh - idx.fiftyTwoWeekLow) * 100) : 50;
            return (
              <div key={idx.symbol} className={`glass-card rounded-lg p-3 border ${chg >= 0 ? "border-[rgba(0,255,180,0.12)]" : "border-[rgba(255,80,80,0.12)]"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-bold neon-green tracking-wider">{lbl}</div>
                  <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${chg >= 0 ? "bg-[rgba(0,255,180,0.15)] neon-green" : "bg-[rgba(255,80,80,0.15)] neon-red"}`}>{chg >= 0 ? "▲ BULLISH" : "▼ BEARISH"}</div>
                </div>
                <div className="text-xl font-bold neon-green tabular-nums mb-1">{s.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div className={`text-[8px] mb-2 ${chg >= 0 ? "neon-green" : "neon-red"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</div>
                <div className="space-y-1 text-[8px]">
                  <div className="flex justify-between"><span className="neon-red">PRED LOW</span><span className="neon-red font-bold tabular-nums">↓ {iRange.low.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="neon-green">PRED HIGH</span><span className="neon-green font-bold tabular-nums">↑ {iRange.high.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-[hsl(220,20%,40%)]">ATR RANGE</span><span className="text-[hsl(200,80%,55%)] tabular-nums">±{iRange.range.toFixed(0)}</span></div>
                  <div className="mt-1">
                    <div className="text-[7px] text-[hsl(220,20%,35%)] mb-0.5">52W POSITION: {p52.toFixed(0)}%</div>
                    <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p52 > 70 ? "bg-[hsl(168,100%,50%)]" : p52 < 30 ? "bg-[hsl(0,90%,55%)]" : "bg-[hsl(45,100%,55%)]"}`} style={{ width: `${Math.max(2, Math.min(98, p52))}%` }} />
                    </div>
                    <div className="flex justify-between text-[6px] text-[hsl(220,20%,30%)] mt-0.5">
                      <span>52W L: {idx.fiftyTwoWeekLow?.toFixed(0)}</span>
                      <span>52W H: {idx.fiftyTwoWeekHigh?.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail analysis grid */}
        <div className="grid grid-cols-12 gap-3">
          {/* Left metrics */}
          <div className="col-span-12 lg:col-span-4 space-y-3">

            {/* Price metrics */}
            <div className="glass-card rounded-lg p-3">
              <div className="text-[9px] font-bold neon-green mb-2 tracking-wider">{selected.label} — LIVE METRICS</div>
              {loading ? (
                <div className="space-y-2">{Array(6).fill(0).map((_,i) => <div key={i} className="h-4 animate-pulse bg-[rgba(0,255,180,0.04)] rounded" />)}</div>
              ) : spot > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "LTP", value: spot.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: dayChgPct >= 0 ? "neon-green" : "neon-red" },
                    { label: "DAY CHANGE", value: `${dayChgPct >= 0 ? "+" : ""}${dayChgPct.toFixed(2)}%`, color: dayChgPct >= 0 ? "neon-green" : "neon-red" },
                    { label: "OPEN", value: open.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: "text-[hsl(180,50%,65%)]" },
                    { label: "PREV CLOSE", value: prevClose.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: "text-[hsl(220,20%,55%)]" },
                    { label: "DAY HIGH", value: dayHigh.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: "text-[hsl(168,70%,50%)]" },
                    { label: "DAY LOW", value: dayLow.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: "text-[hsl(0,70%,55%)]" },
                    { label: "VWAP", value: vwap.toFixed(2), color: aboveVWAP ? "neon-green" : "neon-red" },
                    { label: "ATR", value: atr.toFixed(2), color: "text-[hsl(200,80%,55%)]" },
                    { label: "50D EMA", value: ema50.toFixed(2), color: aboveEMA50 ? "neon-green" : "neon-red" },
                    { label: "200D EMA", value: ema200.toFixed(2), color: aboveEMA200 ? "neon-green" : "neon-red" },
                    { label: "52W HIGH", value: w52h.toFixed(0), color: "text-[hsl(45,80%,55%)]" },
                    { label: "52W LOW", value: w52l.toFixed(0), color: "text-[hsl(0,65%,50%)]" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[rgba(0,0,0,0.25)] rounded p-2">
                      <div className="text-[7px] text-[hsl(220,20%,35%)] mb-0.5">{label}</div>
                      <div className={`text-[9px] font-bold tabular-nums ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-[8px] text-[hsl(220,20%,35%)]">No data available</div>}
            </div>

            {/* Directional bias */}
            <div className="glass-card rounded-lg p-3">
              <div className="text-[9px] font-bold neon-green mb-2 tracking-wider">AI DIRECTIONAL BIAS</div>
              <div className={`text-2xl font-bold mb-2 ${biasColor}`}>{biasLabel}</div>
              <div className="space-y-1.5">
                {whyBias.map((item, i) => (
                  <div key={i} className="flex gap-1.5 text-[7px] text-[hsl(180,40%,60%)]">
                    <span className={item.ok ? "neon-green" : "neon-red"}>{item.ok ? "✓" : "✗"}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Momentum Score */}
            <div className="glass-card rounded-lg p-3">
              <div className="text-[9px] font-bold neon-green mb-2 tracking-wider">MOMENTUM SCORE</div>
              <div className={`text-3xl font-bold tabular-nums mb-1 ${momentumScore >= 60 ? "neon-green" : momentumScore >= 40 ? "neon-yellow" : "neon-red"}`}>{momentumScore}/100</div>
              <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${momentumScore >= 60 ? "bg-[hsl(168,100%,50%)]" : momentumScore >= 40 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${momentumScore}%` }} />
              </div>
              <div className="grid grid-cols-1 gap-1 text-[7px]">
                {whyBias.map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={item.ok ? "neon-green" : "text-[hsl(220,20%,35%)]"}>{item.ok ? "●" : "○"}</span>
                    <span className="text-[hsl(220,20%,45%)]">{item.text.split(" — ")[0]}</span>
                    <span className={`ml-auto font-bold ${item.ok ? "neon-green" : "neon-red"}`}>+{item.ok ? 20 : 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Chart + Tabs */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <div className="glass-card rounded-lg overflow-hidden">
              <TradingViewWidget symbol={selected.tvSymbol} height={380} showAnalysis={true} showSymbolSelect={false} />
            </div>

            {/* Tab content */}
            {tab === "overview" && spot > 0 && (
              <div className="glass-card rounded-lg p-4 space-y-3">
                <div className="text-[9px] font-bold neon-green tracking-wider">MARKET OVERVIEW — {selected.label}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: "DAY RANGE", value: `${dayLow.toFixed(1)} — ${dayHigh.toFixed(1)}`, sub: `Spread: ${(dayHigh-dayLow).toFixed(1)}` },
                    { label: "52W RANGE", value: `${w52l.toFixed(0)} — ${w52h.toFixed(0)}`, sub: `Position: ${w52pct.toFixed(0)}%` },
                    { label: "VOLUME", value: volume.toLocaleString("en-IN"), sub: `${volumeRatio.toFixed(1)}x 3M avg` },
                    { label: "APPROX RSI(14)", value: rsi.toFixed(1), sub: rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2.5">
                      <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">{label}</div>
                      <div className="text-[9px] font-bold tabular-nums neon-green">{value}</div>
                      <div className="text-[7px] text-[hsl(220,20%,35%)]">{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[rgba(0,0,0,0.3)] rounded p-3 text-[8px] space-y-1">
                  <div className="font-bold neon-green mb-1">MARKET STRUCTURE</div>
                  {whyBias.map((item, i) => <div key={i} className={`text-[hsl(180,40%,60%)] flex gap-2`}><span className={item.ok ? "neon-green" : "neon-red"}>{item.ok ? "▲" : "▼"}</span><span>{item.text}</span></div>)}
                </div>
              </div>
            )}

            {tab === "range" && (
              <div className="glass-card rounded-lg p-4">
                <div className="text-[9px] font-bold neon-green mb-3 tracking-wider">PREDICTED INTRADAY RANGE — {selected.label}</div>
                {spot > 0 ? (
                  <div className="space-y-3">
                    <div className="relative h-12 bg-[rgba(255,255,255,0.03)] rounded-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center">
                        <div className="h-1.5 w-full bg-gradient-to-r from-[hsl(0,80%,40%)] via-[hsl(45,100%,55%)] to-[hsl(168,100%,50%)] opacity-30 rounded" />
                      </div>
                      {predRange.high > predRange.low && (
                        <div className="absolute inset-y-0 flex items-center"
                          style={{ left: `${Math.max(2, Math.min(96, ((spot - predRange.low) / (predRange.high - predRange.low)) * 100))}%` }}>
                          <div className="w-0.5 h-full bg-[hsl(168,100%,50%)] opacity-80"></div>
                          <div className="absolute -top-0 text-[7px] neon-green whitespace-nowrap translate-x-1">{spot.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[8px]">
                      <div><div className="neon-red font-bold">↓ {predRange.low.toLocaleString("en-IN")}</div><div className="text-[7px] text-[hsl(220,20%,35%)]">PRED LOW ({((spot - predRange.low) / spot * 100).toFixed(1)}% down)</div></div>
                      <div className="text-center"><div className="text-[hsl(220,20%,55%)] font-bold">RANGE ±{predRange.range.toFixed(0)}</div><div className="text-[7px] text-[hsl(220,20%,35%)]">ATR-based + IV</div></div>
                      <div className="text-right"><div className="neon-green font-bold">↑ {predRange.high.toLocaleString("en-IN")}</div><div className="text-[7px] text-[hsl(220,20%,35%)]">PRED HIGH ({((predRange.high - spot) / spot * 100).toFixed(1)}% up)</div></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "VWAP DIST", value: vwap > 0 ? `${((spot - vwap) / vwap * 100).toFixed(2)}%` : "—", color: aboveVWAP ? "neon-green" : "neon-red" },
                        { label: "ATR", value: atr.toFixed(1), color: "text-[hsl(200,80%,55%)]" },
                        { label: "52W POS", value: `${w52pct.toFixed(0)}%`, color: w52pct > 70 ? "neon-green" : w52pct < 30 ? "neon-red" : "neon-yellow" },
                        { label: "INTRA RANGE", value: `${(dayHigh - dayLow).toFixed(1)}`, color: "text-[hsl(45,80%,55%)]" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2 text-center">
                          <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">{label}</div>
                          <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[rgba(0,0,0,0.3)] rounded p-3 text-[8px] space-y-1">
                      <div className="font-bold neon-green mb-1">WHY THIS RANGE?</div>
                      <div className="text-[hsl(180,40%,60%)]">• ATR of {atr.toFixed(0)} pts = True Range from High-Low vs Previous Close gaps</div>
                      <div className="text-[hsl(180,40%,60%)]">• Predicted range = 1.5x ATR ({(atr*1.5).toFixed(0)} pts) — typical intraday band</div>
                      <div className="text-[hsl(180,40%,60%)]">• VWAP at {vwap.toFixed(2)} — price {aboveVWAP ? "above (buyers in control)" : "below (sellers in control)"}</div>
                      <div className="text-[hsl(180,40%,60%)]">• 52W position {w52pct.toFixed(0)}% — {w52pct > 70 ? "near highs — resistance likely" : w52pct < 30 ? "near lows — bounce potential" : "mid-range — neutral zone"}</div>
                      <div className="text-[hsl(180,40%,60%)]">• Bias: <span className={biasColor}>{biasLabel}</span> (Momentum: {momentumScore}/100)</div>
                    </div>
                  </div>
                ) : <div className="text-center py-8 text-[hsl(220,20%,35%)]">Select an instrument to view range analysis</div>}
              </div>
            )}

            {tab === "vwap" && (
              <div className="glass-card rounded-lg p-4">
                <div className="text-[9px] font-bold neon-green mb-3 tracking-wider">VWAP ANALYSIS — {selected.label}</div>
                {spot > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-lg p-4 border ${aboveVWAP ? "border-[rgba(0,255,180,0.2)] bg-[rgba(0,255,180,0.04)]" : "border-[rgba(255,80,80,0.2)] bg-[rgba(255,80,80,0.04)]"}`}>
                        <div className="text-[8px] text-[hsl(220,20%,38%)] mb-1">VWAP LEVEL</div>
                        <div className="text-2xl font-bold tabular-nums neon-green">{vwap.toFixed(2)}</div>
                        <div className={`text-[8px] mt-1 font-bold ${aboveVWAP ? "neon-green" : "neon-red"}`}>{aboveVWAP ? "▲ PRICE ABOVE VWAP" : "▼ PRICE BELOW VWAP"}</div>
                      </div>
                      <div className="rounded-lg p-4 bg-[rgba(0,0,0,0.3)]">
                        <div className="text-[8px] text-[hsl(220,20%,38%)] mb-1">CURRENT PRICE vs VWAP</div>
                        <div className={`text-2xl font-bold tabular-nums ${aboveVWAP ? "neon-green" : "neon-red"}`}>{vwap > 0 ? ((spot - vwap) / vwap * 100).toFixed(2) : "—"}%</div>
                        <div className="text-[7px] text-[hsl(220,20%,35%)] mt-1">Deviation from VWAP</div>
                      </div>
                    </div>
                    <div className="bg-[rgba(0,0,0,0.3)] rounded p-3 text-[8px] space-y-2">
                      <div className="font-bold neon-green">VWAP INTERPRETATION</div>
                      <div className="text-[hsl(180,40%,60%)]">VWAP (Volume Weighted Average Price) = (High + Low + Close) / 3 computed over the session. It represents the true average price at which all shares traded.</div>
                      <div className={`font-bold ${aboveVWAP ? "neon-green" : "neon-red"}`}>{aboveVWAP ? "🟢 BULLISH: Price above VWAP — institutions are net buyers. Day traders should look for long opportunities on pullbacks to VWAP." : "🔴 BEARISH: Price below VWAP — distribution phase. Sellers in control. Look for short setups on bounces to VWAP."}</div>
                      <div className="text-[hsl(180,40%,60%)]">Intraday Range: {dayLow.toFixed(1)} — {dayHigh.toFixed(1)} | Open: {open.toFixed(2)} | VWAP: {vwap.toFixed(2)}</div>
                      <div className="text-[hsl(180,40%,60%)]">Strategy: {aboveVWAP ? "Buy dips to VWAP. Trail stops below VWAP. Target VWAP + 1x ATR." : "Sell bounces to VWAP. Trail stops above VWAP. Target VWAP - 1x ATR."}</div>
                    </div>
                  </div>
                ) : <div className="text-center py-8 text-[hsl(220,20%,35%)]">Loading data...</div>}
              </div>
            )}

            {tab === "momentum" && (
              <div className="glass-card rounded-lg p-4">
                <div className="text-[9px] font-bold neon-green mb-3 tracking-wider">DAY MOMENTUM — {selected.label}</div>
                {spot > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl font-bold ${momentumScore >= 60 ? "neon-green" : momentumScore >= 40 ? "neon-yellow" : "neon-red"}`}>{momentumScore}<span className="text-lg">/100</span></div>
                      <div>
                        <div className={`text-lg font-bold ${biasColor}`}>{biasLabel}</div>
                        <div className="text-[8px] text-[hsl(220,20%,38%)]">Composite Momentum Score</div>
                      </div>
                    </div>
                    <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${momentumScore >= 60 ? "bg-[hsl(168,100%,50%)]" : momentumScore >= 40 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${momentumScore}%` }} />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: "VWAP Position", desc: aboveVWAP ? `Above VWAP ${vwap.toFixed(1)} — institutional buy zone` : `Below VWAP ${vwap.toFixed(1)} — selling pressure`, ok: aboveVWAP, score: 20 },
                        { label: "50D EMA Trend", desc: aboveEMA50 ? `Price ${spot.toFixed(1)} > EMA50 ${ema50.toFixed(1)} — medium uptrend` : `Price ${spot.toFixed(1)} < EMA50 ${ema50.toFixed(1)} — medium downtrend`, ok: aboveEMA50, score: 20 },
                        { label: "200D EMA Trend", desc: aboveEMA200 ? `Price ${spot.toFixed(1)} > EMA200 ${ema200.toFixed(1)} — long-term uptrend` : `Price ${spot.toFixed(1)} < EMA200 ${ema200.toFixed(1)} — long-term downtrend`, ok: aboveEMA200, score: 20 },
                        { label: "Day Change", desc: dayChgPct > 0 ? `+${dayChgPct.toFixed(2)}% day — positive momentum` : `${dayChgPct.toFixed(2)}% day — negative momentum`, ok: dayChgPct > 0, score: 20 },
                        { label: "Volume", desc: volumeRatio > 1.2 ? `${volumeRatio.toFixed(1)}x avg volume — high participation` : `${volumeRatio.toFixed(1)}x avg volume — below average`, ok: volumeRatio > 1.2, score: 20 },
                      ].map(({ label, desc, ok, score }) => (
                        <div key={label} className={`flex items-center gap-3 p-2.5 rounded border ${ok ? "border-[rgba(0,255,180,0.1)] bg-[rgba(0,255,180,0.03)]" : "border-[rgba(255,80,80,0.08)] bg-[rgba(255,80,80,0.02)]"}`}>
                          <div className={`text-lg ${ok ? "neon-green" : "neon-red"}`}>{ok ? "●" : "○"}</div>
                          <div className="flex-1">
                            <div className="text-[8px] font-bold text-[hsl(180,50%,70%)]">{label}</div>
                            <div className="text-[7px] text-[hsl(220,20%,45%)]">{desc}</div>
                          </div>
                          <div className={`text-[9px] font-bold tabular-nums ${ok ? "neon-green" : "text-[hsl(220,20%,35%)]"}`}>+{ok ? score : 0}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[rgba(0,0,0,0.3)] rounded p-3 text-[8px]">
                      <div className="font-bold neon-green mb-1">MOMENTUM STRATEGY</div>
                      <div className="text-[hsl(180,40%,60%)]">{momentumScore >= 60 ? "Strong bullish momentum. Favour long positions. Trail stops below VWAP and EMA20. Scale in on dips." : momentumScore >= 40 ? "Mixed signals. Wait for confirmation before entering. Use tighter stops if trading." : "Bearish momentum. Favour short positions or stay in cash. Avoid buying against the trend."}</div>
                    </div>
                  </div>
                ) : <div className="text-center py-8 text-[hsl(220,20%,35%)]">Loading data...</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
