/**
 * Abstraction Layer - Zod to Smile Table Schema
 *
 * This layer converts user-defined Zod schemas into Smile's intermediate table representation.
 * It extracts SQL constraints, handles composite primary keys, and creates a clean abstraction
 * that can be used by both SQL generation and Drizzle conversion.
 */
import type { ZodType } from "zod";
import {
  ZodDate,
  ZodDefault,
  ZodNullable,
  ZodNumber,
  type ZodObject,
  ZodOptional,
  ZodString,
} from "zod";
import type {
  SmileColumn,
  SmileColumnConstraints,
  SmileColumnType,
  SmileTable,
} from "./types";
import { tableSchema } from "./types";

export function getValidatedTable(name: string, schema: ZodObject): SmileTable {
  const table = fromZod(name, schema);
  tableSchema.parse(table);
  return table;
}

/**
 * Convert a Zod schema to Smile table abstraction
 */
export function fromZod(tableName: string, schema: ZodObject): SmileTable {
  const columns: Record<string, SmileColumn> = {};
  const indexes: SmileTable["indexes"] = [];

  // Process each field in the Zod schema
  Object.entries(schema.shape).forEach(([columne, schema]) => {
    // Skip meta fields that aren't actual data columns
    if (["path", "extension"].includes(columne)) return;

    const constraints = getSmileConstraints(schema as ZodType) || {};

    columns[columne] = {
      type: inferSmileColumnType(schema as ZodType),
      constraints: {
        ...constraints,
        optional: isOptionalField(schema as ZodType),
      },
    };

    // Add index if marked
    if (constraints.index) {
      indexes.push({
        name: `idx_${tableName}_${columne}`,
        columns: [columne],
      });
    }
  });

  // Build composite primary key from trial/block/condition IDs
  const primaryKeyFields = buildCompositePrimaryKey(columns);

  return {
    name: tableName,
    columns,
    compositeKeys: {
      primary: primaryKeyFields.length > 0 ? primaryKeyFields : undefined,
    },
    indexes,
  };
}

class UnknownColumnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownColumnError";
  }
}

/**
 * Infer Smile column type from Zod type
 */
function inferSmileColumnType(zodType: ZodType): SmileColumnType {
  // Handle wrapped types (optional, nullable, default)
  const def = unwrapZodType(zodType)._zod.def;

  switch (def.type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "date";
    case "array":
    case "object":
      return "json";
    case "string":
    case "enum":
      return "text";
  }

  throw new UnknownColumnError(
    `Cannot convert ${def.type} to a valid \`SmileColumn\`!`
  );
}

/**
 * Check if a field is optional (nullable, optional, or has default)
 */
function isOptionalField(zodType: ZodType): boolean {
  return (
    zodType instanceof ZodOptional ||
    zodType instanceof ZodNullable ||
    zodType instanceof ZodDefault
  );
}

/**
 * Unwrap nested Zod types to get the core type
 */
function unwrapZodType(zodType: ZodType): ZodType {
  if (
    zodType instanceof ZodOptional ||
    zodType instanceof ZodNullable ||
    zodType instanceof ZodDefault
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: false-positive, required to properly type as ZodType...
    return unwrapZodType(zodType.unwrap() as any as ZodType);
  }

  return zodType;
}

/**
 * Build composite primary key from trialID, blockID, conditionID constraints
 */
function buildCompositePrimaryKey(columns: Record<string, SmileColumn>): string[] {
  const trialFields = Object.entries(columns)
    .filter(([_, col]) => col.constraints.trialID)
    .map(([name, _]) => name);

  const blockFields = Object.entries(columns)
    .filter(([_, col]) => col.constraints.blockID)
    .map(([name, _]) => name);

  const conditionFields = Object.entries(columns)
    .filter(([_, col]) => col.constraints.conditionID)
    .map(([name, _]) => name);

  // Check if this is a meta table (has primaryKey) or experiment table (needs trialID)
  const primaryKeyFields = Object.entries(columns)
    .filter(([_, col]) => col.constraints.primaryKey)
    .map(([name, _]) => name);

  const isMetaTable = primaryKeyFields.length > 0;
  const hasCompositeFields =
    trialFields.length > 0 || blockFields.length > 0 || conditionFields.length > 0;

  // Validate based on table type
  if (isMetaTable && hasCompositeFields) {
    throw new Error("Cannot mix primaryKey with trialID/blockID/conditionID");
  }

  if (isMetaTable) return primaryKeyFields;

  if (!isMetaTable && trialFields.length === 0) {
    throw new Error("Experiment tables must specify trialID");
  }

  // Validate composite key rules for experiment tables
  if (trialFields.length > 1) {
    throw new Error("Only one field can be marked as trialID");
  }
  if (blockFields.length > 1) {
    throw new Error("Only one field can be marked as blockID");
  }
  if (conditionFields.length > 1) {
    throw new Error("Only one field can be marked as conditionID");
  }

  const compositeKey: string[] = [
    ...trialFields,
    ...blockFields,
    ...conditionFields,
  ].filter(Boolean);

  return compositeKey;
}

