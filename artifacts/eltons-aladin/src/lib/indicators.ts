export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = data[0] ?? 0;
  for (let i = 0; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    emas.push(parseFloat(ema.toFixed(2)));
  }
  return emas;
}

export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);
  const rsi: number[] = new Array(period).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(0, diff);
    const loss = Math.max(0, -diff);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)));
  }
  return rsi;
}

export function calcMACD(closes: number[]): { macd: number[]; signal: number[]; hist: number[] } {
  if (closes.length < 27) {
    const z = closes.map(() => 0);
    return { macd: z, signal: z, hist: z };
  }
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = ema12.map((v, i) => parseFloat((v - ema26[i]).toFixed(3)));
  const signal = calcEMA(macd, 9);
  const hist = macd.map((v, i) => parseFloat((v - signal[i]).toFixed(3)));
  return { macd, signal, hist };
}

export function calcBB(closes: number[], period = 20, mult = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = [], middle: number[] = [], lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(closes[i]); middle.push(closes[i]); lower.push(closes[i]);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(slice.reduce((a, b) => a + (b - sma) ** 2, 0) / period);
    upper.push(parseFloat((sma + mult * stdDev).toFixed(2)));
    middle.push(parseFloat(sma.toFixed(2)));
    lower.push(parseFloat((sma - mult * stdDev).toFixed(2)));
  }
  return { upper, middle, lower };
}

export function calcVWAP(candles: Candle[]): number[] {
  let cumTPV = 0, cumVol = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * (c.volume || 1);
    cumVol += (c.volume || 1);
    return parseFloat((cumTPV / cumVol).toFixed(2));
  });
}

export interface IndicatorSnapshot {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  vwap: number;
  ema20: number;
  ema50: number;
  ema200: number;
  currentPrice: number;
  priceChgPct: number;
}

export interface Analysis {
  signal: "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
  confidence: number;
  summary: string;
  reasons: string[];
  rsiZone: string;
  macdSignalText: string;
  bbSignalText: string;
  trendText: string;
  vwapText: string;
}

export function analyzeSignal(snap: IndicatorSnapshot): Analysis {
  const reasons: string[] = [];
  let bullishCount = 0, bearishCount = 0;

  const rsiZone = snap.rsi > 70 ? "OVERBOUGHT" : snap.rsi < 30 ? "OVERSOLD" : snap.rsi > 55 ? "BULLISH" : snap.rsi < 45 ? "BEARISH" : "NEUTRAL";
  if (snap.rsi > 70) { reasons.push(`RSI ${snap.rsi.toFixed(1)} — overbought, potential reversal`); bearishCount++; }
  else if (snap.rsi < 30) { reasons.push(`RSI ${snap.rsi.toFixed(1)} — oversold, potential bounce`); bullishCount += 2; }
  else if (snap.rsi > 55) { reasons.push(`RSI ${snap.rsi.toFixed(1)} — bullish momentum zone`); bullishCount++; }
  else if (snap.rsi < 45) { reasons.push(`RSI ${snap.rsi.toFixed(1)} — bearish zone`); bearishCount++; }
  else { reasons.push(`RSI ${snap.rsi.toFixed(1)} — neutral, no clear momentum`); }

  const macdBull = snap.macdHist > 0 && snap.macd > snap.macdSignal;
  const macdSignalText = macdBull ? "MACD histogram positive — bullish crossover" : "MACD histogram negative — bearish crossover";
  if (macdBull) { reasons.push(macdSignalText); bullishCount++; } else { reasons.push(macdSignalText); bearishCount++; }

  const p = snap.currentPrice;
  const bbWidth = snap.bbUpper - snap.bbLower;
  const bbPos = bbWidth > 0 ? ((p - snap.bbLower) / bbWidth) * 100 : 50;
  const bbSignalText = bbPos > 80 ? `Price near BB upper band (${bbPos.toFixed(0)}%) — overbought` : bbPos < 20 ? `Price near BB lower band (${bbPos.toFixed(0)}%) — oversold bounce likely` : `Price within Bollinger Bands (${bbPos.toFixed(0)}% of band)`;
  if (bbPos > 80) bearishCount++; else if (bbPos < 20) bullishCount++; else bullishCount += 0.5;
  reasons.push(bbSignalText);

  const aboveVWAP = p > snap.vwap;
  const vwapText = aboveVWAP ? `Price above VWAP (${snap.vwap.toFixed(2)}) — institutional buy zone` : `Price below VWAP (${snap.vwap.toFixed(2)}) — selling pressure`;
  if (aboveVWAP) bullishCount++; else bearishCount++;
  reasons.push(vwapText);

  const aboveEMA20 = p > snap.ema20;
  const aboveEMA50 = p > snap.ema50;
  const trendText = aboveEMA20 && aboveEMA50 ? "Price above EMA20 & EMA50 — uptrend confirmed" : !aboveEMA20 && !aboveEMA50 ? "Price below EMA20 & EMA50 — downtrend" : aboveEMA20 ? "Price above EMA20 but below EMA50 — short-term recovery" : "Price below EMA20 but above EMA50 — pullback in uptrend";
  if (aboveEMA20 && aboveEMA50) bullishCount += 2; else if (!aboveEMA20 && !aboveEMA50) bearishCount += 2; else bullishCount++;
  reasons.push(trendText);

  const total = bullishCount + bearishCount;
  const bullRatio = total > 0 ? bullishCount / total : 0.5;
  const confidence = Math.round(40 + bullRatio * 45);

  let signal: Analysis["signal"];
  if (bullRatio >= 0.8) signal = "STRONG BUY";
  else if (bullRatio >= 0.6) signal = "BUY";
  else if (bullRatio <= 0.2) signal = "STRONG SELL";
  else if (bullRatio <= 0.4) signal = "SELL";
  else signal = "NEUTRAL";

  const summary = signal === "STRONG BUY" ? `Strong bullish setup: ${bullishCount} bullish signals vs ${bearishCount} bearish. Consider long positions with tight stop.`
    : signal === "BUY" ? `Bullish bias: indicators favour upside. Enter on confirmation with defined risk.`
    : signal === "STRONG SELL" ? `Strong bearish setup: ${bearishCount} bearish signals. Consider shorts or exit longs.`
    : signal === "SELL" ? `Bearish bias: caution advised. Reduce long exposure or hedge.`
    : `Mixed signals. Wait for confirmation before initiating positions. Market in consolidation.`;

  return { signal, confidence, summary, reasons, rsiZone, macdSignalText, bbSignalText, trendText, vwapText };
}
