import { z } from 'zod';

export const MatchesQuerySchema = z.object({
  limit:       z.coerce.number().int().min(1).max(50).default(20),
  competition: z.string().max(10).optional(),
  dateFrom:    z.string().date().optional(),
  dateTo:      z.string().date().optional(),
});

export const AnalysisParamsSchema = z.object({
  matchId: z
    .string()
    .min(1)
    .max(20)
    .regex(/^\d+$/, 'matchId must be numeric'),
});

export type MatchesQuery = z.infer<typeof MatchesQuerySchema>;
export type AnalysisParams = z.infer<typeof AnalysisParamsSchema>;
