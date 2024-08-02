export default defineEventHandler(async (event) => {
  const $storage = useStorage(`smile`)
  await $storage.setItem(`recruitment:service`, `anonymous`)
  await $storage.setItem(`recruitment:participant_id`, ``)
  await $storage.setItem(`recruitment:study_id`, ``)
  await $storage.setItem(`recruitment:task_id`, ``)

  return {}
})
