export default defineEventHandler(async (event) => {
  const $storage = useStorage(`smile`);
  await $storage.setItem(`consented`, true);

  return {};
});
