import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { AFROBAROMETER_INDICATOR_MAPPINGS } from "../server/config/afrobarometer.js";
import {
  analyzeAfrobarometer,
  persistAfrobarometer,
} from "../server/services/afrobarometerIngestion.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "data", "raw", "polismart_afrobarometer_mvp_cleaned.csv");
const dictionaryPath = path.join(
  root,
  "data",
  "raw",
  "polismart_afrobarometer_data_dictionary.csv",
);
const dryRun = process.argv.includes("--dry-run");
const analysis = await analyzeAfrobarometer({
  sourcePath,
  dictionaryPath,
  mappings: AFROBAROMETER_INDICATOR_MAPPINGS,
});
let persistence = {
  dryRun: true,
  idempotent: false,
  rowsImported: 0,
  aggregateCount: analysis.aggregateResults.length,
};
if (!dryRun) {
  const prisma = new PrismaClient();
  try {
    try {
      persistence = await persistAfrobarometer(prisma, analysis, {
        sourceFile: path.relative(root, sourcePath),
        dictionaryFile: path.relative(root, dictionaryPath),
      });
    } catch (error) {
      persistence = {
        databaseImportFailed: true,
        rowsImported: 0,
        aggregateCount: 0,
        error: String(error?.message || error).includes("Can't reach database server")
          ? "PostgreSQL is unavailable. Start the configured database, apply migrations, and rerun the command."
          : "Database import failed. No completed import was recorded.",
      };
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}
console.log(
  JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "database-import",
      ...persistence,
      rowsInspected: analysis.rowsInspected,
      eligibleRows: analysis.rowsImported,
      rejectedRows: analysis.rejectedRows,
      warnings: analysis.warnings,
      mappedQuestions: analysis.mappings.length,
      unmappedQuestions: analysis.unmappedQuestionCodes.length,
      countries: analysis.countries.length,
      regions: analysis.regions.length,
      aggregateCounts: analysis.aggregateResults.length,
      aggregateWeightField: analysis.aggregateWeightField,
      weightingValidation: analysis.weightingValidation,
      sourceSha256: analysis.sourceSha256,
      dictionarySha256: analysis.dictionarySha256,
      importVersion: analysis.importVersion,
    },
    null,
    2,
  ),
);
