import { Router } from 'express';
import { validateRequest } from '../middleware/validationMiddleware';
import { MatchesQuerySchema } from '../validation/schemas';
import { getMatches } from '../controllers/matches.controller';

const router = Router();

router.get('/', validateRequest(MatchesQuerySchema, 'query'), getMatches);

export default router;
