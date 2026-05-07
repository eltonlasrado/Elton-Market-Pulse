import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import newsRouter from "./news";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketRouter);
router.use(newsRouter);
router.use(aiRouter);

export default router;
