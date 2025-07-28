import { z } from "zod/v4";
import * as schemas from "./schemas";

export type SmileColumnType = z.infer<typeof schemas.columnTypeSchema>;
export type SmileColumnConstraints = z.infer<typeof schemas.columnConstraintsSchema>;
export type SmileColumn = z.infer<typeof schemas.columnSchema>;
export type SmileCompositeKey = z.infer<typeof schemas.compositeKeysSchema>;
export type SmileIndex = z.infer<typeof schemas.indexSchema>;
export type SmileTable = z.infer<typeof schemas.tableSchema>;
