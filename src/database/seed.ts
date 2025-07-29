import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type pl from "nodejs-polars";
import type { ZodObject } from "zod";
import type { ResolvedStimuli, ResolvedStimuliSource } from "../config";
import { logger } from "../utils/module";
import { type DrizzledSmileTable, toDrizzle } from "./drizzle";
import type { SmileTable } from "./types";

export async function seedStimuliTable(db: LibSQLDatabase, table: SmileTable, stimuli: ResolvedStimuli) {
  const { name, schema, sources } = stimuli;
  logger.info(`  Seeding stimuli for ${name}!`);
  const drizzleTable = toDrizzle(table);
  try {
    await Promise.all(
      sources.map(async (source) => await seedFromDataFrame(db, table.name, drizzleTable, source, schema))
    );
  } catch (error) {
    logger.error(`  Failed to load data: ${error.message}`);
  }
}

async function seedFromDataFrame(
  db: LibSQLDatabase,
  tableName: string,
  table: DrizzledSmileTable,
  source: ResolvedStimuliSource,
  schema: ZodObject
) {
  let df: pl.DataFrame;
  try {
    df = await source.load();
    logger.debug(`  Attempting to seed ${df.height} records into ${tableName}`);
  } catch (error) {
    logger.error(`  Failed to load ${source.basename}: ${error.message}`);
    return;
  }

  // biome-ignore lint/suspicious/noImplicitAnyLet: there's no type that i've found
  let records;
  try {
    // Convert DataFrame to JavaScript objects & validate against schema
    records = df.toRecords().map((record) => schema.parse(record));
  } catch (error) {
    logger.error(`  Failed to validate ${source.basename} against schema! ${error.message}`);
    return;
  }

  // Batch insert for better performance
  const batchSize = 100;
  let successCount = 0;

  for (let idx = 0; idx < records.length; idx += batchSize) {
    const batch = records.slice(idx, idx + batchSize);

    try {
      const insertions = await db.insert(table).values(batch).returning();
      successCount += insertions.length;
    } catch (error) {
      logger.error(`  Failed batch insert at ${idx}: ${error.message}`);
    }
  }

  switch (successCount) {
    case 0:
      logger.error(`  Failed to seed any records into ${tableName}!`);
      break;
    case records.length:
      logger.info(`  Successfully seeded all records into ${tableName}!`);
      break;
    default:
      logger.warn(`  Only seeded ${successCount}/${records.length} into ${tableName}...`);
      break;
  }
}

// Helper to create a test participant
export async function createTestParticipant(db: LibSQLDatabase, experimentId: string) {
  const participantId = `test-${Date.now()}`;

  await db.run(sql`
    INSERT INTO participants (id, experiment, platform, startedAt, status)
    VALUES (${participantId}, ${experimentId}, 'dev', ${new Date().toISOString()}, 'active')
  `);

  return participantId;
}

// Helper to create a test session
export async function createTestSession(db: LibSQLDatabase, participantId: string, experimentId: string) {
  const sessionId = `session-${Date.now()}`;

  await db.run(sql`
    INSERT INTO sessions (id, participant, experiment, platform, startedAt)
    VALUES (${sessionId}, ${participantId}, ${experimentId}, 'dev', ${new Date().toISOString()})
  `);

  return sessionId;
}
