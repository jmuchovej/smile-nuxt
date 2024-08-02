import { z } from "zod";

const schema = z.object({
  PROLIFIC_PID: z.string(),
  STUDY_ID: z.string(),
  SESSION_ID: z.string(),
})

export default defineEventHandler(async (event) => {
  const {
    PROLIFIC_PID, STUDY_ID, SESSION_ID
  }= await getValidatedQuery(event, schema.parse)

  const $storage = useStorage(`smile`)
  await $storage.setItem(`recruitment:service`, `prolific`)
  await $storage.setItem(`recruitment:participant_id`, PROLIFIC_PID)
  await $storage.setItem(`recruitment:study_id`, STUDY_ID)
  await $storage.setItem(`recruitment:task_id`, SESSION_ID)

  return {}
})
