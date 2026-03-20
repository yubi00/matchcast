import { Router } from 'express';
import { validateRequest } from '../middleware/validationMiddleware';
import { AnalysisParamsSchema } from '../validation/schemas';
import { getAnalysis } from '../controllers/analysis.controller';

const router = Router();

router.get('/:matchId', validateRequest(AnalysisParamsSchema, 'params'), getAnalysis);

export default router;
