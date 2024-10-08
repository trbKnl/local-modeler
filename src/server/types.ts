import { z } from 'zod'

// Run Schema
// Type that contains the model that is send to the client

export const ClientRunSchema = z.object({
  id: z.string().uuid(),
  checkValue: z.string().uuid(),
  model: z.string(),
});

export type ClientRun = z.infer<typeof ClientRunSchema>


// Query parameters
// Used for checking the Query parameters from the client

export const QueryParameterSchema = z.object({
  studyId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/),
  participantId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/),
});

export type QueryParameters = z.infer<typeof QueryParameterSchema>;

// Study Configuration
// Type for checking the study configuration
export const ConfigSchema = z.object({
  id: z.string(),
  nRuns: z.number().int().positive(),
})

export type Config = z.infer<typeof ConfigSchema>
