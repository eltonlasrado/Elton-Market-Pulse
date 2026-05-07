import { useEffect, useState, useCallback } from "react";
import { fetchQuotes, formatVolume } from "@/lib/api";

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
  averageDailyVolume3Month?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
}

const WATCHLISTS: Record<string, string[]> = {
  "NIFTY 50": [
    "^NSEI","RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
    "HINDUNILVR.NS","SBIN.NS","BAJFINANCE.NS","BHARTIARTL.NS","ITC.NS",
    "KOTAKBANK.NS","LT.NS","AXISBANK.NS","WIPRO.NS","MARUTI.NS",
    "ULTRACEMCO.NS","HCLTECH.NS","ASIANPAINT.NS","TATAMOTORS.NS","SUNPHARMA.NS",
  ],
  "BANK NIFTY": [
    "^NSEBANK","HDFCBANK.NS","ICICIBANK.NS","KOTAKBANK.NS","SBIN.NS","AXISBANK.NS",
    "BANDHANBNK.NS","FEDERALBNK.NS","IDFCFIRSTB.NS","INDUSINDBK.NS","AUBANK.NS",
  ],
  "F&O TOP": [
    "^NSEI","^NSEBANK","RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS",
    "BAJFINANCE.NS","ADANIENT.NS","TATASTEEL.NS","JSWSTEEL.NS","ONGC.NS",
  ],
  "IT SECTOR": [
    "TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS","MPHASIS.NS","LTIM.NS",
  ],
  "GLOBAL": [
    "^GSPC","^DJI","^IXIC","AAPL","TSLA","MSFT","GOOGL","AMZN","GC=F","CL=F",
  ],
};

const LABELS: Record<string, string> = {
  "^NSEI": "NIFTY 50", "^BSESN": "SENSEX", "^NSEBANK": "BANK NIFTY",
  "^GSPC": "S&P 500", "^DJI": "DOW JONES", "^IXIC": "NASDAQ",
  "GC=F": "GOLD", "CL=F": "CRUDE OIL",
};

