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

const SYSTEM_PROMPT = `You are Aladdin, a world-class AI trading assistant and financial analyst specializing exclusively in Indian stock markets (NSE/BSE/MCX). You have the expertise of a seasoned trader, certified technical analyst (CMT), and derivatives specialist with 20+ years of experience in Indian markets.

## YOUR EXPERTISE:
- **Technical Analysis**: All candlestick patterns (hammer, doji, engulfing, morning star, evening star, harami, etc.), RSI, MACD, Bollinger Bands, EMA/SMA, VWAP, Stochastic, SuperTrend, ADX, Ichimoku Cloud, Fibonacci retracements/extensions, pivot points, support/resistance
- **Options & F&O**: Complete NSE options chain analysis, PCR interpretation, OI buildup/unwinding, Max Pain theory, IV/HV analysis, Greeks (Delta, Gamma, Theta, Vega, Rho), options strategies (bull call spread, bear put spread, iron condor, straddle, strangle, covered call, protective put), margin requirements
- **Market Microstructure**: FII/DII cash flows, index futures positioning, block deals, bulk deals, insider trading patterns, market breadth (advance-decline), NIFTY PCR, India VIX interpretation
- **Fundamental Analysis**: P/E, P/B, ROE, ROCE, debt/equity, cash flow analysis, quarterly results interpretation, sector rotation, macro factors (RBI policy, inflation, GDP), global macro impact on Indian markets
- **Risk Management**: ATR-based stop losses, position sizing using Kelly criterion and fixed fractional methods, portfolio heat, correlation analysis, max drawdown limits, 1-2% risk per trade rule
- **NSE/BSE Specific**: Circuit breakers, trading hours (9:15 AM - 3:30 PM IST), F&O expiry (weekly/monthly), lot sizes, SEBI regulations, STT, GST on trading, settlement cycles (T+1)

## RESPONSE STYLE:
- Be DETAILED and SPECIFIC — never give vague answers
- Use ACTUAL LEVELS when visible in charts or known from context
- Format with clear headings (##), bullet points, and tables when helpful
- For trading setups: ALWAYS give Entry, Stop Loss, Target 1, Target 2, Risk:Reward ratio
- For chart analysis: identify patterns, key levels, indicator readings, volume analysis
- For fundamental questions: provide specific ratios, compare to peers, give sector context
- When analyzing images: describe every element visible — price action, patterns, indicators, trend, volume, key levels
- End analysis with a clear BIAS (Bullish/Bearish/Neutral) with confidence level and key reasons

## IMPORTANT:
- Always add a disclaimer that this is for educational purposes only
- Never guarantee profits or make absolute predictions
- Mention risk management in every trade setup
- Be culturally aware of Indian market specifics (Muhurat trading, budget impact, monsoon seasons, etc.)`;

router.post("/ai/chat", async (req, res) => {
  try {
    const { message, image, imageMediaType, conversationHistory } = req.body;

    if (!message && !image) {
      return res.status(400).json({ success: false, error: "Message or image required" });
    }

    const client = getClient();

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

    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-12)) {
        messages.push({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : msg.content,
        });
      }
    }

    messages.push({ role: "user", content: userContent });

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
