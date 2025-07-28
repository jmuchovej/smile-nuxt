import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import type {
	ResolvedExperiment,
	ResolvedStimuli,
	ResolvedStimuliSource,
} from "../config";
import { logger } from "../utils/module";
import type { ZodObject } from "zod";
import type { SmileTable } from "./types";
import { toDrizzle, type DrizzledSmileTable } from "./drizzle";
import type pl from "nodejs-polars";

interface SeedOptions {
	databasePath: string;
	experiments: ResolvedExperiment[];
	rootDir: string;
}

export async function seedDatabase(options: SeedOptions) {
	const { databasePath, experiments, rootDir } = options;

	logger.info("Starting database seeding...");

	const db = drizzle(createClient({ url: `file:${databasePath}` }));

	await Promise.all(
		experiments.map(async (experiment) =>
			seedExperiment(db, experiment, rootDir),
		),
	);

	logger.info("Database seeding completed!");
}

async function seedExperiment(
	db: LibSQLDatabase,
	experiment: ResolvedExperiment,
	rootDir: string,
) {
	const { version, stimuli } = experiment;

	logger.info(`Seeding experiment stimuli: ${version}`);

	const { sources, tableName, schema } = stimuli;
	try {
		await Promise.all(
			sources.map(
				async (source) =>
					await seedFromDataFrame(db, tableName, source, schema),
			),
		);
	} catch (error) {
		logger.error(`Failed to load data: ${error.message}`);
	}
}

export async function seedStimuliTable(
	db: LibSQLDatabase,
	table: SmileTable,
	stimuli: ResolvedStimuli,
) {
	const { name, schema, sources } = stimuli;
	logger.info(`  Seeding stimuli for ${name}!`);
	const drizzleTable = toDrizzle(table);
	try {
		await Promise.all(
			sources.map(
				async (source) =>
					await seedFromDataFrame(db, table.name, drizzleTable, source, schema),
			),
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
	schema: ZodObject,
) {
	let df: pl.DataFrame;
	try {
		df = await source.load();
		logger.debug(`  Attempting to seed ${df.height} records into ${tableName}`);
	} catch (error) {
		logger.error(`  Failed to load ${source.basename}: ${error.message}`);
		return;
	}

	let records;
	try {
		// Convert DataFrame to JavaScript objects & validate against schema
		records = df.toRecords().map((record) => schema.parse(record));
	} catch (error) {
		logger.error(
			`  Failed to validate ${source.basename} against schema! ${error.message}`,
		);
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
			logger.warn(
				`  Only seeded ${successCount}/${records.length} into ${tableName}...`,
			);
			break;
	}
}

// Helper to create a test participant
export async function createTestParticipant(db: any, experimentId: string) {
	const participantId = `test-${Date.now()}`;

	await db.run(sql`
    INSERT INTO participants (id, experiment, platform, startedAt, status)
    VALUES (${participantId}, ${experimentId}, 'dev', ${new Date().toISOString()}, 'active')
  `);

	return participantId;
}

// Helper to create a test session
export async function createTestSession(
	db: any,
	participantId: string,
	experimentId: string,
) {
	const sessionId = `session-${Date.now()}`;

	await db.run(sql`
    INSERT INTO sessions (id, participant, experiment, platform, startedAt)
    VALUES (${sessionId}, ${participantId}, ${experimentId}, 'dev', ${new Date().toISOString()})
  `);

	return sessionId;
}
