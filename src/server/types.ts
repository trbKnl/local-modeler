import { z } from 'zod'

// Participant run tracker 

export const ParticipantTrackerSchema  = z.object({
  participantId: z.string(),
  studyId: z.string(),
  hasUpdatedRunIds: z.array(z.string()),
})

export type ParticipantTracker = z.infer<typeof ParticipantTrackerSchema>


// Run

const BaseRunSchema = z.object({
  id: z.string().uuid(),
  checkValue: z.string().uuid(),
  model: z.string(),
});


// Client run

export const ClientRunSchema = BaseRunSchema
export type ClientRun = z.infer<typeof ClientRunSchema>


// Server Run

export const RunSchema = BaseRunSchema.extend({
  updatedBy: z.array(z.string()),
})

export type Run = z.infer<typeof RunSchema>

// Configuration

export const ConfigSchema = z.object({
  study: z.object({
    nruns: z.number().int().positive(),
  }),
  nstudies: z.number().int()
})


export type Config = z.infer<typeof ConfigSchema>


// Query parameters

export const QueryParameterSchema = z.object({
  studyId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/),
  participantId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/),
});

export type QueryParameters = z.infer<typeof QueryParameterSchema>;
