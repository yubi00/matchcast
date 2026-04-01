import { Router } from 'express';
import { validateRequest } from '../middleware/validationMiddleware';
import { AnalysisParamsSchema } from '../validation/schemas';
import { analysisLimiter } from '../middleware/rateLimiter';
import { getAnalysis } from '../controllers/analysis.controller';

const router = Router();

router.get('/:matchId', analysisLimiter, validateRequest(AnalysisParamsSchema, 'params'), getAnalysis);

export default router;
