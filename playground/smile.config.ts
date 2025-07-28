import { defineStimuli, defineExperiment, defineSmileConfig } from '@smile/nuxt'
import { z } from "zod";

const stroopStimuli = defineStimuli({
  name: "stroop",
  source: "stroop.csv",
  schema: z.object({
    'index': z.number().trialID(),
    'word': z.string(),
    'color': z.enum(['red', 'green', 'blue']),
    'type': z.enum(['unrelated', 'congruent', 'incongruent']),
    'correct': z.enum(['R', 'G', 'B']),
  }),
})

const stroop = defineExperiment({
  compensation: '$1.00',
  duration: '4 minutes',

  stimuli: stroopStimuli,

  services: [
    { type: "prolific", code: "C7W0RVYD" }
  ],

  allowRepeats: false,
  autoSave: true,

  schema: z.object({
    'index': z.number().trialID(),
    'word': z.string(),
    'color': z.enum(['red', 'green', 'blue']),
    'type': z.enum(['unrelated', 'congruent', 'incongruent']),
    'correct': z.enum(['R', 'G', 'B']),
  }),
})

const gonogoStimuli = defineStimuli({
  name: "gonogo",
  source: 'gonogo/*.jsonl',
  schema: z.object({
    'index': z.number().trialID(),
    'block': z.string().blockID(),
    'stimulus': z.string(),
    'RorP': z.enum(['R', 'P']),
    'GoNoGo': z.enum(['Go', 'NoGo']),
    'position': z.number().min(1).max(4),
    'correct_key': z.string().nullable(),
    'go_letter': z.enum(['R', 'P']),
  })
});

const gonogo = defineExperiment({
  compensation: '$1.00',
  duration: '4 minutes',

  services: [{ type: "prolific", code: "C7W0RVYD" }],

  allowRepeats: false,
  autoSave: true,

  stimuli: gonogoStimuli,

  schema: z.object({
    'index': z.number().trialID(),
    'block': z.string().blockID(),
    'stimulus': z.string(),
    'RorP': z.enum(['R', 'P']),
    'GoNoGo': z.enum(['Go', 'NoGo']),
    'position': z.number().min(1).max(4),
    'correct_key': z.string().nullable(),
    'go_letter': z.enum(['R', 'P']),
  }),
})

export default defineSmileConfig({
  activeExperiment: 'stroop',
  experiments: {
    stroop,
    gonogo,
  },
})
