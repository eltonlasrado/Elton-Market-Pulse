import { useEffect, useState, useRef } from "react";
import { fetchTicker } from "@/lib/api";

interface Quote {
  symbol: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

const SYMBOL_LABELS: Record<string, string> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "BANK NIFTY",
  "^GSPC": "S&P 500",
  "^DJI": "DOW JONES",
  "^IXIC": "NASDAQ",
  "GC=F": "GOLD",
  "CL=F": "CRUDE OIL",
  "RELIANCE.NS": "RELIANCE",
  "TCS.NS": "TCS",
  "HDFCBANK.NS": "HDFC BANK",
  "INFY.NS": "INFOSYS",
  "ICICIBANK.NS": "ICICI BANK",
  "HINDUNILVR.NS": "HUL",
  "SBIN.NS": "SBI",
  "BAJFINANCE.NS": "BAJAJ FIN",
  "BHARTIARTL.NS": "AIRTEL",
  "ITC.NS": "ITC",
  "KOTAKBANK.NS": "KOTAK",
  "LT.NS": "L&T",
};

export default function TickerStrip() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchTicker();
        if (!cancelled && res.success) setQuotes(res.data || []);
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const items = quotes.length > 0 ? quotes : [];

  return (
    <div className="w-full overflow-hidden bg-[rgba(0,0,0,0.4)] border-b border-[rgba(0,255,180,0.1)] py-1.5">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-3 py-0.5 bg-[rgba(0,255,180,0.15)] border-r border-[rgba(0,255,180,0.2)] mr-2">
          <span className="text-[9px] font-bold neon-green tracking-widest">LIVE</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-animate flex gap-0 whitespace-nowrap">
            {[...items, ...items].map((q, i) => {
              const up = q.regularMarketChange >= 0;
              const label = SYMBOL_LABELS[q.symbol] || q.shortName || q.symbol;
              return (
                <span key={i} className="inline-flex items-center gap-2 px-4 text-[10px]">
                  <span className="text-[hsl(220,20%,55%)] font-bold">{label}</span>
                  <span className={`font-bold tabular-nums ${up ? "neon-green" : "neon-red"}`}>
                    {q.regularMarketPrice?.toFixed(2) ?? "—"}
                  </span>
                  <span className={`text-[9px] ${up ? "text-[hsl(168,100%,40%)]" : "text-[hsl(0,80%,55%)]"}`}>
                    {up ? "▲" : "▼"} {Math.abs(q.regularMarketChangePercent ?? 0).toFixed(2)}%
                  </span>
                  <span className="text-[hsl(220,20%,25%)]">│</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
