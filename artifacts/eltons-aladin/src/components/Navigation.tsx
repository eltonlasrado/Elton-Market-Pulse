import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { path: "/", label: "DASHBOARD" },
  { path: "/fno", label: "F&O TERMINAL" },
  { path: "/market-pulse", label: "MARKET PULSE" },
  { path: "/signals", label: "SIGNALS" },
  { path: "/risk", label: "RISK ENGINE" },
];

export default function Navigation() {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());
  const [autoMode, setAutoMode] = useState(false);
  const [killActive, setKillActive] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isMarketOpen = () => {
    const h = time.getHours(), m = time.getMinutes();
    const mins = h * 60 + m;
    return mins >= 555 && mins <= 930; // 9:15 AM to 3:30 PM IST
  };

  return (
    <header className="terminal-header sticky top-0 z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,255,180,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(168,100%,40%)] to-[hsl(200,100%,50%)] flex items-center justify-center text-black font-bold text-xs">EA</div>
            <div>
              <div className="text-[10px] text-[hsl(168,100%,50%)] font-bold tracking-widest">ELTON'S ALADIN</div>
              <div className="text-[8px] text-[hsl(220,20%,45%)] tracking-wider">AI TRADING TERMINAL v3.0</div>
            </div>
          </div>
        </div>

        {/* Market status & time */}
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full pulse-dot ${isMarketOpen() ? "status-live" : "status-warning"}`}></div>
            <span className={isMarketOpen() ? "neon-green" : "text-[hsl(45,100%,55%)]"}>
              {isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED"}
            </span>
          </div>
          <div className="text-[hsl(220,20%,50%)]">NSE | BSE | MCX</div>
          <div className="text-[hsl(168,100%,50%)] font-bold tabular-nums">
            {time.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })} IST
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Auto toggle */}
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold tracking-wider border transition-all ${
              autoMode
                ? "bg-[rgba(0,255,180,0.15)] border-[hsl(168,100%,50%)] neon-green"
                : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.1)] text-[hsl(220,20%,45%)]"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoMode ? "status-live pulse-dot" : "bg-[hsl(220,20%,30%)]"}`}></div>
            AUTO {autoMode ? "ON" : "OFF"}
          </button>

          {/* Kill switch */}
          <button
            onClick={() => setKillActive(!killActive)}
            className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider border transition-all ${
              killActive
                ? "bg-[rgba(255,50,50,0.3)] border-[hsl(0,90%,55%)] text-[hsl(0,90%,65%)]"
                : "kill-switch text-[hsl(0,80%,60%)]"
            }`}
          >
            ⚠ KILL SWITCH {killActive ? "ARMED" : "SAFE"}
          </button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-0 px-4">
        {navLinks.map(({ path, label }) => (
          <Link key={path} href={path}
            className={`px-4 py-2.5 text-[10px] font-bold tracking-widest transition-all cursor-pointer border-b-2 ${
              location === path
                ? "nav-active"
                : "text-[hsl(220,20%,45%)] border-transparent hover:text-[hsl(180,60%,70%)] hover:border-[rgba(0,255,180,0.3)]"
            }`}>
            {label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[9px] text-[hsl(220,20%,35%)]">
          <span>POWERED BY ALADDIN AI</span>
          <span className="text-[hsl(168,100%,40%)]">●</span>
          <span>MULTI-AGENT ARCHITECTURE</span>
        </div>
      </nav>
    </header>
  );
}
