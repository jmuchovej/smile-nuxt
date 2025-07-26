import { z } from "zod"

const BaseServiceSchema = z.object({
  url: z.url(),
  code: z.string(),
});

const ProlificSchema = z.object({
  ...BaseServiceSchema.omit({ url: true }).shape,
  url: z.url().default("https://app.prolific.com/submissions/complete?cc=").optional(),
  type: z.literal('prolific'),
});

const MTurkSchema = z.object({
  ...BaseServiceSchema.omit({ url: true }).shape,
  url: z.url().default("https://www.mturk.com/mturk/externalSubmit").optional(),
  type: z.literal('mturk'),
});

const CitizenScienceSchema = z.object({
  ...BaseServiceSchema.shape,
  type: z.literal('citizen-science'),
});

const SONASchema = z.object({
  ...BaseServiceSchema.shape,
  type: z.literal('sona'),
});

export const ExperimentServiceSchema = z.discriminatedUnion("type", [
  ProlificSchema,
  MTurkSchema,
  CitizenScienceSchema,
  SONASchema,
])

export type ExperimentService = z.infer<typeof ExperimentServiceSchema>;
export type Prolific = z.infer<typeof ProlificSchema>;
export type MTurk = z.infer<typeof MTurkSchema>;
export type CitizenScience = z.infer<typeof CitizenScienceSchema>;
export type SONA = z.infer<typeof SONASchema>;
