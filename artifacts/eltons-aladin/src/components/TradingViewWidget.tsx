import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries } from "lightweight-charts";
import { calcEMA, calcRSI, calcMACD, calcBB, calcVWAP, analyzeSignal, Candle } from "@/lib/indicators";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  symbol?: string;
  height?: number;
  showAnalysis?: boolean;
  showSymbolSelect?: boolean;
}

interface SymbolOption { label: string; yahoo: string; }
const SYMBOL_GROUPS: Record<string, SymbolOption[]> = {
  "INDICES": [
    { label: "NIFTY 50", yahoo: "^NSEI" },
    { label: "BANK NIFTY", yahoo: "^NSEBANK" },
    { label: "SENSEX", yahoo: "^BSESN" },
    { label: "FIN NIFTY", yahoo: "^CNXFIN" },
    { label: "MIDCAP 50", yahoo: "^NSEMID50" },
  ],
  "NSE STOCKS": [
    { label: "RELIANCE", yahoo: "RELIANCE.NS" },
    { label: "TCS", yahoo: "TCS.NS" },
    { label: "HDFC BANK", yahoo: "HDFCBANK.NS" },
    { label: "INFOSYS", yahoo: "INFY.NS" },
    { label: "ICICI BANK", yahoo: "ICICIBANK.NS" },
    { label: "SBI", yahoo: "SBIN.NS" },
    { label: "BAJAJ FINANCE", yahoo: "BAJFINANCE.NS" },
    { label: "BHARTI AIRTEL", yahoo: "BHARTIARTL.NS" },
    { label: "ITC", yahoo: "ITC.NS" },
    { label: "KOTAK BANK", yahoo: "KOTAKBANK.NS" },
    { label: "L&T", yahoo: "LT.NS" },
    { label: "AXIS BANK", yahoo: "AXISBANK.NS" },
    { label: "WIPRO", yahoo: "WIPRO.NS" },
    { label: "MARUTI", yahoo: "MARUTI.NS" },
    { label: "HCL TECH", yahoo: "HCLTECH.NS" },
    { label: "ASIAN PAINT", yahoo: "ASIANPAINT.NS" },
    { label: "TATA MOTORS", yahoo: "TATAMOTORS.NS" },
    { label: "SUN PHARMA", yahoo: "SUNPHARMA.NS" },
    { label: "ONGC", yahoo: "ONGC.NS" },
    { label: "NTPC", yahoo: "NTPC.NS" },
    { label: "TATA STEEL", yahoo: "TATASTEEL.NS" },
    { label: "ADANI ENT", yahoo: "ADANIENT.NS" },
    { label: "BAJAJ FINSERV", yahoo: "BAJAJFINSV.NS" },
    { label: "NESTLE", yahoo: "NESTLEIND.NS" },
    { label: "TITAN", yahoo: "TITAN.NS" },
    { label: "COAL INDIA", yahoo: "COALINDIA.NS" },
    { label: "HINDUNILVR", yahoo: "HINDUNILVR.NS" },
    { label: "DR REDDY", yahoo: "DRREDDY.NS" },
    { label: "JSW STEEL", yahoo: "JSWSTEEL.NS" },
    { label: "POWER GRID", yahoo: "POWERGRID.NS" },
    { label: "HERO MOTO", yahoo: "HEROMOTOCO.NS" },
    { label: "CIPLA", yahoo: "CIPLA.NS" },
    { label: "DIVIS LAB", yahoo: "DIVISLAB.NS" },
    { label: "GRASIM", yahoo: "GRASIM.NS" },
    { label: "UPL", yahoo: "UPL.NS" },
  ],
  "GLOBAL": [
    { label: "S&P 500", yahoo: "^GSPC" },
    { label: "DOW JONES", yahoo: "^DJI" },
    { label: "NASDAQ", yahoo: "^IXIC" },
    { label: "NIKKEI 225", yahoo: "^N225" },
  ],
  "COMMODITIES": [
    { label: "GOLD", yahoo: "GC=F" },
    { label: "CRUDE OIL", yahoo: "CL=F" },
    { label: "SILVER", yahoo: "SI=F" },
    { label: "NATURAL GAS", yahoo: "NG=F" },
  ],
  "FOREX": [
    { label: "USD/INR", yahoo: "USDINR=X" },
    { label: "EUR/INR", yahoo: "EURINR=X" },
    { label: "GBP/INR", yahoo: "GBPINR=X" },
  ],
};

