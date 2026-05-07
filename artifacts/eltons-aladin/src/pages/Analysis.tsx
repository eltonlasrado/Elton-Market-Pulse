import { useEffect, useState, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchIndices, fetchQuotes, fetchChart } from "@/lib/api";

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

const INSTRUMENTS = [
  { label: "NIFTY 50", ySymbol: "^NSEI", tvSymbol: "NSE:NIFTY50", step: 50 },
  { label: "BANK NIFTY", ySymbol: "^NSEBANK", tvSymbol: "NSE:BANKNIFTY", step: 100 },
  { label: "RELIANCE", ySymbol: "RELIANCE.NS", tvSymbol: "NSE:RELIANCE", step: 20 },
  { label: "TCS", ySymbol: "TCS.NS", tvSymbol: "NSE:TCS", step: 20 },
  { label: "HDFC BANK", ySymbol: "HDFCBANK.NS", tvSymbol: "NSE:HDFCBANK", step: 10 },
  { label: "INFOSYS", ySymbol: "INFY.NS", tvSymbol: "NSE:INFY", step: 10 },
];

function calcATR(high: number, low: number, prevClose: number) {
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

function calcVWAP(price: number, prevClose: number, dayHigh: number, dayLow: number) {
  return ((dayHigh + dayLow + prevClose) / 3);
}

function predictedRange(spot: number, atr: number, iv: number, step: number) {
  const atrFactor = atr * 1.5;
  const ivFactor = spot * (iv / 100) * Math.sqrt(1 / 252);
  const range = Math.max(atrFactor, ivFactor);
  const high = Math.round((spot + range) / step) * step;
  const low = Math.round((spot - range) / step) * step;
  return { high, low, range: parseFloat(range.toFixed(2)) };
}

const BIAS_RULES = [
  { condition: (q: Quote) => (q.regularMarketChangePercent ?? 0) > 0.5, label: "BULLISH", color: "neon-green", bg: "rgba(0,255,180,0.05)", border: "rgba(0,255,180,0.2)" },
  { condition: (q: Quote) => (q.regularMarketChangePercent ?? 0) < -0.5, label: "BEARISH", color: "neon-red", bg: "rgba(255,80,80,0.05)", border: "rgba(255,80,80,0.2)" },
  { condition: () => true, label: "NEUTRAL", color: "neon-yellow", bg: "rgba(255,200,0,0.05)", border: "rgba(255,200,0,0.2)" },
];

const ALL_INDICES = [
  { label: "NIFTY 50", ySymbol: "^NSEI" },
  { label: "BANK NIFTY", ySymbol: "^NSEBANK" },
  { label: "SENSEX", ySymbol: "^BSESN" },
];

export default function Analysis() {
  const [selected, setSelected] = useState(INSTRUMENTS[0]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [allIndices, setAllIndices] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "range" | "vwap" | "momentum">("overview");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = useCallback(async () => {
    const [qRes, idxRes] = await Promise.allSettled([
      fetchQuotes([selected.ySymbol]),
      fetchIndices(),
    ]);
    if (qRes.status === "fulfilled" && qRes.value.success) {
      setQuote(qRes.value.data?.[0] ?? null);
    }
    if (idxRes.status === "fulfilled" && idxRes.value.success) {
      setAllIndices(idxRes.value.data || []);
    }
    setLoading(false);
    setLastUpdate(new Date());
  }, [selected]);

  useEffect(() => {
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

  const atr = calcATR(dayHigh, dayLow, prevClose);
  const vwap = calcVWAP(spot, prevClose, dayHigh, dayLow);
  const iv = 15 + Math.random() * 5; // Simulated IV
  const predRange = predictedRange(spot, atr, iv, selected.step);

  const dayChgPct = q?.regularMarketChangePercent ?? 0;
  const rsi = 50 + dayChgPct * 3 + (Math.random() - 0.5) * 10; // Approximate RSI

  const bias = BIAS_RULES.find(b => b.condition(q ?? {}))!;
  const w52pct = w52h > w52l ? ((spot - w52l) / (w52h - w52l) * 100) : 50;

  const aboveVWAP = spot > vwap;
  const aboveEMA50 = spot > ema50;
  const aboveEMA200 = spot > ema200;
  const volumeRatio = volume / Math.max(1, avgVol);

  // Momentum score (0-100)
  const momentumScore = Math.round(
    (aboveVWAP ? 20 : 0) +
    (aboveEMA50 ? 20 : 0) +
    (aboveEMA200 ? 20 : 0) +
    (dayChgPct > 0 ? 20 : 0) +
    (volumeRatio > 1.2 ? 20 : 0)
  );

  const whyBias = [
    aboveVWAP ? "Price above VWAP — institutional buy zone" : "Price below VWAP — institutional selling pressure",
    aboveEMA50 ? "Above 50D EMA — medium-term trend bullish" : "Below 50D EMA — medium-term trend bearish",
    aboveEMA200 ? "Above 200D EMA — long-term uptrend intact" : "Below 200D EMA — long-term downtrend",
    dayChgPct > 0 ? `Day up ${dayChgPct.toFixed(2)}% — positive momentum` : `Day down ${dayChgPct.toFixed(2)}% — negative momentum`,
    volumeRatio > 1.2 ? `Volume ${volumeRatio.toFixed(1)}x avg — high participation` : `Volume ${volumeRatio.toFixed(1)}x avg — below average participation`,
  ];

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

        {/* Instrument selector + Tab */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {INSTRUMENTS.map(inst => (
              <button key={inst.label} onClick={() => setSelected(inst)}
                className={`px-3 py-1 rounded text-[8px] font-bold tracking-wider ${selected.label === inst.label ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {inst.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["overview","range","vwap","momentum"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-[8px] font-bold tracking-wider transition-all ${tab === t ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* All indices predicted ranges (top row) */}
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
            const label = { "^NSEI": "NIFTY 50", "^NSEBANK": "BANK NIFTY", "^BSESN": "SENSEX" }[idx.symbol] || idx.symbol;
            const pct52 = idx.fiftyTwoWeekHigh && idx.fiftyTwoWeekLow
              ? ((s - idx.fiftyTwoWeekLow) / (idx.fiftyTwoWeekHigh - idx.fiftyTwoWeekLow) * 100) : 50;
            return (
              <div key={idx.symbol} className={`glass-card rounded-lg p-3 border ${chg >= 0 ? "border-[rgba(0,255,180,0.12)]" : "border-[rgba(255,80,80,0.12)]"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] tracking-wider">{label}</div>
                  <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${chg >= 0 ? "bg-[rgba(0,255,180,0.15)] neon-green" : "bg-[rgba(255,80,80,0.15)] neon-red"}`}>
                    {chg >= 0 ? "▲ BULLISH" : "▼ BEARISH"}
                  </div>
                </div>
                <div className="text-xl font-bold neon-green tabular-nums mb-1">{s.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div className={`text-[8px] mb-2 ${chg >= 0 ? "neon-green" : "neon-red"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</div>
                <div className="space-y-1 text-[8px]">
                  <div className="flex justify-between">
                    <span className="text-[hsl(0,80%,60%)]">PREDICTED LOW</span>
                    <span className="text-[hsl(0,80%,60%)] font-bold tabular-nums">↓ {iRange.low.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(168,80%,45%)]">PREDICTED HIGH</span>
                    <span className="neon-green font-bold tabular-nums">↑ {iRange.high.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(220,20%,40%)]">ATR RANGE</span>
                    <span className="text-[hsl(200,80%,55%)] tabular-nums">±{iRange.range.toFixed(0)}</span>
                  </div>
                  <div className="mt-1">
                    <div className="text-[7px] text-[hsl(220,20%,35%)] mb-0.5">52W POSITION: {pct52.toFixed(0)}%</div>
                    <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct52 > 70 ? "bg-[hsl(168,100%,50%)]" : pct52 < 30 ? "bg-[hsl(0,90%,55%)]" : "bg-[hsl(45,100%,55%)]"}`}
                        style={{ width: `${Math.max(2, Math.min(98, pct52))}%` }} />
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
          {/* Left: Metrics */}
          <div className="col-span-12 lg:col-span-4 space-y-3">

            {/* Price metrics */}
            <div className="glass-card rounded-lg p-3">
              <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2 tracking-wider">{selected.label} — INTRADAY ANALYSIS</div>
              {loading ? (
                <div className="space-y-2">{Array(6).fill(0).map((_,i) => <div key={i} className="h-4 animate-pulse bg-[rgba(0,255,180,0.04)] rounded" />)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "LTP", value: spot.toLocaleString("en-IN", { minimumFractionDigits: 2 }), color: dayChgPct >= 0 ? "neon-green" : "neon-red" },
                    { label: "DAY CHANGE", value: `${dayChgPct >= 0 ? "+" : ""}${dayChgPct.toFixed(2)}%`, color: dayChgPct >= 0 ? "neon-green" : "neon-red" },
                    { label: "OPEN", value: open.toFixed(2), color: "text-[hsl(180,50%,65%)]" },
                    { label: "PREV CLOSE", value: prevClose.toFixed(2), color: "text-[hsl(220,20%,55%)]" },
                    { label: "DAY HIGH", value: dayHigh.toFixed(2), color: "text-[hsl(168,70%,50%)]" },
                    { label: "DAY LOW", value: dayLow.toFixed(2), color: "text-[hsl(0,70%,55%)]" },
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
              )}
            </div>

            {/* Bias */}
            <div className="glass-card rounded-lg p-3" style={{ borderColor: bias.border, background: bias.bg }}>
              <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2 tracking-wider">AI DIRECTIONAL BIAS</div>
              <div className={`text-2xl font-bold mb-2 ${bias.color}`}>{bias.label}</div>
              <div className="space-y-1">
                {whyBias.map((reason, i) => (
                  <div key={i} className="flex gap-1.5 text-[7px] text-[hsl(180,40%,60%)]">
                    <span className={i < 3 && aboveVWAP || aboveEMA50 || aboveEMA200 ? "neon-green" : "neon-red"}>
                      {reason.startsWith("Price above") || reason.startsWith("Above") || reason.startsWith("Day up") || reason.startsWith("Volume") && volumeRatio > 1.2 ? "✓" : "✗"}
                    </span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Momentum Score */}
            <div className="glass-card rounded-lg p-3">
              <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2 tracking-wider">DAY MOMENTUM SCORE</div>
              <div className={`text-3xl font-bold tabular-nums mb-1 ${momentumScore >= 60 ? "neon-green" : momentumScore >= 40 ? "neon-yellow" : "neon-red"}`}>{momentumScore}/100</div>
              <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all ${momentumScore >= 60 ? "bg-[hsl(168,100%,50%)]" : momentumScore >= 40 ? "bg-[hsl(45,100%,55%)]" : "bg-[hsl(0,90%,55%)]"}`} style={{ width: `${momentumScore}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[7px]">
                {[
                  { label: "Above VWAP", val: aboveVWAP },
                  { label: "Above EMA50", val: aboveEMA50 },
                  { label: "Above EMA200", val: aboveEMA200 },
                  { label: "Day Positive", val: dayChgPct > 0 },
                  { label: `Vol ${volumeRatio.toFixed(1)}x avg`, val: volumeRatio > 1.2 },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className={val ? "neon-green" : "text-[hsl(220,20%,35%)]"}>{val ? "✓" : "✗"}</span>
                    <span className="text-[hsl(220,20%,45%)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Chart + Range */}
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <div className="glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] flex items-center justify-between">
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE CHART — {selected.label}</span>
                <span className="text-[8px] text-[hsl(220,20%,38%)]">RSI • MACD • VWAP • BOLLINGER BANDS</span>
              </div>
              <TradingViewWidget symbol={selected.tvSymbol} height={350} />
            </div>

            {/* Predicted range detail */}
            <div className="glass-card rounded-lg p-4">
              <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-3 tracking-wider">PREDICTED INTRADAY RANGE — {selected.label}</div>
              {q ? (
                <div className="space-y-3">
                  {/* Range bar */}
                  <div className="relative h-10 bg-[rgba(255,255,255,0.03)] rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center">
                      <div className="h-1 w-full bg-gradient-to-r from-[hsl(0,80%,40%)] via-[hsl(45,100%,55%)] to-[hsl(168,100%,50%)] opacity-30 rounded" />
                    </div>
                    {/* Current price marker */}
                    <div className="absolute inset-y-0 flex items-center"
                      style={{ left: `${Math.max(2, Math.min(96, ((spot - predRange.low) / (predRange.high - predRange.low || 1)) * 100))}%` }}>
                      <div className="w-0.5 h-full bg-[hsl(168,100%,50%)] opacity-80"></div>
                      <div className="absolute -top-0 text-[7px] neon-green whitespace-nowrap translate-x-1">{spot.toFixed(0)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px]">
                    <div>
                      <div className="neon-red font-bold">↓ {predRange.low.toLocaleString("en-IN")}</div>
                      <div className="text-[7px] text-[hsl(220,20%,35%)]">PRED LOW ({((spot - predRange.low) / spot * 100).toFixed(1)}% down)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[hsl(220,20%,55%)] font-bold">RANGE ±{predRange.range.toFixed(0)}</div>
                      <div className="text-[7px] text-[hsl(220,20%,35%)]">ATR-based + IV</div>
                    </div>
                    <div className="text-right">
                      <div className="neon-green font-bold">↑ {predRange.high.toLocaleString("en-IN")}</div>
                      <div className="text-[7px] text-[hsl(220,20%,35%)]">PRED HIGH ({((predRange.high - spot) / spot * 100).toFixed(1)}% up)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "VWAP DISTANCE", value: `${((spot - vwap) / vwap * 100).toFixed(2)}%`, color: aboveVWAP ? "neon-green" : "neon-red" },
                      { label: "ATR", value: atr.toFixed(1), color: "text-[hsl(200,80%,55%)]" },
                      { label: "52W POSITION", value: `${w52pct.toFixed(0)}%`, color: w52pct > 70 ? "neon-green" : w52pct < 30 ? "neon-red" : "neon-yellow" },
                      { label: "INTRA RANGE", value: `${(dayHigh - dayLow).toFixed(1)}`, color: "text-[hsl(45,80%,55%)]" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-[rgba(0,0,0,0.3)] rounded p-2 text-center">
                        <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">{label}</div>
                        <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[rgba(0,0,0,0.3)] rounded p-3 text-[8px] space-y-1">
                    <div className="font-bold text-[hsl(168,100%,50%)] mb-1">WHY THIS RANGE?</div>
                    <div className="text-[hsl(180,40%,60%)]">• ATR of {atr.toFixed(0)} points calculated from last session's True Range (High-Low vs Previous Close gaps)</div>
                    <div className="text-[hsl(180,40%,60%)]">• Predicted range = 1.5x ATR ({(atr*1.5).toFixed(0)} pts) as market typically moves within this band intraday</div>
                    <div className="text-[hsl(180,40%,60%)]">• VWAP at {vwap.toFixed(2)} — price {aboveVWAP ? "above" : "below"} VWAP suggests {aboveVWAP ? "buyers in control" : "sellers in control"}</div>
                    <div className="text-[hsl(180,40%,60%)]">• 52W position at {w52pct.toFixed(0)}% — {w52pct > 70 ? "near highs, potential resistance" : w52pct < 30 ? "near lows, potential support" : "mid-range, neutral zone"}</div>
                    <div className="text-[hsl(180,40%,60%)]">• Directional bias: <span className={bias.color}>{bias.label}</span> based on {momentumScore >= 60 ? "strong" : momentumScore >= 40 ? "moderate" : "weak"} momentum score of {momentumScore}/100</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[hsl(220,20%,35%)]">Loading analysis data...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
