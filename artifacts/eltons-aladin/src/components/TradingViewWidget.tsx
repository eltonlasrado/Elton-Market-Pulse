import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  symbol?: string;
  height?: number;
}

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

const INTERVALS = ["1m","5m","15m","1h","1d"] as const;
const RANGES: Record<string, string> = { "1m": "1d", "5m": "1d", "15m":"5d", "1h":"1mo", "1d":"6mo" };

export default function TradingViewWidget({ symbol = "NSE:NIFTY50", height = 420 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState<"1m"|"5m"|"15m"|"1h"|"1d">("5m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChg, setPriceChg] = useState<number>(0);

  const yahooSymbol = SYMBOL_MAP[symbol] || symbol;

  const loadChart = useCallback(async () => {
    if (!chartRef.current) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE}/api/market/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${RANGES[interval]}`);
      const json = await res.json();
      if (!json.success || !json.data?.length) throw new Error("no data");
      const candles = json.data;

      // Clear old chart
      chartRef.current.innerHTML = "";

      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: height - 40,
        layout: {
          background: { type: ColorType.Solid, color: "rgba(10,15,28,0)" },
          textColor: "rgba(150,200,255,0.7)",
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          fontSize: 9,
        },
        grid: {
          vertLines: { color: "rgba(0,255,180,0.05)" },
          horzLines: { color: "rgba(0,255,180,0.05)" },
        },
        crosshair: {
          vertLine: { color: "rgba(0,255,180,0.4)", style: 1 },
          horzLine: { color: "rgba(0,255,180,0.4)", style: 1 },
        },
        rightPriceScale: {
          borderColor: "rgba(0,255,180,0.1)",
          textColor: "rgba(0,255,180,0.6)",
        },
        timeScale: {
          borderColor: "rgba(0,255,180,0.1)",
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: number) => {
            const d = new Date(time * 1000);
            if (interval === "1d") return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
            return d.toLocaleTimeString("en-IN", { timeZone:"Asia/Kolkata", hour:"2-digit", minute:"2-digit" });
          },
        },
        handleScroll: true,
        handleScale: true,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "hsl(168,100%,50%)",
        downColor: "hsl(0,80%,55%)",
        borderUpColor: "hsl(168,100%,50%)",
        borderDownColor: "hsl(0,80%,55%)",
        wickUpColor: "rgba(0,255,180,0.6)",
        wickDownColor: "rgba(255,80,80,0.6)",
      });

      candleSeries.setData(candles);
      chart.timeScale().fitContent();

      const last = candles[candles.length - 1];
      const first = candles[0];
      if (last) {
        setLastPrice(last.close);
        setPriceChg(first ? ((last.close - first.open) / first.open * 100) : 0);
      }

      const ro = new ResizeObserver(() => {
        if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
      });
      ro.observe(chartRef.current);

      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [yahooSymbol, interval, height]);

  useEffect(() => {
    loadChart();
    const t = globalThis.setInterval(loadChart, 60000);
    return () => globalThis.clearInterval(t);
  }, [loadChart]);

  const displayName = Object.entries(SYMBOL_MAP).find(([, v]) => v === yahooSymbol)?.[0]?.replace("NSE:","").replace("BSE:","") || yahooSymbol.replace(".NS","").replace("^","");
  const up = priceChg >= 0;

  return (
    <div className="flex flex-col" style={{ height }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(0,255,180,0.08)] bg-[rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">{displayName}</span>
          {lastPrice && (
            <>
              <span className={`text-sm font-bold tabular-nums ${up ? "neon-green" : "neon-red"}`}>{lastPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              <span className={`text-[8px] tabular-nums ${up ? "neon-green" : "neon-red"}`}>{up ? "▲" : "▼"} {Math.abs(priceChg).toFixed(2)}%</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)}
              className={`px-2 py-0.5 rounded text-[7px] font-bold transition-all ${interval === iv ? "bg-[rgba(0,255,180,0.2)] neon-green" : "text-[hsl(220,20%,40%)] hover:text-[hsl(180,60%,70%)]"}`}>
              {iv.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {/* Chart area */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(10,15,28,0.7)] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[rgba(0,255,180,0.3)] border-t-[rgba(0,255,180,1)] rounded-full animate-spin" />
              <span className="text-[8px] text-[hsl(168,70%,40%)]">LOADING CHART...</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[9px] text-[hsl(0,70%,55%)] mb-1">Chart data unavailable</div>
              <button onClick={loadChart} className="text-[8px] neon-green px-2 py-1 rounded border border-[rgba(0,255,180,0.2)]">↺ Retry</button>
            </div>
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
