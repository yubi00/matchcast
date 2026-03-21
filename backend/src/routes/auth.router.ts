import { Router } from 'express';
import { issueTokens, refreshTokens } from '../controllers/auth.controller';

const router = Router();

router.post('/token', issueTokens);
router.post('/refresh', refreshTokens);

export default router;
