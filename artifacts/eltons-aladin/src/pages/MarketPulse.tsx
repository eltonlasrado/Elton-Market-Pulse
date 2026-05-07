import { useEffect, useState, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { fetchQuotes, fetchFiiDii, fetchNews, fetchMovers, formatVolume } from "@/lib/api";

interface Quote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
}

const SECTORS = [
  { name: "BANKING", symbols: ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","KOTAKBANK.NS"], color: "hsl(168,80%,45%)" },
  { name: "IT", symbols: ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS"], color: "hsl(200,80%,55%)" },
  { name: "AUTO", symbols: ["MARUTI.NS","TATAMOTORS.NS","BAJAJ-AUTO.NS"], color: "hsl(45,100%,55%)" },
  { name: "PHARMA", symbols: ["SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS"], color: "hsl(280,80%,65%)" },
  { name: "ENERGY", symbols: ["RELIANCE.NS","ONGC.NS","NTPC.NS","POWERGRID.NS"], color: "hsl(30,90%,55%)" },
  { name: "METALS", symbols: ["TATASTEEL.NS","JSWSTEEL.NS","HINDALCO.NS"], color: "hsl(0,70%,55%)" },
  { name: "FMCG", symbols: ["HINDUNILVR.NS","ITC.NS","NESTLEIND.NS"], color: "hsl(120,60%,50%)" },
  { name: "REALTY", symbols: ["DLF.NS","GODREJPROP.NS"], color: "hsl(60,80%,55%)" },
];

const MACRO_DATA = [
  { label: "USD/INR", value: "83.52", change: "+0.08", type: "FOREX", up: false },
  { label: "EUR/INR", value: "90.41", change: "+0.18", type: "FOREX", up: true },
  { label: "10Y G-SEC", value: "7.08%", change: "-0.02", type: "BOND", up: false },
  { label: "INDIA VIX", value: "14.8", change: "+0.6", type: "VOLATILITY", up: false },
  { label: "REPO RATE", value: "6.50%", change: "0.00", type: "POLICY", up: true },
  { label: "CPI YoY", value: "5.4%", change: "-0.1", type: "MACRO", up: true },
];

export default function MarketPulse() {
  const [tab, setTab] = useState<"overview" | "fii" | "sectors" | "institutional" | "news">("overview");
  const [sectorData, setSectorData] = useState<Record<string, number>>({});
  const [fiiDii, setFiiDii] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [movers, setMovers] = useState<{ topGainers: Quote[]; topLosers: Quote[] }>({ topGainers: [], topLosers: [] });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadData = useCallback(async () => {
    const allSymbols = SECTORS.flatMap(s => s.symbols);
    const [qRes, fiiRes, newsRes, mvrRes] = await Promise.allSettled([
      fetchQuotes(allSymbols),
      fetchFiiDii(),
      fetchNews(),
      fetchMovers(),
    ]);

    if (qRes.status === "fulfilled" && qRes.value.success) {
      const quotes: Quote[] = qRes.value.data || [];
      const sData: Record<string, number> = {};
      for (const sector of SECTORS) {
        const sectorQuotes = quotes.filter(q => sector.symbols.includes(q.symbol));
        if (sectorQuotes.length > 0) {
          const avg = sectorQuotes.reduce((sum, q) => sum + (q.regularMarketChangePercent ?? 0), 0) / sectorQuotes.length;
          sData[sector.name] = avg;
        }
      }
      setSectorData(sData);
    }
    if (fiiRes.status === "fulfilled" && fiiRes.value.success) setFiiDii(fiiRes.value.data || []);
    if (newsRes.status === "fulfilled" && newsRes.value.success) setNews(newsRes.value.data || []);
    if (mvrRes.status === "fulfilled" && mvrRes.value.success) setMovers({ topGainers: mvrRes.value.topGainers || [], topLosers: mvrRes.value.topLosers || [] });
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 20000);
    return () => clearInterval(t);
  }, [loadData]);

  const todayFii = fiiDii[0];
  const totalFiiNet5d = fiiDii.slice(0, 5).reduce((s: number, d: any) => s + (d?.fiiNet ?? 0), 0);
  const totalDiiNet5d = fiiDii.slice(0, 5).reduce((s: number, d: any) => s + (d?.diiNet ?? 0), 0);

  const INST_ACTIVITY = [
    { type: "FII", action: "BUY", stock: "HDFC BANK", qty: "12.4L", value: "₹2,340Cr", time: "11:23" },
    { type: "DII", action: "SELL", stock: "INFOSYS", qty: "8.1L", value: "₹1,320Cr", time: "11:18" },
    { type: "FII", action: "BUY", stock: "ICICI BANK", qty: "15.2L", value: "₹2,890Cr", time: "10:55" },
    { type: "MF", action: "BUY", stock: "NIFTY 50 ETF", qty: "—", value: "₹4,200Cr", time: "10:30" },
    { type: "FII", action: "SELL", stock: "RELIANCE", qty: "5.4L", value: "₹1,590Cr", time: "10:12" },
    { type: "DII", action: "BUY", stock: "TCS", qty: "3.8L", value: "₹1,580Cr", time: "09:47" },
    { type: "FPI", action: "BUY", stock: "BANK NIFTY OPTIONS", qty: "—", value: "₹890Cr", time: "09:32" },
    { type: "MF", action: "BUY", stock: "MIDCAP 150 ETF", qty: "—", value: "₹1,100Cr", time: "09:15" },
  ];

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">MARKET PULSE INSIGHTS</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">FII/DII Flow • Institutional Activity • Sector Heatmap • Market Breadth</p>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
              <span className="neon-green">{lastUpdate.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            <button onClick={loadData} className="px-2 py-1 rounded bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green">↺</button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "TODAY FII NET", value: todayFii ? `${todayFii.fiiNet >= 0 ? "+" : "-"}₹${Math.abs(todayFii.fiiNet).toLocaleString("en-IN")}Cr` : "—", color: todayFii?.fiiNet >= 0 ? "neon-green" : "neon-red", desc: "Equity segment" },
            { label: "TODAY DII NET", value: todayFii ? `${todayFii.diiNet >= 0 ? "+" : "-"}₹${Math.abs(todayFii.diiNet).toLocaleString("en-IN")}Cr` : "—", color: todayFii?.diiNet >= 0 ? "neon-green" : "neon-red", desc: "Cash + F&O" },
            { label: "5D FII NET", value: `${totalFiiNet5d >= 0 ? "+" : "-"}₹${Math.abs(totalFiiNet5d).toLocaleString("en-IN")}Cr`, color: totalFiiNet5d >= 0 ? "neon-green" : "neon-red", desc: "Last 5 sessions" },
            { label: "5D DII NET", value: `${totalDiiNet5d >= 0 ? "+" : "-"}₹${Math.abs(totalDiiNet5d).toLocaleString("en-IN")}Cr`, color: totalDiiNet5d >= 0 ? "neon-green" : "neon-red", desc: "Last 5 sessions" },
          ].map(({ label, value, color, desc }) => (
            <div key={label} className="glass-card rounded-lg p-3">
              <div className="text-[8px] text-[hsl(220,20%,38%)] mb-1 font-bold tracking-wider">{label}</div>
              <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-[7px] text-[hsl(220,20%,35%)]">{desc}</div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 flex-wrap">
          {(["overview","fii","sectors","institutional","news"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-[8px] font-bold tracking-wider transition-all ${tab === t ? "bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)]" : "glass-card text-[hsl(220,20%,45%)]"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">NIFTY 50 — TECHNICAL OVERVIEW</div>
              <TradingViewWidget symbol="NSE:NIFTY50" height={400} />
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2 tracking-wider">MACRO SNAPSHOT</div>
                {MACRO_DATA.map(m => (
                  <div key={m.label} className="flex justify-between items-center py-1 border-b border-[rgba(255,255,255,0.04)]">
                    <div>
                      <div className="text-[8px] font-bold text-[hsl(180,50%,70%)]">{m.label}</div>
                      <div className="text-[7px] text-[hsl(220,20%,35%)]">{m.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-[hsl(220,20%,60%)] tabular-nums">{m.value}</div>
                      <div className={`text-[7px] tabular-nums ${m.up ? "neon-green" : "neon-red"}`}>{m.change}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2">TOP MOVERS TODAY</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[7px] neon-green mb-1">▲ GAINERS</div>
                    {movers.topGainers.slice(0, 5).map((q: any, i) => (
                      <div key={i} className="flex justify-between text-[7px] py-0.5">
                        <span className="text-[hsl(180,40%,60%)]">{q.shortName || q.symbol.replace(".NS","")}</span>
                        <span className="neon-green">+{q.regularMarketChangePercent?.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[7px] neon-red mb-1">▼ LOSERS</div>
                    {movers.topLosers.slice(0, 5).map((q: any, i) => (
                      <div key={i} className="flex justify-between text-[7px] py-0.5">
                        <span className="text-[hsl(180,40%,60%)]">{q.shortName || q.symbol.replace(".NS","")}</span>
                        <span className="neon-red">{q.regularMarketChangePercent?.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "fii" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">FII / DII DAILY FLOW — LAST 10 SESSIONS</div>
              <div className="p-3">
                <div className="overflow-auto">
                  <table className="w-full text-[8.5px]">
                    <thead>
                      <tr className="text-[hsl(220,20%,35%)]">
                        {["DATE","FII BUY (Cr)","FII SELL (Cr)","FII NET (Cr)","DII BUY (Cr)","DII SELL (Cr)","DII NET (Cr)","NIFTY CHNG","SENTIMENT"].map(h => (
                          <th key={h} className="px-3 py-2 text-right first:text-left font-bold tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fiiDii.map((row: any, i) => {
                        const sentiment = row.fiiNet > 0 && row.diiNet > 0 ? "BULLISH" :
                          row.fiiNet < 0 && row.diiNet < 0 ? "BEARISH" :
                            row.fiiNet > 0 ? "FII DRIVEN" : "DII DRIVEN";
                        return (
                          <tr key={i} className="border-t border-[rgba(255,255,255,0.03)] table-row-hover">
                            <td className="px-3 py-2 text-[hsl(180,40%,60%)]">{row.date}</td>
                            <td className="px-3 py-2 text-right neon-green tabular-nums">{(row.fiiBuy / 100).toFixed(0)}</td>
                            <td className="px-3 py-2 text-right neon-red tabular-nums">{(row.fiiSell / 100).toFixed(0)}</td>
                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${row.fiiNet >= 0 ? "neon-green" : "neon-red"}`}>{row.fiiNet >= 0 ? "+" : ""}{(row.fiiNet / 100).toFixed(0)}</td>
                            <td className="px-3 py-2 text-right neon-green tabular-nums">{(row.diiBuy / 100).toFixed(0)}</td>
                            <td className="px-3 py-2 text-right neon-red tabular-nums">{(row.diiSell / 100).toFixed(0)}</td>
                            <td className={`px-3 py-2 text-right font-bold tabular-nums ${row.diiNet >= 0 ? "neon-green" : "neon-red"}`}>{row.diiNet >= 0 ? "+" : ""}{(row.diiNet / 100).toFixed(0)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${row.niftyChg >= 0 ? "neon-green" : "neon-red"}`}>{row.niftyChg >= 0 ? "+" : ""}{row.niftyChg?.toFixed(2)}%</td>
                            <td className={`px-3 py-2 text-right text-[7px] font-bold ${sentiment === "BULLISH" ? "neon-green" : sentiment === "BEARISH" ? "neon-red" : "neon-yellow"}`}>{sentiment}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "sectors" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8">
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-3 tracking-wider">SECTOR HEATMAP — TODAY'S PERFORMANCE</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SECTORS.map(sector => {
                    const chg = sectorData[sector.name] ?? 0;
                    const intensity = Math.min(1, Math.abs(chg) / 3);
                    return (
                      <div key={sector.name} className="rounded-lg p-3 text-center cursor-pointer"
                        style={{
                          background: chg >= 0
                            ? `rgba(0,255,180,${0.03 + intensity * 0.15})`
                            : `rgba(255,80,80,${0.03 + intensity * 0.15})`,
                          border: `1px solid ${chg >= 0 ? `rgba(0,255,180,${0.1 + intensity * 0.3})` : `rgba(255,80,80,${0.1 + intensity * 0.3})`}`,
                        }}>
                        <div className="text-[9px] font-bold text-[hsl(180,40%,70%)] mb-1">{sector.name}</div>
                        <div className={`text-xl font-bold tabular-nums ${chg >= 0 ? "neon-green" : "neon-red"}`}>
                          {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                        </div>
                        <div className="text-[7px] text-[hsl(220,20%,35%)] mt-1">{sector.symbols.length} stocks</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)] text-[9px] font-bold text-[hsl(168,100%,50%)]">BANK NIFTY CHART</div>
              <TradingViewWidget symbol="NSE:BANKNIFTY" height={300} />
            </div>
          </div>
        )}

        {tab === "institutional" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">INSTITUTIONAL ACTIVITY — BLOCK DEALS & BULK TRADES</span>
              </div>
              <div className="overflow-auto p-2">
                <table className="w-full text-[8.5px]">
                  <thead>
                    <tr className="text-[hsl(220,20%,35%)] bg-[rgba(0,0,0,0.4)]">
                      {["TIME","INSTITUTION","ACTION","STOCK","QUANTITY","VALUE","STATUS"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INST_ACTIVITY.map((act, i) => (
                      <tr key={i} className="border-t border-[rgba(255,255,255,0.04)] table-row-hover">
                        <td className="px-3 py-2 tabular-nums text-[hsl(220,20%,40%)]">{act.time}</td>
                        <td className="px-3 py-2 font-bold">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${act.type === "FII" || act.type === "FPI" ? "bg-[rgba(0,150,255,0.15)] text-[hsl(200,100%,60%)]" : act.type === "DII" ? "bg-[rgba(0,255,180,0.15)] neon-green" : "bg-[rgba(255,200,0,0.15)] neon-yellow"}`}>
                            {act.type}
                          </span>
                        </td>
                        <td className={`px-3 py-2 font-bold ${act.action === "BUY" ? "neon-green" : "neon-red"}`}>{act.action === "BUY" ? "▲ BUY" : "▼ SELL"}</td>
                        <td className="px-3 py-2 text-[hsl(180,50%,70%)] font-bold">{act.stock}</td>
                        <td className="px-3 py-2 tabular-nums text-[hsl(220,20%,50%)]">{act.qty}</td>
                        <td className="px-3 py-2 tabular-nums font-bold text-[hsl(168,80%,45%)]">{act.value}</td>
                        <td className="px-3 py-2">
                          <span className="text-[7px] px-1.5 py-0.5 rounded neon-green bg-[rgba(0,255,180,0.1)]">EXECUTED</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2">NET INSTITUTIONAL FLOW</div>
                {[
                  { label: "FII/FPI BUY", value: "₹18,240Cr", color: "neon-green" },
                  { label: "FII/FPI SELL", value: "₹15,890Cr", color: "neon-red" },
                  { label: "FII NET", value: "+₹2,350Cr", color: "neon-green" },
                  { label: "DII BUY", value: "₹12,100Cr", color: "neon-green" },
                  { label: "DII SELL", value: "₹9,800Cr", color: "neon-red" },
                  { label: "DII NET", value: "+₹2,300Cr", color: "neon-green" },
                  { label: "MF NET", value: "+₹5,300Cr", color: "neon-green" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-[8px] py-1 border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-[hsl(220,20%,45%)]">{label}</span>
                    <span className={`font-bold tabular-nums ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "news" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8 glass-card rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[rgba(0,255,180,0.1)]">
                <span className="text-[9px] font-bold text-[hsl(168,100%,50%)]">LIVE MARKET NEWS — Moneycontrol • ET • LiveMint • Business Standard</span>
              </div>
              <div className="p-2 space-y-2 overflow-auto" style={{ maxHeight: 600 }}>
                {(news.length ? news : Array(12).fill(null)).map((n: any, i) => (
                  <div key={i} className="flex gap-3 p-2.5 rounded border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(0,255,180,0.03)] transition-all">
                    {n ? (
                      <>
                        <div className="flex-1">
                          <a href={n.link} target="_blank" rel="noreferrer"
                            className="text-[9px] text-[hsl(180,50%,75%)] hover:neon-green leading-tight block mb-1">
                            {n.title}
                          </a>
                          {n.snippet && <div className="text-[7px] text-[hsl(220,20%,38%)] mb-1 line-clamp-2">{n.snippet}</div>}
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[6px] px-1.5 py-0.5 rounded bg-[rgba(0,255,180,0.1)] text-[hsl(168,80%,50%)]">{n.source}</span>
                            <span className={`text-[6px] px-1.5 py-0.5 rounded font-bold ${n.sentiment === "BULLISH" ? "bg-[rgba(0,255,180,0.1)] neon-green" : n.sentiment === "BEARISH" ? "bg-[rgba(255,80,80,0.1)] neon-red" : "bg-[rgba(255,200,0,0.08)] neon-yellow"}`}>
                              {n.sentiment}
                            </span>
                            <span className="text-[6px] text-[hsl(220,20%,30%)]">{new Date(n.pubDate).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-10 flex-1 animate-pulse bg-[rgba(0,255,180,0.03)] rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-3">
              <div className="glass-card rounded-lg p-3">
                <div className="text-[9px] font-bold text-[hsl(168,100%,50%)] mb-2">NEWS SENTIMENT BREAKDOWN</div>
                {(() => {
                  const bull = news.filter(n => n.sentiment === "BULLISH").length;
                  const bear = news.filter(n => n.sentiment === "BEARISH").length;
                  const neut = news.length - bull - bear;
                  const total = Math.max(1, news.length);
                  return (
                    <div className="space-y-2">
                      {[
                        { label: "BULLISH", count: bull, pct: (bull/total*100), color: "hsl(168,100%,50%)" },
                        { label: "BEARISH", count: bear, pct: (bear/total*100), color: "hsl(0,80%,55%)" },
                        { label: "NEUTRAL", count: neut, pct: (neut/total*100), color: "hsl(45,100%,55%)" },
                      ].map(({ label, count, pct, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-[8px] mb-0.5">
                            <span style={{ color }}>{label}</span>
                            <span className="text-[hsl(220,20%,45%)]">{count} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      ))}
                      <div className="text-[7px] text-[hsl(220,20%,35%)] mt-1">Based on {total} Indian market news items</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
