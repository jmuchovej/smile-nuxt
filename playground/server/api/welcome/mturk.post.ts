import { z } from "zod";

const schema = z.object({
  workerId: z.string(),
  assignmentId: z.string(),
  hitId: z.string(),
})

export default defineEventHandler(async (event) => {
  const { workerId, assignmentId, hitId } = await getValidatedQuery(event, schema.parse)

  if (assignmentId == `ASSIGNMENT_ID_NOT_AVAILABLE`) {
    // setResponseStatus(event, 401)
  }

  const $storage = useStorage(`smile`)
  await $storage.setItem(`recruitment:service`, `mturk`)
  await $storage.setItem(`recruitment:participant_id`, workerId)
  await $storage.setItem(`recruitment:study_id`, assignmentId)
  await $storage.setItem(`recruitment:task_id`, hitId)

  return {}
})
