import { Router, Request, Response } from 'express';
import LiveMarketService from '@workspace/market-data';

const router = Router();
const liveService = new LiveMarketService();

/**
 * WebSocket endpoint for live data streaming
 */
router.ws('/stream', (ws: any, req: Request) => {
  console.log('[LIVE] Client connected to WebSocket');

  // Subscribe to live market data
  liveService.subscribe('market-data', (data: any) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  });

  ws.on('close', () => {
    console.log('[LIVE] Client disconnected');
  });

  ws.on('error', (error: any) => {
    console.error('[LIVE] WebSocket error:', error);
  });
});

/**
 * Get market status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = liveService.getMarketStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get live quote for symbol
 */
router.get('/quote/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const quote = liveService.getQuote(symbol);

    if (!quote) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    res.json({
      success: true,
      quote,
      timestamp: Date.now(),
      updateFrequency: '1 second',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all live quotes
 */
router.get('/quotes/all', (req: Request, res: Response) => {
  try {
    const quotes = liveService.getAllQuotes();
    res.json({
      success: true,
      totalSymbols: quotes.length,
      quotes,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get live candles for symbol
 */
router.get('/candles/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const candles = liveService.getCandles(symbol);

    if (candles.length === 0) {
      return res.status(404).json({ error: 'No candle data found' });
    }

    res.json({
      success: true,
      symbol,
      totalCandles: candles.length,
      candles: candles.slice(-100), // Last 100 candles
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get live option chain
 */
router.get('/option-chain/:index', (req: Request, res: Response) => {
  try {
    const { index } = req.params;
    const optionChain = liveService.getOptionChain(index);

    if (optionChain.length === 0) {
      return res.status(404).json({ error: 'Option chain not found' });
    }

    res.json({
      success: true,
      index,
      totalStrikes: optionChain.length,
      optionChain,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get trade signals for symbol
 */
router.get('/signals/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const signals = liveService.getTradeSignals(symbol);

    res.json({
      success: true,
      symbol,
      totalSignals: signals.length,
      signals: signals.slice(-20), // Last 20 signals
      latestSignal: signals.length > 0 ? signals[signals.length - 1] : null,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all trade signals
 */
router.get('/signals/all', (req: Request, res: Response) => {
  try {
    const signals = liveService.getAllTradeSignals();
    const buySignals = signals.filter(s => s.signal === 'BUY');
    const sellSignals = signals.filter(s => s.signal === 'SELL');

    res.json({
      success: true,
      totalSignals: signals.length,
      buySignals: buySignals.length,
      sellSignals: sellSignals.length,
      signals: signals.slice(-50), // Last 50 signals
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get double top/bottom alerts
 */
router.get('/alerts/double-patterns', (req: Request, res: Response) => {
  try {
    const alerts = liveService.getDoubleTopBottomAlerts();

    res.json({
      success: true,
      totalAlerts: alerts.length,
      alerts: alerts.slice(-20), // Last 20 alerts
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recent alerts
 */
router.get('/alerts/recent', (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const alerts = liveService.getRecentAlerts(parseInt(limit as string));

    res.json({
      success: true,
      totalAlerts: alerts.length,
      alerts,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get comprehensive live market data
 */
router.get('/market-data/all', (req: Request, res: Response) => {
  try {
    const quotes = liveService.getAllQuotes();
    const signals = liveService.getAllTradeSignals();
    const alerts = liveService.getRecentAlerts(20);
    const status = liveService.getMarketStatus();

    res.json({
      success: true,
      market: {
        ...status,
      },
      data: {
        quotes: quotes.slice(0, 50),
        signals: signals.slice(-50),
        alerts: alerts,
      },
      summary: {
        totalSymbols: quotes.length,
        totalSignals: signals.length,
        buySignals: signals.filter(s => s.signal === 'BUY').length,
        sellSignals: signals.filter(s => s.signal === 'SELL').length,
        totalAlerts: alerts.length,
      },
      timestamp: Date.now(),
      updateFrequency: '1 second',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
