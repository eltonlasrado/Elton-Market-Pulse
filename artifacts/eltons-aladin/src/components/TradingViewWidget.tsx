import { useEffect, useRef } from "react";

interface Props {
  symbol?: string;
  height?: number;
}

export default function TradingViewWidget({ symbol = "CAPITALCOM:NIFTY50", height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "5",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10,15,28,0.95)",
      gridColor: "rgba(0,255,180,0.05)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      withdateranges: true,
      allow_symbol_change: true,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "BB@tv-basicstudies"],
      popup_width: "1000",
      popup_height: "650",
      support_host: "https://www.tradingview.com"
    });
    containerRef.current.appendChild(script);
    widgetRef.current = script;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height, width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height, width: "100%" }}></div>
    </div>
  );
}
