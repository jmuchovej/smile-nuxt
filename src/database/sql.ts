import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { SmileColumn, SmileTable } from "./types";

const sqlite = new SQLiteSyncDialect();

export function getDropTableIfExistsQuery(table: SmileTable): string {
  return `DROP TABLE IF EXISTS ${sqlite.escapeName(table.name)};`;
}

/**
 * Generate SQL CREATE TABLE statement from Smile table (for debugging/migration)
 */
export function getCreateTableQuery(table: SmileTable): string {
  const columns: string[] = [];

  // Add columns
  Object.entries(table.columns).forEach(([name, column]) => {
    const parts = [sqlite.escapeName(name), getSQLType(column)];

    if (!column.constraints.optional) {
      parts.push("NOT NULL");
    }

    if (column.constraints.unique && !column.constraints.primaryKey) {
      parts.push("UNIQUE");
    }

    columns.push(`  ${parts.join(" ")}`);
  });

  // Add composite primary key
  if (table.compositeKeys.primary && table.compositeKeys.primary.length > 0) {
    const pkFields = table.compositeKeys.primary.map(sqlite.escapeName).join(", ");
    columns.push(`  PRIMARY KEY (${pkFields})`);
  }

  return `CREATE TABLE ${sqlite.escapeName(table.name)} (\n${columns.join(",\n")}\n);`;
}

/**
 * Convert Smile column type to SQL type string
 */
function getSQLType(column: SmileColumn): "TEXT" | "INTEGER" {
  switch (column.type) {
    case "text":
    case "json":
    case "date":
      return "TEXT";
    case "number":
    case "boolean":
      return "INTEGER";
  }
}

export function getCreateIndexQueries(table: SmileTable): string[] {
  const queries: string[] = [];
  for (const index of Object.values(table.indexes ?? {})) {
    const { name, columns, unique } = index;
    const query = [
      "CREATE",
      unique ? "UNIQUE" : null,
      "INDEX",
      sqlite.escapeName(name),
      "ON",
      sqlite.escapeName(table.name),
      `(${columns.map(sqlite.escapeName).join(", ")});`,
    ]
      .filter(Boolean)
      .join(" ");
    queries.push(query);
  }

  return queries;
}
