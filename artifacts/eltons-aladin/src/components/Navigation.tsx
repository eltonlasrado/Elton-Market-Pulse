import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme, Theme } from "@/lib/theme";

const navLinks = [
  { path: "/", label: "DASHBOARD" },
  { path: "/option-chain", label: "OPTION CHAIN" },
  { path: "/signals", label: "TRADE SIGNALS" },
  { path: "/market-watch", label: "MARKET WATCH" },
  { path: "/market-pulse", label: "MARKET PULSE" },
  { path: "/analysis", label: "ANALYSIS" },
  { path: "/ai-brain", label: "AI BRAIN" },
];

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: "cyber", label: "CYBER", icon: "⚡" },
  { id: "dark",  label: "DARK",  icon: "◾" },
  { id: "light", label: "LIGHT", icon: "☀" },
];

export default function Navigation() {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());
  const { theme, setTheme } = useTheme();

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
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,0,0,0.05)]" style={{ borderColor: "var(--header-border)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(168,100%,40%)] to-[hsl(200,100%,50%)] flex items-center justify-center text-black font-black text-xs shadow-lg">EA</div>
          <div>
            <div className="text-[11px] font-black tracking-widest neon-green">ELTON'S ALADIN</div>
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
          <div className="font-bold tabular-nums neon-green">{istTime} IST</div>
        </div>

        {/* Right: Data sources + Theme switcher */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[8px] text-[hsl(220,20%,35%)]">
            <span className="neon-green">●</span>
            <span>NSE LIVE</span>
            <span className="neon-green">●</span>
            <span>YAHOO FINANCE</span>
            <span className="neon-green">●</span>
            <span>ALADDIN AI</span>
          </div>

          {/* Theme Switcher */}
          <div className="flex items-center gap-0.5 rounded-md overflow-hidden border" style={{ borderColor: "var(--card-border-color)" }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={`${t.label} Mode`}
                className={`px-2 py-1 text-[9px] font-bold transition-all flex items-center gap-1 ${
                  theme === t.id
                    ? "bg-[var(--accent-color)] text-black"
                    : "text-[hsl(220,20%,45%)] hover:text-[hsl(180,60%,70%)]"
                }`}
                style={theme === t.id ? { backgroundColor: "var(--accent-color)", color: "black" } : {}}>
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
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
          <span className="neon-green">●</span>
          <span>MULTI-AGENT ARCHITECTURE</span>
        </div>
      </nav>
    </header>
  );
}
