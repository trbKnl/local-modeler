import { z } from 'zod'


// Parameters

export const ParametersSchema = z.object({
  values: z.array(z.number()),
  length: z.number(),
})

export type Parameters = z.infer<typeof ParametersSchema>


// Participant run tracker 

export const ParticipantRunTrackerSchema  = z.object({
  participantId: z.string(),
  hasUpdatedRunIds: z.array(z.string()),
  completed: z.boolean().default(false),
})

export type ParticipantRunTracker = z.infer<typeof ParticipantRunTrackerSchema>


// Run

const BaseRunSchema = z.object({
  id: z.string(),
  checkValue: z.string(),
});

// Client run

export const ClientRunSchema = BaseRunSchema.extend({
  parameters: ParametersSchema,
})

export type ClientRun = z.infer<typeof ClientRunSchema>


// Server Run

export const RunSchema = BaseRunSchema.extend({
  initialParameters: ParametersSchema,
  currentParameters: ParametersSchema,
  updatedBy: z.array(z.string()),
})

export type Run = z.infer<typeof RunSchema>
