import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  imageMediaType?: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What is RSI and how to use it in trading?",
  "Explain how to read an option chain for NIFTY",
  "What is VWAP and how traders use it intraday?",
  "Explain Put Call Ratio and its significance",
  "What are the best indicators for Bank Nifty trading?",
  "How to calculate position size for F&O trading?",
  "Explain FII/DII data and its impact on markets",
  "What is IV Crush and how to avoid it in options?",
  "How to identify support and resistance levels?",
  "Explain the Greeks: Delta, Gamma, Theta, Vega",
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AiBrain() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `**Welcome to Aladdin AI Brain** 🧠

I'm your expert AI trading assistant specializing in Indian stock markets (NSE/BSE). I can help you with:

- **Technical Analysis** — Chart patterns, indicators (RSI, MACD, Bollinger Bands, VWAP), support/resistance
- **Options & F&O** — Option chain analysis, Greeks, strategies, lot sizes, margin requirements
- **Market Insights** — FII/DII interpretation, sector rotation, market breadth analysis
- **Risk Management** — Position sizing, stop-loss strategies, ATR-based stops
- **Stock Analysis** — Fundamental + technical combined analysis
- **Image Analysis** — Upload a chart screenshot and I'll analyze it for you

**You can also upload a chart image** and ask me to analyze it! Just click the attachment button below.

What would you like to know?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ data: string; mediaType: string; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const [header, data] = result.split(",");
      const mediaType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      setPendingImage({ data, mediaType, preview: result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if ((!text && !pendingImage) || isStreaming) return;

    const userMsg: Message = {
      role: "user",
      content: text || "(Image attached — please analyze)",
      image: pendingImage?.data,
      imageMediaType: pendingImage?.mediaType,
      timestamp: new Date(),
    };

    const history = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setPendingImage(null);
    setIsStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const convHistory = history.slice(-8).map(m => ({
        role: m.role,
        content: m.image ? [
          { type: "image", source: { type: "base64", media_type: m.imageMediaType, data: m.image } },
          { type: "text", text: m.content },
        ] : m.content,
      }));

      const response = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          image: userMsg.image,
          imageMediaType: userMsg.imageMediaType,
          conversationHistory: convHistory,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: updated[updated.length - 1].content + data.content,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "⚠ Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    }
    setIsStreaming(false);
  }, [input, pendingImage, messages, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  function renderMarkdown(text: string) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^### (.+)$/gm, '<div class="text-[10px] font-bold text-[hsl(168,100%,50%)] mt-3 mb-1 tracking-wider">$1</div>')
      .replace(/^## (.+)$/gm, '<div class="text-[11px] font-bold text-[hsl(168,100%,55%)] mt-3 mb-1 tracking-wider">$1</div>')
      .replace(/^# (.+)$/gm, '<div class="text-[12px] font-bold gradient-text mt-3 mb-1">$1</div>')
      .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 my-0.5"><span class="text-[hsl(168,100%,50%)] flex-shrink-0">•</span><span>$1</span></div>')
      .replace(/`(.+?)`/g, '<code class="bg-[rgba(0,255,180,0.1)] text-[hsl(168,100%,55%)] px-1 rounded text-[8px]">$1</code>')
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="min-h-screen cyber-grid flex flex-col">
      <div className="max-w-[1400px] mx-auto w-full p-3 flex flex-col" style={{ height: "calc(100vh - 120px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold gradient-text tracking-wider">ALADDIN AI BRAIN</h1>
            <p className="text-[9px] text-[hsl(220,20%,35%)]">Ask anything about Indian markets • Chart analysis • Image upload supported</p>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <div className="w-1.5 h-1.5 rounded-full status-live pulse-dot"></div>
            <span className="neon-green">Claude Sonnet AI</span>
            <span className="text-[hsl(220,20%,35%)]">Vision Enabled</span>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {QUICK_PROMPTS.slice(0, 5).map((p, i) => (
            <button key={i} onClick={() => { setInput(p); textareaRef.current?.focus(); }}
              className="px-2 py-1 rounded text-[7px] glass-card text-[hsl(180,40%,60%)] hover:neon-green hover:border-[rgba(0,255,180,0.3)] transition-all border border-[rgba(255,255,255,0.06)]">
              {p.length > 40 ? p.substring(0, 38) + "…" : p}
            </button>
          ))}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-auto glass-card rounded-lg p-3 space-y-3 mb-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(168,100%,40%)] to-[hsl(200,100%,50%)] flex items-center justify-center text-black font-black text-[8px] flex-shrink-0 mt-0.5">AI</div>
              )}
              <div className={`max-w-[80%] ${msg.role === "user" ? "bg-[rgba(0,255,180,0.08)] border border-[rgba(0,255,180,0.15)]" : "bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.05)]"} rounded-lg p-3`}>
                {msg.image && (
                  <img src={`data:${msg.imageMediaType};base64,${msg.image}`} alt="Uploaded" className="max-w-xs rounded mb-2 border border-[rgba(0,255,180,0.2)]" />
                )}
                {msg.role === "assistant" ? (
                  <div className="text-[9px] text-[hsl(180,30%,75%)] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || (isStreaming && i === messages.length - 1 ? "▋" : "")) }} />
                ) : (
                  <div className="text-[9px] text-[hsl(180,50%,80%)]">{msg.content}</div>
                )}
                <div className="text-[6px] text-[hsl(220,20%,30%)] mt-1">{msg.timestamp.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-[rgba(0,255,180,0.15)] border border-[rgba(0,255,180,0.3)] flex items-center justify-center text-[hsl(168,100%,50%)] font-black text-[8px] flex-shrink-0 mt-0.5">U</div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Image preview */}
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2">
            <img src={pendingImage.preview} alt="preview" className="w-16 h-16 object-cover rounded border border-[rgba(0,255,180,0.3)]" />
            <div className="text-[8px] neon-green">Image ready to send</div>
            <button onClick={() => setPendingImage(null)} className="text-[8px] neon-red">✕ Remove</button>
          </div>
        )}

        {/* Input */}
        <div className="glass-card rounded-lg p-2 flex items-end gap-2">
          <input type="file" ref={fileRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-8 h-8 rounded flex items-center justify-center bg-[rgba(0,255,180,0.1)] border border-[rgba(0,255,180,0.2)] neon-green hover:bg-[rgba(0,255,180,0.2)] flex-shrink-0 text-sm">
            📎
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Indian markets, charts, options, strategies... (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 bg-transparent text-[9px] text-[hsl(180,40%,75%)] placeholder-[hsl(220,20%,30%)] focus:outline-none resize-none leading-relaxed"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isStreaming || (!input.trim() && !pendingImage)}
            className="px-3 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all flex-shrink-0 bg-[rgba(0,255,180,0.2)] neon-green border border-[rgba(0,255,180,0.4)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(0,255,180,0.3)]">
            {isStreaming ? "..." : "SEND ↵"}
          </button>
        </div>

        {/* More quick prompts */}
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {QUICK_PROMPTS.slice(5).map((p, i) => (
            <button key={i} onClick={() => sendMessage(p)}
              disabled={isStreaming}
              className="px-2 py-1 rounded text-[7px] glass-card text-[hsl(180,40%,60%)] hover:neon-green transition-all border border-[rgba(255,255,255,0.06)] disabled:opacity-40">
              {p.length > 40 ? p.substring(0, 38) + "…" : p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
