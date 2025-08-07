import { z } from "zod";

// Core column types that Smile supports
export const columnTypeSchema = z.enum(["text", "number", "boolean", "date", "json"]);

export const columnConstraintsSchema = z.object({
  primaryKey: z.boolean().optional(),
  unique: z.boolean().optional(),
  index: z.boolean().optional(),
  optional: z.boolean().optional(),
  trialID: z.boolean().optional(),
  blockID: z.boolean().optional(),
  conditionID: z.boolean().optional(),
});

export const columnSchema = z.object({
  type: columnTypeSchema,
  constraints: columnConstraintsSchema,
});

export const compositeKeysSchema = z.object({
  primary: z.array(z.string()).optional(),
});

export const indexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()).min(1),
  unique: z.boolean().optional(),
});

const indexesSchema = z.array(indexSchema);

// Intermediate table representation
export const tableSchema = z
  .object({
    name: z.string().min(1),
    columns: z
      .record(z.string(), columnSchema)
      .refine((cols) => Object.keys(cols).length > 0, {
        message: "Tables must have at least one column",
      }),
    compositeKeys: compositeKeysSchema,
    indexes: indexesSchema,
  })
  .refine(
    (table) => {
      const indexes = table.indexes.map((idx) => idx.name);
      return indexes.length === new Set(indexes).size;
    },
    { message: "Found duplicate indexes!" }
  )
  .refine(
    (table) => {
      return table.indexes.every((index) =>
        index.columns.every((column) => column in table.columns)
      );
    },
    { message: "Index references non-existent columns..." }
  );

export type SmileColumnType = z.infer<typeof columnTypeSchema>;
export type SmileColumnConstraints = z.infer<typeof columnConstraintsSchema>;
export type SmileColumn = z.infer<typeof columnSchema>;
export type SmileCompositeKey = z.infer<typeof compositeKeysSchema>;
export type SmileIndex = z.infer<typeof indexSchema>;
export type SmileTable = z.infer<typeof tableSchema>;

export type DFRecord = {
  [x: string]: string | number | bigint | boolean | null;
};
