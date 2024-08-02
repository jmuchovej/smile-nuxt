import { z } from "zod";

const schema = z.object({
  CITIZEN_ID: z.string(),
  CITIZEN_STUDY_ID: z.string(),
  CITIZEN_SESSION_ID: z.string(),
})

export default defineEventHandler(async (event) => {
  const {
    CITIZEN_ID, CITIZEN_STUDY_ID, CITIZEN_SESSION_ID,
  } = await getValidatedQuery(event, schema.parse)

  const $storage = useStorage(`smile`)
  await $storage.setItem(`recruitment:service`, `citizen-science`)
  await $storage.setItem(`recruitment:participant_id`, CITIZEN_ID)
  await $storage.setItem(`recruitment:study_id`, CITIZEN_STUDY_ID)
  await $storage.setItem(`recruitment:task_id`, CITIZEN_SESSION_ID)

  return {}
})
