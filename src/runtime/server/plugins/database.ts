import { type DrizzleDatabase, drizzle } from "db0/integrations/drizzle";
import type { mysqlTable } from "drizzle-orm/mysql-core";
import type { pgTable } from "drizzle-orm/pg-core";
import type { sqliteTable } from "drizzle-orm/sqlite-core";
import { defineNitroPlugin, type NitroApp, useDatabase } from "#nitro";
import { tablesSQL } from "#smile:sql/tables";
import { seeds } from "#smile:sql/seed";
import { useLogger } from "#smile/internal";

type DrizzleTable = ReturnType<typeof sqliteTable | typeof pgTable | typeof mysqlTable>;

export default defineNitroPlugin(async (_nitroApp: NitroApp) => {
  const logger = useLogger("runtime", "server", "database");
  logger.debug("Starting nitro plugin...");

  const db = useDatabase("smile");
  const dz = drizzle(db);

  await db.sql`pragma defer_foreign_keys=true;`;

  logger.info(`Creating tables!`);
  for await (const statement of tablesSQL) {
    // console.log(`Executing: ${statement.split("\n")[0]}...`);
    await db.exec(statement);
  }

  logger.info(`Seeding stimuli databases!`);
  for await (const [key, value] of Object.entries(seeds)) {
    const { table, seed } = value;
    await seedFromDataFrame(dz, key, table, seed);
  }
});

type DFRecord = {
  [x: string]: string | number | bigint | boolean | null;
};
async function seedFromDataFrame(
  dz: DrizzleDatabase,
  tableName: string,
  table: DrizzleTable,
  records: DFRecord[],
  batchSize = 100
) {
  const logger = useLogger("runtime", "server", "database", "seed");

  let successCount = 0;
  for (let idx = 0; idx < records.length; idx += batchSize) {
    const batch = records.slice(idx, idx + batchSize);

    try {
      const insertions = await dz.insert(table).values(batch).returning();
      successCount += insertions.length;
    } catch (error) {
      logger.error(`Failed to insert at ${idx}: ${error.message}`);
    }
  }

  switch (successCount) {
    case 0:
      logger.error(`Failed to seed any records into ${tableName}!`);
      break;
    case records.length:
      logger.info(`Successfully seeded all records into ${tableName}!`);
      break;
    default:
      logger.warn(`Only seeded ${successCount}/${records.length} into ${tableName}...`);
      break;
  }
}
