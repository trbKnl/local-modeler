import { z } from 'zod'


// SERVER

export const ParametersSchema = z.object({
  values: z.array(z.number()),
  length: z.number(),
})

export type Parameters = z.infer<typeof ParametersSchema>

export const RunSchema = z.object({
  id: z.string(),
  initialParameters: ParametersSchema,
  currentParameters: ParametersSchema,
  updatedBy: z.array(z.string()),
  checkValue: z.string(),
})

export type Run = z.infer<typeof RunSchema>

export const ParticipantRunTrackerSchema  = z.object({
  participantId: z.string(),
  hasUpdatedRunIds: z.array(z.string()),
  completed: z.boolean().default(false),
})

export type ParticipantRunTracker = z.infer<typeof ParticipantRunTrackerSchema>


// CLIENT

export const ClientRunSchema = z.object({
  id: z.string(),
  parameters: ParametersSchema,
  checkValue: z.string(),
})

export type ClientRun = z.infer<typeof ClientRunSchema>