const SYMBOL_MAP: Record<string, string> = {
  "NSE:NIFTY50": "^NSEI",
  "NSE:BANKNIFTY": "^NSEBANK",
  "BSE:SENSEX": "^BSESN",
  "SP:SPX": "^GSPC",
  "COMEX:GC1!": "GC=F",
  "NYMEX:CL1!": "CL=F",
  "NSE:RELIANCE": "RELIANCE.NS",
  "NSE:TCS": "TCS.NS",
  "NSE:HDFCBANK": "HDFCBANK.NS",
  "NSE:INFY": "INFY.NS",
  "NSE:BAJFINANCE": "BAJFINANCE.NS",
};

interface Interval { label: string; yf: string; range: string; }
const INTERVALS: Interval[] = [
  { label: "15M", yf: "15m", range: "5d" },
  { label: "30M", yf: "30m", range: "5d" },
  { label: "1H",  yf: "1h",  range: "1mo" },
  { label: "1D",  yf: "1d",  range: "6mo" },
  { label: "1W",  yf: "1wk", range: "2y" },
];

type IndicatorKey = "ema20" | "ema50" | "vwap" | "bb";
const IND_DEFAULTS: Record<IndicatorKey, boolean> = {
  ema20: true, ema50: true, vwap: true, bb: false,
};

function getLabelForYahoo(yahoo: string) {
  for (const opts of Object.values(SYMBOL_GROUPS)) {
    const found = opts.find(o => o.yahoo === yahoo);
    if (found) return found.label;
  }
  return yahoo.replace(".NS","").replace("^","");
}

