import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import TickerStrip from "@/components/TickerStrip";
import Dashboard from "@/pages/Dashboard";
import FnoTerminal from "@/pages/FnoTerminal";
import MarketPulse from "@/pages/MarketPulse";
import Signals from "@/pages/Signals";
import RiskEngine from "@/pages/RiskEngine";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 15000,
    }
  }
});

function NotFound() {
  return (
    <div className="min-h-screen cyber-grid flex items-center justify-center">
      <div className="text-center glass-card rounded-xl p-12">
        <div className="text-6xl mb-4">🔮</div>
        <div className="text-2xl font-bold gradient-text mb-2">PAGE NOT FOUND</div>
        <div className="text-[hsl(220,20%,45%)] text-sm">The genie couldn't find this route</div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <TickerStrip />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/fno" component={FnoTerminal} />
          <Route path="/market-pulse" component={MarketPulse} />
          <Route path="/signals" component={Signals} />
          <Route path="/risk" component={RiskEngine} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="border-t border-[rgba(0,255,180,0.08)] py-2 px-4 flex items-center justify-between text-[8px] text-[hsl(220,20%,30%)]">
        <span>ELTON'S ALADIN — ALADDIN AI TRADING TERMINAL v3.0</span>
        <span>FOR EDUCATIONAL PURPOSES ONLY • NOT FINANCIAL ADVICE</span>
        <span>MULTI-AGENT AI ARCHITECTURE • NSE • BSE • MCX</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
