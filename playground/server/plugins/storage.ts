import fsDriver from "unstorage/drivers/fs";

export default defineNitroPlugin(() => {
  const storage = useStorage(`smile`)

  const driver = fsDriver({ base: "./storage" })

  storage.mount(`/workspace/local`, driver)
})