export default function TradingViewWidget({ symbol = "NSE:NIFTY50", height = 420, showAnalysis = false, showSymbolSelect = false }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [yahooSym, setYahooSym] = useState<string>(() => SYMBOL_MAP[symbol] || symbol);
  const [interval, setInterval] = useState<Interval>(INTERVALS[2]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChg, setPriceChg] = useState<number>(0);
  const [indicators, setIndicators] = useState<Record<IndicatorKey, boolean>>(IND_DEFAULTS);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysisData, setAnalysisData] = useState<ReturnType<typeof analyzeSignal> | null>(null);
  const [snap, setSnap] = useState<any>(null);

  const toggleInd = (k: IndicatorKey) => setIndicators(prev => ({ ...prev, [k]: !prev[k] }));

  const buildChart = useCallback((chartData: Candle[]) => {
    if (!chartRef.current || !chartData.length) return;
    chartRef.current.innerHTML = "";
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "rgba(180,220,255,0.7)" : "rgba(30,50,80,0.7)",
        fontFamily: "'Share Tech Mono','Courier New',monospace",
        fontSize: 9,
      },
      grid: {
        vertLines: { color: isDark ? "rgba(0,255,180,0.04)" : "rgba(0,0,0,0.05)" },
        horzLines: { color: isDark ? "rgba(0,255,180,0.04)" : "rgba(0,0,0,0.05)" },
      },
      crosshair: {
        vertLine: { color: isDark ? "rgba(0,255,180,0.5)" : "rgba(59,130,246,0.5)", style: 1 },
        horzLine: { color: isDark ? "rgba(0,255,180,0.5)" : "rgba(59,130,246,0.5)", style: 1 },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(0,255,180,0.08)" : "rgba(0,0,0,0.08)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(0,255,180,0.08)" : "rgba(0,0,0,0.08)",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (t: number) => {
          const d = new Date(t * 1000);
          if (interval.yf === "1d" || interval.yf === "1wk") return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          return d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: isDark ? "hsl(168,100%,50%)" : "hsl(160,70%,40%)",
      downColor: isDark ? "hsl(0,80%,55%)" : "hsl(0,75%,50%)",
      borderUpColor: isDark ? "hsl(168,100%,50%)" : "hsl(160,70%,40%)",
      borderDownColor: isDark ? "hsl(0,80%,55%)" : "hsl(0,75%,50%)",
      wickUpColor: isDark ? "rgba(0,255,180,0.7)" : "rgba(22,163,74,0.8)",
      wickDownColor: isDark ? "rgba(255,80,80,0.7)" : "rgba(220,38,38,0.8)",
    });
    candleSeries.setData(chartData);

    const closes = chartData.map(c => c.close);
    const times  = chartData.map(c => ({ time: c.time as any }));

    const ema20vals = calcEMA(closes, 20);
    const ema50vals = calcEMA(closes, 50);
    const vwapVals  = calcVWAP(chartData);
    const bb        = calcBB(closes);

    if (indicators.ema20) {
      const s = chart.addSeries(LineSeries, { color: "rgba(59,130,246,0.8)", lineWidth: 1, title: "EMA20", crosshairMarkerVisible: false });
      s.setData(times.map((t, i) => ({ ...t, value: ema20vals[i] })));
    }
    if (indicators.ema50) {
      const s = chart.addSeries(LineSeries, { color: "rgba(234,179,8,0.8)", lineWidth: 1, title: "EMA50", crosshairMarkerVisible: false });
      s.setData(times.map((t, i) => ({ ...t, value: ema50vals[i] })));
    }
    if (indicators.vwap) {
      const s = chart.addSeries(LineSeries, { color: "rgba(168,85,247,0.9)", lineWidth: 1, lineStyle: 1, title: "VWAP", crosshairMarkerVisible: false });
      s.setData(times.map((t, i) => ({ ...t, value: vwapVals[i] })));
    }
    if (indicators.bb) {
      const su = chart.addSeries(LineSeries, { color: isDark ? "rgba(0,255,180,0.3)" : "rgba(59,130,246,0.3)", lineWidth: 1, lineStyle: 2, title: "BB Upper", crosshairMarkerVisible: false });
      const sm = chart.addSeries(LineSeries, { color: isDark ? "rgba(0,255,180,0.2)" : "rgba(59,130,246,0.2)", lineWidth: 1, lineStyle: 2, title: "BB Mid", crosshairMarkerVisible: false });
      const sl = chart.addSeries(LineSeries, { color: isDark ? "rgba(0,255,180,0.3)" : "rgba(59,130,246,0.3)", lineWidth: 1, lineStyle: 2, title: "BB Lower", crosshairMarkerVisible: false });
      su.setData(times.map((t, i) => ({ ...t, value: bb.upper[i] })));
      sm.setData(times.map((t, i) => ({ ...t, value: bb.middle[i] })));
      sl.setData(times.map((t, i) => ({ ...t, value: bb.lower[i] })));
    }

    chart.timeScale().fitContent();

    if (showAnalysis && closes.length >= 27) {
      const last = chartData[chartData.length - 1];
      const rsiVals  = calcRSI(closes);
      const macdVals = calcMACD(closes);
      const n = closes.length - 1;
      const snapshot = {
        rsi: rsiVals[n], macd: macdVals.macd[n], macdSignal: macdVals.signal[n],
        macdHist: macdVals.hist[n], bbUpper: bb.upper[n], bbLower: bb.lower[n],
        bbMiddle: bb.middle[n], vwap: vwapVals[n], ema20: ema20vals[n],
        ema50: ema50vals[n], ema200: calcEMA(closes, 200)[n],
        currentPrice: last.close, priceChgPct: chartData.length > 1 ? ((last.close - chartData[0].open) / chartData[0].open) * 100 : 0,
      };
      setSnap(snapshot);
      setAnalysisData(analyzeSignal(snapshot));
    }

    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    });
    ro.observe(chartRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, [interval, indicators, showAnalysis]);

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE}/api/market/chart/${encodeURIComponent(yahooSym)}?interval=${interval.yf}&range=${interval.range}`);
      const json = await res.json();
      if (!json.success || !json.data?.length) throw new Error("no data");
      const data: Candle[] = json.data;
      setCandles(data);
      const last = data[data.length - 1];
      const first = data[0];
      setLastPrice(last.close);
      setPriceChg(first ? ((last.close - first.open) / first.open * 100) : 0);
      setLoading(false);
      setTimeout(() => buildChart(data), 0);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [yahooSym, interval, buildChart]);

  useEffect(() => {
    loadChart();
    const t = globalThis.setInterval(loadChart, 60000);
    return () => globalThis.clearInterval(t);
  }, [loadChart]);

  useEffect(() => {
    if (candles.length) buildChart(candles);
  }, [indicators]);

  useEffect(() => {
    setYahooSym(SYMBOL_MAP[symbol] || symbol);
  }, [symbol]);

  const displayLabel = getLabelForYahoo(yahooSym);
  const up = priceChg >= 0;

  const signalColor = !analysisData ? "" : analysisData.signal.includes("BUY") ? "neon-green" : analysisData.signal.includes("SELL") ? "neon-red" : "neon-yellow";

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 px-2 py-1.5 border-b" style={{ borderColor: "var(--card-border-color)", background: "rgba(0,0,0,0.25)" }}>
        {/* Symbol selector */}
        {showSymbolSelect ? (
          <select
            value={yahooSym}
            onChange={e => setYahooSym(e.target.value)}
            className="text-[8px] rounded px-1.5 py-0.5 border font-bold focus:outline-none max-w-[140px]"
            style={{ background: "var(--select-bg)", color: "var(--select-color)", borderColor: "var(--card-border-color)" }}>
            {Object.entries(SYMBOL_GROUPS).map(([grp, opts]) => (
              <optgroup key={grp} label={grp}>
                {opts.map(o => <option key={o.yahoo} value={o.yahoo}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        ) : (
          <span className="text-[9px] font-bold neon-green">{displayLabel}</span>
        )}
        {lastPrice && (
          <span className={`text-sm font-bold tabular-nums ${up ? "neon-green" : "neon-red"}`}>
            {lastPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        )}
        {lastPrice && (
          <span className={`text-[8px] tabular-nums ${up ? "neon-green" : "neon-red"}`}>
            {up ? "▲" : "▼"} {Math.abs(priceChg).toFixed(2)}%
          </span>
        )}

        <div className="flex items-center gap-0.5 ml-1">
          {INTERVALS.map(iv => (
            <button key={iv.label} onClick={() => setInterval(iv)}
              className={`px-1.5 py-0.5 rounded text-[7px] font-bold transition-all ${interval.label === iv.label ? "neon-green bg-[rgba(0,255,180,0.15)]" : "text-[hsl(220,20%,40%)] hover:text-[hsl(180,60%,70%)]"}`}>
              {iv.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 ml-2 border-l pl-2" style={{ borderColor: "var(--card-border-color)" }}>
          <span className="text-[7px] text-[hsl(220,20%,38%)]">IND:</span>
          {(Object.keys(indicators) as IndicatorKey[]).map(k => (
            <button key={k} onClick={() => toggleInd(k)}
              className={`px-1.5 py-0.5 rounded text-[7px] font-bold transition-all ${indicators[k] ? "neon-green bg-[rgba(0,255,180,0.12)]" : "text-[hsl(220,20%,35%)]"}`}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(10,15,28,0.7)" }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-t-[var(--accent-color)] rounded-full animate-spin" style={{ borderColor: "var(--card-border-color)", borderTopColor: "var(--accent-color)" }} />
              <span className="text-[8px]" style={{ color: "var(--accent-color)" }}>LOADING CHART...</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[9px] neon-red mb-1">Chart data unavailable</div>
              <button onClick={loadChart} className="text-[8px] neon-green px-2 py-1 rounded border border-[rgba(0,255,180,0.2)]">↺ Retry</button>
            </div>
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>

      {/* Indicator legend */}
      <div className="flex items-center gap-3 px-2 py-1 text-[7px]" style={{ borderTop: "1px solid var(--card-border-color)" }}>
        {indicators.ema20 && <span style={{ color: "rgba(59,130,246,0.9)" }}>— EMA20</span>}
        {indicators.ema50 && <span style={{ color: "rgba(234,179,8,0.9)" }}>— EMA50</span>}
        {indicators.vwap  && <span style={{ color: "rgba(168,85,247,0.9)" }}>— VWAP</span>}
        {indicators.bb    && <span style={{ color: "rgba(0,255,180,0.6)" }}>-- BB(20)</span>}
      </div>

      {/* Pine Indicator Analysis Box */}
      {showAnalysis && analysisData && snap && (
        <div className="mx-2 mb-2 rounded-lg border overflow-hidden" style={{ borderColor: "var(--card-border-color)" }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--card-border-color)", background: "rgba(0,0,0,0.3)" }}>
            <span className="text-[8px] font-bold" style={{ color: "var(--accent-color)" }}>PINE INDICATOR ANALYSIS — {displayLabel}</span>
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${signalColor}`} style={{ background: analysisData.signal.includes("BUY") ? "rgba(0,255,180,0.1)" : analysisData.signal.includes("SELL") ? "rgba(255,80,80,0.1)" : "rgba(255,200,0,0.1)" }}>
              {analysisData.signal}  {analysisData.confidence}%
            </span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">RSI (14)</div>
                <div className={`text-sm font-bold tabular-nums ${snap.rsi > 70 ? "neon-red" : snap.rsi < 30 ? "neon-green" : "neon-yellow"}`}>{snap.rsi.toFixed(1)}</div>
                <div className="text-[7px] text-[hsl(220,20%,38%)]">{analysisData.rsiZone}</div>
              </div>
              <div className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">MACD HIST</div>
                <div className={`text-sm font-bold tabular-nums ${snap.macdHist > 0 ? "neon-green" : "neon-red"}`}>{snap.macdHist.toFixed(3)}</div>
                <div className="text-[7px] text-[hsl(220,20%,38%)]">{snap.macdHist > 0 ? "BULLISH" : "BEARISH"}</div>
              </div>
              <div className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">VWAP</div>
                <div className={`text-sm font-bold tabular-nums ${snap.currentPrice > snap.vwap ? "neon-green" : "neon-red"}`}>{snap.vwap.toFixed(1)}</div>
                <div className="text-[7px] text-[hsl(220,20%,38%)]">{snap.currentPrice > snap.vwap ? "ABOVE ✓" : "BELOW ✗"}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">EMA20</div>
                <div className={`text-xs font-bold tabular-nums ${snap.currentPrice > snap.ema20 ? "neon-green" : "neon-red"}`}>{snap.ema20.toFixed(1)}</div>
                <div className="text-[7px] text-[hsl(220,20%,38%)]">{snap.currentPrice > snap.ema20 ? "ABOVE" : "BELOW"}</div>
              </div>
              <div className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">EMA50</div>
                <div className={`text-xs font-bold tabular-nums ${snap.currentPrice > snap.ema50 ? "neon-green" : "neon-red"}`}>{snap.ema50.toFixed(1)}</div>
                <div className="text-[7px] text-[hsl(220,20%,38%)]">{snap.currentPrice > snap.ema50 ? "ABOVE" : "BELOW"}</div>
              </div>
              <div className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[7px] text-[hsl(220,20%,38%)] mb-0.5">BB %B</div>
                <div className="text-xs font-bold tabular-nums neon-yellow">{snap.bbUpper > snap.bbLower ? (((snap.currentPrice - snap.bbLower) / (snap.bbUpper - snap.bbLower)) * 100).toFixed(0) : 50}%</div>
                <div className="text-[7px] text-[hsl(220,20%,38%)]">IN BAND</div>
              </div>
            </div>
            <div className="text-[8px] font-bold mb-1.5" style={{ color: "var(--accent-color)" }}>AI ANALYSIS</div>
            <div className="text-[8px] text-[hsl(180,40%,65%)] mb-2 leading-relaxed">{analysisData.summary}</div>
            <div className="space-y-1">
              {analysisData.reasons.map((r, i) => (
                <div key={i} className="flex gap-1.5 text-[7px] text-[hsl(220,20%,48%)]">
                  <span className={r.toLowerCase().includes("bullish") || r.toLowerCase().includes("above") || r.toLowerCase().includes("positive") ? "neon-green" : "neon-red"}>▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
