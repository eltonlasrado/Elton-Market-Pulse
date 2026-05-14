import { useState, useEffect, useRef } from 'react';

interface Quote {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface Signal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  timestamp: number;
}

interface Alert {
  symbol: string;
  type: 'DOUBLE_TOP' | 'DOUBLE_BOTTOM';
  price: number;
  action: 'BUY' | 'SELL';
  timestamp: number;
}

export default function LiveMarketDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [updateTime, setUpdateTime] = useState(new Date());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live/stream`);

      ws.onopen = () => {
        console.log('[LIVE] Connected to live market data');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setQuotes(data.quotes || []);
          setSignals(data.signals || []);
          setAlerts(data.alerts || []);
          setUpdateTime(new Date());
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[LIVE] WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[LIVE] Disconnected from live market data');
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[LIVE] Connection error:', error);
    }
  };

  const buySignals = signals.filter(s => s.signal === 'BUY');
  const sellSignals = signals.filter(s => s.signal === 'SELL');
  const doubleTopAlerts = alerts.filter(a => a.type === 'DOUBLE_TOP');
  const doubleBottomAlerts = alerts.filter(a => a.type === 'DOUBLE_BOTTOM');

  return (
    <div className="min-h-screen cyber-grid">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Header with live status */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold gradient-text mb-2">🔴 LIVE MARKET DASHBOARD</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">
              {isConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'} • Updated every 1 second • Last update: {updateTime.toLocaleTimeString('en-IN')}
            </p>
          </div>
          <div className="glass-card rounded-lg p-3 text-right">
            <div className="text-[8px] text-[hsl(220,20%,40%)])">Market Status</div>
            <div className={`text-[10px] font-bold ${
              isConnected ? 'neon-green' : 'neon-red'
            }`}>
              {isConnected ? '🟢 LIVE TRADING' : '🔴 OFFLINE'}
            </div>
          </div>
        </div>

        {/* Live quotes ticker */}
        <div className="glass-card rounded-lg p-4 overflow-auto">
          <h2 className="text-[10px] font-bold gradient-text mb-3">📊 LIVE QUOTES (Updated Every Second)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {quotes.map((quote) => (
              <div
                key={quote.symbol}
                className="rounded p-2 bg-[rgba(0,0,0,0.3)] border border-[rgba(0,255,180,0.2)]"
              >
                <div className="text-[8px] font-bold text-[hsl(180,50%,75%)]">{quote.symbol}</div>
                <div className="text-[9px] font-bold neon-green">₹{quote.price.toFixed(2)}</div>
                <div className={`text-[7px] font-bold ${
                  quote.changePercent >= 0 ? 'neon-green' : 'neon-red'
                }`}>
                  {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Trade Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BUY Signals */}
          <div className="glass-card rounded-lg p-4">
            <h2 className="text-[10px] font-bold neon-green mb-3">✅ BUY SIGNALS ({buySignals.length})</h2>
            <div className="space-y-2 max-h-80 overflow-auto">
              {buySignals.slice(-10).map((signal, i) => (
                <div key={i} className="rounded p-2 bg-[rgba(0,255,180,0.05)] border border-[rgba(0,255,180,0.3)]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-bold text-[hsl(180,50%,75%)]">{signal.symbol}</div>
                    <div className="text-[8px] font-bold neon-green">Confidence: {(signal.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-[7px] text-[hsl(220,20%,40%)]">
                    Entry: ₹{signal.entryPrice.toFixed(0)} | Target: ₹{signal.targetPrice.toFixed(0)} | SL: ₹{signal.stopLoss.toFixed(0)}
                  </div>
                  <div className="text-[7px] text-[hsl(168,100%,50%)]">
                    Risk:Reward = 1:{signal.riskRewardRatio.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SELL Signals */}
          <div className="glass-card rounded-lg p-4">
            <h2 className="text-[10px] font-bold neon-red mb-3">🔴 SELL SIGNALS ({sellSignals.length})</h2>
            <div className="space-y-2 max-h-80 overflow-auto">
              {sellSignals.slice(-10).map((signal, i) => (
                <div key={i} className="rounded p-2 bg-[rgba(255,80,80,0.05)] border border-[rgba(255,80,80,0.3)]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-bold text-[hsl(0,100%,70%)]">{signal.symbol}</div>
                    <div className="text-[8px] font-bold neon-red">Confidence: {(signal.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-[7px] text-[hsl(220,20%,40%)]">
                    Entry: ₹{signal.entryPrice.toFixed(0)} | Target: ₹{signal.targetPrice.toFixed(0)} | SL: ₹{signal.stopLoss.toFixed(0)}
                  </div>
                  <div className="text-[7px] text-[hsl(168,100%,50%)]">
                    Risk:Reward = 1:{signal.riskRewardRatio.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Double Top/Bottom Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Double Top Alerts */}
          <div className="glass-card rounded-lg p-4">
            <h2 className="text-[10px] font-bold neon-red mb-3">⬇️ DOUBLE TOP ALERTS ({doubleTopAlerts.length})</h2>
            <div className="space-y-2 max-h-60 overflow-auto">
              {doubleTopAlerts.slice(-5).map((alert, i) => (
                <div key={i} className="rounded p-2 bg-[rgba(255,80,80,0.05)] border border-[rgba(255,80,80,0.3)]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-bold text-[hsl(0,100%,70%)]">{alert.symbol}</div>
                    <div className="text-[8px] text-[hsl(220,20%,35%)]">{new Date(alert.timestamp).toLocaleTimeString('en-IN')}</div>
                  </div>
                  <div className="text-[7px] text-[hsl(220,20%,40%)]">
                    Price Hit: ₹{alert.price.toFixed(0)} | Action: SELL
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Double Bottom Alerts */}
          <div className="glass-card rounded-lg p-4">
            <h2 className="text-[10px] font-bold neon-green mb-3">⬆️ DOUBLE BOTTOM ALERTS ({doubleBottomAlerts.length})</h2>
            <div className="space-y-2 max-h-60 overflow-auto">
              {doubleBottomAlerts.slice(-5).map((alert, i) => (
                <div key={i} className="rounded p-2 bg-[rgba(0,255,180,0.05)] border border-[rgba(0,255,180,0.3)]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[9px] font-bold text-[hsl(180,50%,75%)]">{alert.symbol}</div>
                    <div className="text-[8px] text-[hsl(220,20%,35%)]">{new Date(alert.timestamp).toLocaleTimeString('en-IN')}</div>
                  </div>
                  <div className="text-[7px] text-[hsl(220,20%,40%)]">
                    Price Hit: ₹{alert.price.toFixed(0)} | Action: BUY
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-lg p-3 text-center">
            <div className="text-[7px] text-[hsl(220,20%,40%)])">Total Symbols</div>
            <div className="text-[12px] font-bold neon-green">{quotes.length}</div>
          </div>
          <div className="glass-card rounded-lg p-3 text-center">
            <div className="text-[7px] text-[hsl(220,20%,40%)])">Active Signals</div>
            <div className="text-[12px] font-bold neon-green">{signals.length}</div>
          </div>
          <div className="glass-card rounded-lg p-3 text-center">
            <div className="text-[7px] text-[hsl(220,20%,40%)])">Buy Signals</div>
            <div className="text-[12px] font-bold neon-green">{buySignals.length}</div>
          </div>
          <div className="glass-card rounded-lg p-3 text-center">
            <div className="text-[7px] text-[hsl(220,20%,40%)])">Sell Signals</div>
            <div className="text-[12px] font-bold neon-red">{sellSignals.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
