import { z } from 'zod'

// Query parameters

export const ClientRunSchema = z.object({
  id: z.string().uuid(),
  checkValue: z.string().uuid(),
  model: z.string(),
});

export type ClientRun = z.infer<typeof ClientRunSchema>


// Query parameters

export const QueryParameterSchema = z.object({
  studyId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/),
  participantId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/),
});

export type QueryParameters = z.infer<typeof QueryParameterSchema>;