declare module "zod" {
  interface GlobalMeta {
    smile?: SmileColumnConstraints;
  }
}

// Module augmentation to add SQL constraint methods to existing Zod types
declare module "zod" {
  interface ZodDefault {
    /**
     * Create index on this column
     * Example: z.default().index()
     */
    index(): ZodDefault;
  }

  interface ZodOptional {
    /**
     * Create index on this column
     * Example: z.optional().index()
     */
    index(): ZodOptional;
  }

  interface ZodString {
    /**
     * Mark this column as PRIMARY KEY
     * Example: z.string().primaryKey()
     */
    primaryKey(): ZodString;

    /**
     * Add UNIQUE constraint to column
     * Example: z.string().unique()
     */
    unique(): ZodString;

    /**
     * Create index on this column
     * Example: z.string().index()
     */
    index(): ZodString;

    /**
     * Mark this column as the trial ID.
     * Example: z.string().trialID()
     */
    trialID(): ZodString;

    /**
     * Mark this column as the block ID
     * Example: z.string().blockID()
     */
    blockID(): ZodString;

    /**
     * Mark this column as the condition ID
     * Example: z.string().conditionID()
     */
    conditionID(): ZodString;
  }

  interface ZodNumber {
    /**
     * Mark this column as PRIMARY KEY (with AUTOINCREMENT)
     * Example: z.number().primaryKey()
     */
    primaryKey(): ZodNumber;

    /**
     * Add UNIQUE constraint to column
     * Example: z.number().unique()
     */
    unique(): ZodNumber;

    /**
     * Create index on this column
     * Example: z.number().index()
     */
    index(): ZodNumber;

    /**
     * Mark this column as the trial ID.
     * Example: z.string().trialID()
     */
    trialID(): ZodNumber;

    /**
     * Mark this column as the block ID
     * Example: z.string().blockID()
     */
    blockID(): ZodNumber;

    /**
     * Mark this column as the condition ID
     * Example: z.string().conditionID()
     */
    conditionID(): ZodNumber;
  }

  interface ZodDate {
    /**
     * Create an index for this column
     * Example: z.date().index()
     */
    index(): ZodDate;
  }
}

// Helper function to add SQL constraints
function addSmileConstraint(
  schema: ZodType,
  constraints: Partial<SmileColumnConstraints>
) {
  const existing = schema.meta() || {};
  return schema.meta({
    ...existing,
    smile: {
      ...existing?.smile,
      ...constraints,
    },
  });
}

ZodDefault.prototype.index = function () {
  return addSmileConstraint(this, { index: true, optional: true });
};

ZodOptional.prototype.index = function () {
  return addSmileConstraint(this, { index: true, optional: true });
};

// String constraints
ZodString.prototype.primaryKey = function () {
  return addSmileConstraint(this, { primaryKey: true });
};

ZodString.prototype.unique = function () {
  return addSmileConstraint(this, { unique: true });
};

ZodString.prototype.index = function () {
  return addSmileConstraint(this, { index: true });
};

ZodString.prototype.trialID = function () {
  return addSmileConstraint(this, { trialID: true });
};

ZodString.prototype.blockID = function () {
  return addSmileConstraint(this, { blockID: true });
};

ZodString.prototype.conditionID = function () {
  return addSmileConstraint(this, { conditionID: true });
};

// Number constraints
ZodNumber.prototype.primaryKey = function () {
  return addSmileConstraint(this, { primaryKey: true });
};

ZodNumber.prototype.unique = function () {
  return addSmileConstraint(this, { unique: true });
};

ZodNumber.prototype.index = function () {
  return addSmileConstraint(this, { index: true });
};

ZodNumber.prototype.trialID = function () {
  return addSmileConstraint(this, { trialID: true });
};

ZodNumber.prototype.blockID = function () {
  return addSmileConstraint(this, { blockID: true });
};

ZodNumber.prototype.conditionID = function () {
  return addSmileConstraint(this, { conditionID: true });
};

// Date constraints
ZodDate.prototype.index = function () {
  return addSmileConstraint(this, { index: true });
};

/**
 * Extract Smile constraints from a schema type using Zod v4's meta() method
 */
export function getSmileConstraints(schema: ZodType): SmileColumnConstraints | null {
  const constraints = schema.meta()?.smile || undefined;
  return constraints || null;
}
