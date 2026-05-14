export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSignal {
  type: 'DOUBLE_TOP' | 'DOUBLE_BOTTOM' | 'SUPPORT' | 'RESISTANCE';
  price: number;
  timestamp: Date;
  strength: number;
  analysis: string;
}

export class TechnicalAnalyzer {
  static detectDoubleTop(candles: OHLCV[], tolerance = 0.005): TechnicalSignal | null {
    if (candles.length < 5) return null;

    const recent = candles.slice(-5);
    const peaks = recent
      .map((c, i) => ({ price: c.high, index: i, time: c.timestamp }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 2);

    if (peaks.length === 2) {
      const priceDiff = Math.abs(peaks[0].price - peaks[1].price);
      const tolerance_price = peaks[0].price * tolerance;

      if (priceDiff <= tolerance_price) {
        return {
          type: 'DOUBLE_TOP',
          price: peaks[0].price,
          timestamp: peaks[peaks[0].index > peaks[1].index ? 0 : 1].time,
          strength: 100 - (priceDiff / tolerance_price) * 100,
          analysis: `Double Top detected at ₹${peaks[0].price.toFixed(2)}. Potential bearish reversal.`,
        };
      }
    }
    return null;
  }

  static detectDoubleBottom(candles: OHLCV[], tolerance = 0.005): TechnicalSignal | null {
    if (candles.length < 5) return null;

    const recent = candles.slice(-5);
    const troughs = recent
      .map((c, i) => ({ price: c.low, index: i, time: c.timestamp }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 2);

    if (troughs.length === 2) {
      const priceDiff = Math.abs(troughs[0].price - troughs[1].price);
      const tolerance_price = troughs[0].price * tolerance;

      if (priceDiff <= tolerance_price) {
        return {
          type: 'DOUBLE_BOTTOM',
          price: troughs[0].price,
          timestamp: troughs[troughs[0].index > troughs[1].index ? 0 : 1].time,
          strength: 100 - (priceDiff / tolerance_price) * 100,
          analysis: `Double Bottom detected at ₹${troughs[0].price.toFixed(2)}. Potential bullish reversal.`,
        };
      }
    }
    return null;
  }

  static calculateVWAP(candles: OHLCV[]): number {
    let cumPV = 0;
    let cumVol = 0;

    for (const c of candles) {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumPV += typicalPrice * c.volume;
      cumVol += c.volume;
    }

    return cumVol > 0 ? cumPV / cumVol : 0;
  }

  static calculateRSI(closes: number[], period = 14): number {
    if (closes.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[closes.length - i] - closes[closes.length - i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;

    return 100 - 100 / (1 + rs);
  }

  static calculateMACD(closes: number[]) {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([macd], 9);

    return { macd, signal, histogram: macd - signal };
  }

  static calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];

    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }

    return ema;
  }

  static calculateBollingerBands(closes: number[], period = 20, stdDev = 2) {
    const sma = closes.slice(-period).reduce((a, b) => a + b) / period;
    const variance =
      closes
        .slice(-period)
        .reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
      upper: sma + std * stdDev,
      middle: sma,
      lower: sma - std * stdDev,
    };
  }
}

export default TechnicalAnalyzer;
