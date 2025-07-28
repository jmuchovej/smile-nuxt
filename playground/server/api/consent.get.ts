export default defineEventHandler(async (event) => {
  const $storage = useStorage(`smile`);
  return await $storage.getItem(`consented`);
});
