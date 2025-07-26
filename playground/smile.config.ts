import { defineExperiment, defineSmileConfig } from '@smile/nuxt'
import { z } from "zod";

const stroop = defineExperiment({
  compensation: '$1.00',
  duration: '4 minutes',

  source: "stimuli.csv",

  services: [
    { type: "prolific", code: "C7W0RVYD" }
  ],

  allowRepeats: false,
  autoSave: true,

  schema: z.object({
    'index': z.number(),
    'word': z.string(),
    'color': z.enum(['red', 'green', 'blue']),
    'type': z.enum(['unrelated', 'congruent', 'incongruent']),
    'correct': z.enum(['R', 'G', 'B']),
  }),
})

const gonogo = defineExperiment({
  compensation: '$1.00',
  duration: '4 minutes',

  source: 'stimuli/*.jsonl',

  services: [{ type: "prolific", code: "C7W0RVYD" }],

  allowRepeats: false,
  autoSave: true,

  schema: z.object({
    'index': z.number(),
    'stimulus': z.string(),
    'RorP': z.enum(['R', 'P']),
    'GoNoGo': z.enum(['Go', 'NoGo']),
    'position': z.number().min(1).max(4),
    'correct_key': z.string().nullable(),
    'go_letter': z.enum(['R', 'G']),
  }),
})

export default defineSmileConfig({
  activeExperiment: 'stroop',
  experiments: {
    stroop,
    gonogo,
  },
})
