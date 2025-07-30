import { z } from "zod";

// Participants table schema
export const participantSchema = z
  .object({
    id: z.string().primaryKey(),
    experiment: z.string().index(),
    platform: z.string().index(),
    startedAt: z.date().index(),
    completedAt: z.date().optional(),
    status: z.enum(["active", "completed", "withdrawn"]).default("active").index(),
    metadata: z.object({}).optional(),
  })
  .meta({ tableName: "participants" });

// Sessions table schema
export const sessionSchema = z
  .object({
    id: z.string().primaryKey(),
    participant: z.string().index(),
    platform: z.string().index(),
    experiment: z.string().index(),
    condition: z.string().optional(),
    startedAt: z.date().index(),
    completedAt: z.date().optional(),
    timezone: z.string().optional(),
    metadata: z.object({}),
  })
  .meta({ tableName: "sessions" });

// Blocks table schema
export const blockSchema = z
  .object({
    id: z.string().primaryKey(),
    sessionId: z.string().index(),
    blockNumber: z.number().index(),
    blockType: z.string().optional(),
    startedAt: z.date().index(),
    completedAt: z.date().optional(),
  })
  .meta({ tableName: "blocks" });

// Trials table schema
export const trialSchema = z
  .object({
    id: z.string().primaryKey(),
    sessionID: z.string().index(),
    blockID: z.string().optional().index(),
    trialNumber: z.number().index(),
    stimuliID: z.string().index(),
    stimuliTable: z.string().index(),
    presentedAt: z.date().index(),
    respondedAt: z.date().optional(),
    response: z.object({}).optional(),
    reactionTime: z.number().optional(),
    metadata: z.object({}).optional(),
  })
  .meta({ tableName: "trials" });
