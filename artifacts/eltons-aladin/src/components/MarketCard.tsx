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
  marketCap?: number;
}

interface Props {
  quote: Quote;
  label?: string;
  compact?: boolean;
  onClick?: () => void;
}

const LABELS: Record<string, string> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "BANK NIFTY",
  "^GSPC": "S&P 500",
  "^DJI": "DOW JONES",
  "^IXIC": "NASDAQ",
  "GC=F": "GOLD",
  "CL=F": "CRUDE OIL",
};

export default function MarketCard({ quote, label, compact = false, onClick }: Props) {
  const up = (quote.regularMarketChange ?? 0) >= 0;
  const displayLabel = label || LABELS[quote.symbol] || quote.shortName || quote.symbol;
  const pct52h = quote.fiftyTwoWeekHigh
    ? ((quote.regularMarketPrice! - quote.fiftyTwoWeekLow!) / (quote.fiftyTwoWeekHigh! - quote.fiftyTwoWeekLow!) * 100)
    : 50;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="glass-card glass-card-hover rounded p-3 cursor-pointer transition-all"
      >
        <div className="text-[9px] text-[hsl(220,20%,45%)] font-bold tracking-wider mb-1">{displayLabel}</div>
        <div className={`text-base font-bold tabular-nums ${up ? "neon-green" : "neon-red"}`}>
          {quote.regularMarketPrice?.toFixed(2) ?? "—"}
        </div>
        <div className={`text-[10px] ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>
          {up ? "▲" : "▼"} {Math.abs(quote.regularMarketChange ?? 0).toFixed(2)} ({Math.abs(quote.regularMarketChangePercent ?? 0).toFixed(2)}%)
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="glass-card glass-card-hover rounded-lg p-4 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[10px] text-[hsl(220,20%,45%)] font-bold tracking-widest">{displayLabel}</div>
          <div className="text-[8px] text-[hsl(220,20%,30%)]">{quote.symbol}</div>
        </div>
        <div className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${up ? "bg-[rgba(0,255,180,0.1)] text-[hsl(168,100%,50%)]" : "bg-[rgba(255,50,50,0.1)] text-[hsl(0,90%,60%)]"}`}>
          {up ? "▲ BULLISH" : "▼ BEARISH"}
        </div>
      </div>

      <div className={`text-2xl font-bold tabular-nums mb-1 ${up ? "neon-green" : "neon-red"}`}>
        {quote.regularMarketPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"}
      </div>

      <div className={`text-xs mb-3 ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>
        {up ? "+" : ""}{quote.regularMarketChange?.toFixed(2) ?? "0.00"} ({up ? "+" : ""}{quote.regularMarketChangePercent?.toFixed(2) ?? "0.00"}%)
      </div>

      {/* OHLV */}
      <div className="grid grid-cols-2 gap-1 text-[9px] mb-3">
        {[
          ["OPEN", quote.regularMarketOpen?.toFixed(2)],
          ["PREV", quote.regularMarketPreviousClose?.toFixed(2)],
          ["HIGH", quote.regularMarketDayHigh?.toFixed(2)],
          ["LOW", quote.regularMarketDayLow?.toFixed(2)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-[hsl(220,20%,40%)]">{k}</span>
            <span className="text-[hsl(180,50%,70%)] tabular-nums">{v ?? "—"}</span>
          </div>
        ))}
      </div>

      {/* 52-week range */}
      {quote.fiftyTwoWeekHigh && (
        <div>
          <div className="flex justify-between text-[8px] text-[hsl(220,20%,35%)] mb-0.5">
            <span>52W L: {quote.fiftyTwoWeekLow?.toFixed(0)}</span>
            <span>52W H: {quote.fiftyTwoWeekHigh?.toFixed(0)}</span>
          </div>
          <div className="h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${up ? "bg-[hsl(168,100%,50%)]" : "bg-[hsl(0,90%,55%)]"}`}
              style={{ width: `${Math.max(2, Math.min(98, pct52h))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