export default function MarketWatch() {
  const [activeList, setActiveList] = useState("NIFTY 50");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [sortBy, setSortBy] = useState<"symbol" | "change" | "changePct" | "volume">("changePct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    const syms = WATCHLISTS[activeList];
    try {
      const res = await fetchQuotes(syms);
      if (res.success) {
        setQuotes(res.data || []);
        setLastUpdate(new Date());
      }
    } catch {}
    setLoading(false);
  }, [activeList]);

  useEffect(() => {
    setLoading(true);
    loadData();
    const t = setInterval(loadData, 10000);
    return () => clearInterval(t);
  }, [loadData]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  let displayed = [...quotes];
  if (search) displayed = displayed.filter(q =>
    (q.shortName || q.symbol).toLowerCase().includes(search.toLowerCase())
  );
  displayed.sort((a, b) => {
    let av = 0, bv = 0;
    if (sortBy === "change") { av = a.regularMarketChange ?? 0; bv = b.regularMarketChange ?? 0; }
    else if (sortBy === "changePct") { av = a.regularMarketChangePercent ?? 0; bv = b.regularMarketChangePercent ?? 0; }
    else if (sortBy === "volume") { av = a.regularMarketVolume ?? 0; bv = b.regularMarketVolume ?? 0; }
    else return (a.shortName || a.symbol).localeCompare(b.shortName || b.symbol) * (sortDir === "asc" ? 1 : -1);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const advancers = quotes.filter(q => (q.regularMarketChange ?? 0) > 0).length;
  const decliners = quotes.filter(q => (q.regularMarketChange ?? 0) < 0).length;
  const unchanged = quotes.length - advancers - decliners;

  const SortHeader = ({ col, label }: { col: typeof sortBy, label: string }) => (
    <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider cursor-pointer hover:text-[hsl(180,60%,60%)] whitespace-nowrap"
      onClick={() => toggleSort(col)}>
      {label} {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">LIVE MARKET WATCH</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Real-time quotes • Auto-refresh every 10 seconds • NSE/BSE/Global</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[8px]">
              <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
              <span className="neon-green">{lastUpdate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            <button onClick={loadData} className="px-2 py-1 rounded text-[8px] bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green">↺ REFRESH</button>
          </div>
        </div>

        {/* Breadth + Watchlist tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 flex-wrap">
            {Object.keys(WATCHLISTS).map(list => (
              <button key={list} onClick={() => setActiveList(list)}
                className={`px-3 py-1.5 rounded text-[8px] font-bold tracking-wider transition-all ${activeList === list ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
                {list}
              </button>
            ))}
          </div>

          {quotes.length > 0 && (
            <div className="flex items-center gap-4 text-[8px]">
              <span className="neon-green">▲ {advancers} ADVANCERS</span>
              <span className="neon-red">▼ {decliners} DECLINERS</span>
              <span className="text-[hsl(220,20%,45%)]">◆ {unchanged} UNCHANGED</span>
              <div className="w-32 h-2 rounded-full overflow-hidden bg-[rgba(255,80,80,0.2)]">
                <div className="h-full bg-[hsl(168,100%,50%)] rounded-full" style={{ width: `${quotes.length ? (advancers / quotes.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name..."
            className="bg-[rgba(0,0,0,0.4)] border border-[rgba(0,255,180,0.15)] rounded px-3 py-1.5 text-[9px] text-[hsl(180,60%,70%)] focus:outline-none focus:border-[rgba(0,255,180,0.4)] w-64"
          />
          <span className="text-[8px] text-[hsl(220,20%,35%)]">{displayed.length} instruments</span>
        </div>

        {/* Main table */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-[8.5px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[rgba(0,0,0,0.8)]">
                  <SortHeader col="symbol" label="SYMBOL / NAME" />
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">LTP</th>
                  <SortHeader col="change" label="CHANGE" />
                  <SortHeader col="changePct" label="CHNG %" />
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">OPEN</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">HIGH</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">LOW</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">PREV CLOSE</th>
                  <SortHeader col="volume" label="VOLUME" />
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">50D AVG</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">200D AVG</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">52W HIGH</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">52W LOW</th>
                  <th className="px-2 py-2 text-left text-[hsl(220,20%,38%)] font-bold tracking-wider whitespace-nowrap">52W POS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i} className="border-t border-[rgba(255,255,255,0.03)]">
                      {Array(14).fill(0).map((_, j) => (
                        <td key={j} className="px-2 py-2"><div className="h-3 bg-[rgba(0,255,180,0.04)] rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : displayed.map(q => {
                  const up = (q.regularMarketChange ?? 0) >= 0;
                  const label = LABELS[q.symbol] || q.shortName || q.symbol.replace(".NS","");
                  const w52pct = q.fiftyTwoWeekHigh && q.fiftyTwoWeekLow
                    ? ((q.regularMarketPrice! - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow) * 100)
                    : null;
                  return (
                    <tr key={q.symbol} className="border-t border-[rgba(255,255,255,0.03)] table-row-hover">
                      <td className="px-2 py-1.5">
                        <div className="font-bold text-[hsl(180,50%,70%)] whitespace-nowrap">{label}</div>
                        <div className="text-[7px] text-[hsl(220,20%,35%)]">{q.symbol.replace(".NS","")}</div>
                      </td>
                      <td className={`px-2 py-1.5 font-bold tabular-nums text-[9px] ${up ? "neon-green" : "neon-red"}`}>
                        {q.regularMarketPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"}
                      </td>
                      <td className={`px-2 py-1.5 tabular-nums ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>
                        {up ? "+" : ""}{q.regularMarketChange?.toFixed(2) ?? "—"}
                      </td>
                      <td className={`px-2 py-1.5 tabular-nums font-bold ${up ? "text-[hsl(168,80%,45%)]" : "text-[hsl(0,80%,55%)]"}`}>
                        {up ? "+" : ""}{q.regularMarketChangePercent?.toFixed(2) ?? "—"}%
                      </td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(220,20%,45%)]">{q.regularMarketOpen?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(168,70%,50%)]">{q.regularMarketDayHigh?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(0,70%,55%)]">{q.regularMarketDayLow?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(220,20%,45%)]">{q.regularMarketPreviousClose?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(220,20%,42%)]">{formatVolume(q.regularMarketVolume ?? 0)}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(200,70%,55%)]">{q.fiftyDayAverage?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(200,60%,50%)]">{q.twoHundredDayAverage?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(45,80%,55%)]">{q.fiftyTwoWeekHigh?.toFixed(0) ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums text-[hsl(0,65%,50%)]">{q.fiftyTwoWeekLow?.toFixed(0) ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        {w52pct !== null ? (
                          <div>
                            <div className="h-1.5 w-16 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${w52pct > 70 ? "bg-[hsl(168,100%,50%)]" : w52pct < 30 ? "bg-[hsl(0,90%,55%)]" : "bg-[hsl(45,100%,55%)]"}`}
                                style={{ width: `${Math.max(2, Math.min(98, w52pct))}%` }} />
                            </div>
                            <span className="text-[7px] text-[hsl(220,20%,38%)]">{w52pct.toFixed(0)}%</span>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
