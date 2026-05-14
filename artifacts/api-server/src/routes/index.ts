import { Router } from 'express';
import health from './health';
import marketData from './marketData';
import ai from './ai';
import stockAnalysis from './stockAnalysis';
import liveMarket from './liveMarket';

const router = Router();

router.use('/health', health);
router.use('/market', marketData);
router.use('/ai', ai);
router.use('/stock-analysis', stockAnalysis);
router.use('/live', liveMarket);

export default router;
