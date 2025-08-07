import {
  customType,
  type IndexBuilder,
  index,
  integer,
  type SQLiteBooleanBuilderInitial,
  type SQLiteIntegerBuilderInitial,
  type SQLiteTextBuilderInitial,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { SmileColumn, SmileTable } from "./types";

// Union type for all column builders that support constraint methods
type DrizzleColumnBuilder =
  | SQLiteTextBuilderInitial<string, [string, ...string[]], number>
  | SQLiteIntegerBuilderInitial<string>
  | SQLiteBooleanBuilderInitial<string>
  | ReturnType<typeof dateType>
  | ReturnType<typeof jsonType>;

// Custom types for better data handling (inspired by Astro DB)
const dateType = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: Date) {
    return value.toISOString();
  },
  fromDriver(value: string) {
    // Handle both ISO strings and SQLite CURRENT_TIMESTAMP format
    if (!value.endsWith("Z") && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
      value += "Z"; // Add UTC indicator for SQLite timestamps
    }
    return new Date(value);
  },
});

const jsonType = customType<{ data: unknown; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: unknown) {
    return JSON.stringify(value);
  },
  fromDriver(value: string) {
    return JSON.parse(value);
  },
});

export type DrizzledSmileTable = ReturnType<typeof sqliteTable>;
/**
 * Convert a Smile table to a Drizzle table definition
 */
export function toDrizzle(table: SmileTable): DrizzledSmileTable {
  const columns: Record<string, DrizzleColumnBuilder> = {};

  // Convert each column
  Object.entries(table.columns).forEach(([fieldName, column]) => {
    columns[fieldName] = createDrizzleColumn(fieldName, column);
  });

  // Create the table with indexes
  return sqliteTable(table.name, columns, (t) => {
    const drizzleIndexes: IndexBuilder[] = [];

    // Add explicit indexes
    table.indexes.forEach((indexDef) => {
      const indexColumns = indexDef.columns
        .map((colName) => t[colName])
        .filter((col): col is NonNullable<typeof col> => Boolean(col));

      const [first, ...rest] = indexColumns;
      if (!first) return;

      const idx = index(indexDef.name).on(first, ...rest);
      if (indexDef.unique) {
        // Note: Drizzle's unique indexes would be handled differently
        // For now, treat as regular index since unique was handled at column level
      }
      drizzleIndexes.push(idx);
    });

    // Add composite primary key if defined
    if (table.compositeKeys.primary) {
      const pkColumns = table.compositeKeys.primary
        .map((colName) => t[colName])
        .filter((col): col is NonNullable<typeof col> => Boolean(col));

      const [first, second, ...rest] = pkColumns;
      if (!first && !second) return;

      // For composite primary keys, we need to handle this differently
      // Drizzle requires special syntax for composite keys
      // This would need to be done in the column definitions themselves
      // or through a primaryKey() constraint
    }

    return drizzleIndexes;
  });
}

/**
 * Create a Drizzle column from a Smile column definition
 */
function createDrizzleColumn(
  fieldName: string,
  smileColumn: SmileColumn
): DrizzleColumnBuilder {
  let column: DrizzleColumnBuilder;

  // Create base column based on type
  switch (smileColumn.type) {
    case "text":
      column = text(fieldName);
      break;

    case "number":
      column = integer(fieldName);
      break;

    case "boolean":
      column = integer(fieldName, { mode: "boolean" });
      break;

    case "date":
      column = dateType(fieldName);
      break;

    case "json":
      column = jsonType(fieldName);
      break;

    default:
      column = text(fieldName);
      break;
  }

  // Apply constraints
  const { constraints } = smileColumn;

  // Handle primary key
  if (constraints.primaryKey) {
    if (smileColumn.type === "number") {
      column = column.primaryKey({ autoIncrement: true });
    } else {
      column = column.primaryKey();
    }
  }

  // Handle unique constraint (only if not primary key)
  if (constraints.unique && !constraints.primaryKey) {
    column = column.unique();
  }

  // Handle NOT NULL (inverse of optional)
  if (!constraints.optional) {
    column = column.notNull();
  }

  return column;
}
