import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { path: "/", label: "DASHBOARD" },
  { path: "/option-chain", label: "OPTION CHAIN" },
  { path: "/signals", label: "TRADE SIGNALS" },
  { path: "/market-watch", label: "MARKET WATCH" },
  { path: "/market-pulse", label: "MARKET PULSE" },
  { path: "/analysis", label: "ANALYSIS" },
  { path: "/ai-brain", label: "AI BRAIN" },
];

export default function Navigation() {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const istTime = time.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
  const istHour = parseInt(istTime.split(":")[0]);
  const istMin = parseInt(istTime.split(":")[1]);
  const totalMins = istHour * 60 + istMin;
  const isMarketOpen = totalMins >= 555 && totalMins <= 930;

  return (
    <header className="terminal-header sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,255,180,0.08)]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(168,100%,40%)] to-[hsl(200,100%,50%)] flex items-center justify-center text-black font-black text-xs">EA</div>
          <div>
            <div className="text-[11px] text-[hsl(168,100%,50%)] font-black tracking-widest">ELTON'S ALADIN</div>
            <div className="text-[8px] text-[hsl(220,20%,40%)] tracking-wider">ALADDIN AI TRADING TERMINAL v3.0</div>
          </div>
        </div>

        {/* Market status */}
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full pulse-dot ${isMarketOpen ? "status-live" : "bg-[hsl(45,100%,55%)]"}`}></div>
            <span className={`font-bold ${isMarketOpen ? "neon-green" : "text-[hsl(45,100%,55%)]"}`}>
              {isMarketOpen ? "● MARKET OPEN" : "● MARKET CLOSED"}
            </span>
          </div>
          <div className="text-[hsl(220,20%,40%)] hidden sm:block">NSE | BSE | MCX</div>
          <div className="text-[hsl(168,100%,50%)] font-bold tabular-nums">
            {istTime} IST
          </div>
        </div>

        {/* Data sources badge */}
        <div className="hidden lg:flex items-center gap-2 text-[8px] text-[hsl(220,20%,35%)]">
          <span className="text-[hsl(168,100%,40%)]">●</span>
          <span>NSE LIVE</span>
          <span className="text-[hsl(168,100%,40%)]">●</span>
          <span>YAHOO FINANCE</span>
          <span className="text-[hsl(168,100%,40%)]">●</span>
          <span>ALADDIN AI</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-0 px-2 overflow-x-auto">
        {navLinks.map(({ path, label }) => (
          <Link key={path} href={path}
            className={`px-3 py-2.5 text-[9px] font-bold tracking-widest transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              location === path
                ? "nav-active"
                : "text-[hsl(220,20%,45%)] border-transparent hover:text-[hsl(180,60%,70%)] hover:border-[rgba(0,255,180,0.3)]"
            }`}>
            {label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[8px] text-[hsl(220,20%,30%)] px-3 whitespace-nowrap">
          <span>POWERED BY ALADDIN AI</span>
          <span className="text-[hsl(168,100%,40%)]">●</span>
          <span>MULTI-AGENT ARCHITECTURE</span>
        </div>
      </nav>
    </header>
  );
}
