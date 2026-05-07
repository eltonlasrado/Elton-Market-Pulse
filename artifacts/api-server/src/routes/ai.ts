import { Router } from "express";
import { logger } from "../lib/logger";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || "dummy";
    anthropicClient = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are Aladdin, an expert AI trading assistant specializing in Indian stock markets (NSE/BSE). You have deep expertise in:

- Technical Analysis: Candlestick patterns, RSI, MACD, Bollinger Bands, EMA/SMA, VWAP, support/resistance
- Options & Derivatives: F&O strategies, option chain analysis, Greeks (Delta, Gamma, Theta, Vega), PCR, OI analysis
- Market Microstructure: FII/DII flows, block deals, institutional activity, market breadth
- Fundamental Analysis: Quarterly results, valuations, sector analysis, macro factors
- Risk Management: Position sizing, stop-loss strategies, portfolio construction
- Market Regulations: SEBI rules, F&O lot sizes, margin requirements, circuit breakers

When analyzing charts or images, provide detailed technical analysis including:
- Pattern identification
- Key levels (support, resistance, breakout points)
- Indicator readings
- Trading opportunities with entry, stop-loss, and targets
- Risk/reward assessment

Always be specific, use actual price levels when visible, and provide actionable insights. Format responses clearly with headings and bullet points for readability.`;

router.post("/ai/chat", async (req, res) => {
  try {
    const { message, image, imageMediaType, conversationHistory } = req.body;

    if (!message && !image) {
      return res.status(400).json({ success: false, error: "Message or image required" });
    }

    const client = getClient();

    // Build user content
    const userContent: any[] = [];

    if (image) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType || "image/jpeg",
          data: image,
        },
      });
    }

    if (message) {
      userContent.push({ type: "text", text: message });
    }

    // Build message history
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : msg.content,
        });
      }
    }

    messages.push({ role: "user", content: userContent });

    // Set up SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    });

    let fullResponse = "";

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const chunk = event.delta.text;
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullContent: fullResponse })}\n\n`);
    res.end();
  } catch (err: any) {
    logger.error({ err }, "AI chat failed");
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "AI service unavailable" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
