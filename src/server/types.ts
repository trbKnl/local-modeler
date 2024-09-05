import { z } from 'zod'


// Participant run tracker 

export const ParticipantRunTrackerSchema  = z.object({
  participantId: z.string(),
  hasUpdatedRunIds: z.array(z.string()),
})

export type ParticipantRunTracker = z.infer<typeof ParticipantRunTrackerSchema>


// Run

const BaseRunSchema = z.object({
  id: z.string(),
  checkValue: z.string(),
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
