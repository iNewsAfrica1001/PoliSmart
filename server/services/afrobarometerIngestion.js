import { createReadStream, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "csv-parse";
import { parse as parseSync } from "csv-parse/sync";
import {
  AFROBAROMETER_COUNTRY_MAPPINGS,
  AFROBAROMETER_MAPPING_VERSION,
  AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
} from "../config/afrobarometer.js";

const WEIGHT_FIELDS = ["withinwt_ea", "withinwt_hh", "Combinwt_old_ea", "Combinwt_new_hh"];
const AGGREGATE_WEIGHT_FIELD = "Combinwt_new_hh";
const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const weightProfile = () => ({
  present: 0,
  missing: 0,
  invalid: 0,
  zeroOrNegative: 0,
  minimum: null,
  maximum: null,
  sum: 0,
});

export async function analyzeAfrobarometer({
  sourcePath,
  dictionaryPath,
  mappings = [],
  minimumSampleSize = AFROBAROMETER_MINIMUM_SAMPLE_SIZE,
}) {
  const dictionary = parseSync(readFileSync(dictionaryPath), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });
  const questions = dictionary
    .filter((row) => row.polismart_category === "Survey question — map with Round 9 codebook")
    .map((row) => ({
      questionCode: row.field_name,
      questionText:
        mappings.find((mapping) => mapping.questionCode === row.field_name)?.questionText ?? null,
      dictionaryCategory: row.polismart_category,
      dictionaryNote: row.note || null,
      mappingStatus: mappings.some((mapping) => mapping.questionCode === row.field_name)
        ? "MAPPED"
        : "UNMAPPED",
    }));
  const headers = parseSync(readFileSync(sourcePath).subarray(0, 64 * 1024), {
    to_line: 1,
    bom: true,
  })[0];
  const missingWeightColumns = WEIGHT_FIELDS.filter((field) => !headers.includes(field));
  const weightValidation = Object.fromEntries(
    WEIGHT_FIELDS.map((field) => [field, weightProfile()]),
  );
  const countries = new Map();
  const regions = new Map();
  const aggregates = new Map();
  const denominators = new Map();
  let rowsInspected = 0;
  let rowsImported = 0;
  let rejectedRows = 0;
  let parserRejectedRows = 0;
  let missingAggregateWeights = 0;
  const parser = createReadStream(sourcePath).pipe(
    parse({
      columns: true,
      bom: true,
      skip_empty_lines: true,
      skip_records_with_error: true,
      relax_column_count: false,
    }),
  );
  parser.on("skip", () => {
    rowsInspected += 1;
    rejectedRows += 1;
    parserRejectedRows += 1;
  });
  for await (const row of parser) {
    rowsInspected += 1;
    const respondent = String(row.RESPNO ?? "").trim();
    const countryCode = String(row.COUNTRY ?? "").trim();
    const countryName = AFROBAROMETER_COUNTRY_MAPPINGS[countryCode];
    if (!respondent || !countryCode || !countryName) {
      rejectedRows += 1;
      continue;
    }
    rowsImported += 1;
    if (!countries.has(countryCode))
      countries.set(countryCode, {
        sourceCode: countryCode,
        countryName,
        mappingStatus: "MAPPED",
      });
    const regionCode = String(row.REGION ?? "").trim();
    if (regionCode) {
      const key = `${countryCode}|${regionCode}`;
      if (!regions.has(key))
        regions.set(key, {
          countryCode,
          sourceCode: regionCode,
          regionName:
            String(row["LOCATION.LEVEL.1"] ?? "").trim() || `Unmapped region code ${regionCode}`,
        });
    }
    for (const field of WEIGHT_FIELDS) {
      const raw = String(row[field] ?? "").trim();
      const profile = weightValidation[field];
      if (!raw) {
        profile.missing += 1;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        profile.invalid += 1;
        continue;
      }
      if (value <= 0) {
        profile.zeroOrNegative += 1;
        continue;
      }
      profile.present += 1;
      profile.sum += value;
      profile.minimum = profile.minimum == null ? value : Math.min(profile.minimum, value);
      profile.maximum = profile.maximum == null ? value : Math.max(profile.maximum, value);
    }
    const weight = Number(row[AGGREGATE_WEIGHT_FIELD]);
    if (!Number.isFinite(weight) || weight <= 0) {
      missingAggregateWeights += 1;
      continue;
    }
    for (const mapping of mappings) {
      const rawResponse = String(row[mapping.questionCode] ?? "").trim();
      const responseCode = mapping.responseMapping[rawResponse];
      if (!responseCode) continue;
      const denominatorKey = `${mapping.indicatorCode}|${countryCode}`;
      const aggregateKey = `${denominatorKey}|${responseCode}`;
      const aggregate = aggregates.get(aggregateKey) ?? {
        indicatorCode: mapping.indicatorCode,
        countryCode,
        responseCode,
        weightedCount: 0,
        unweightedCount: 0,
      };
      aggregate.weightedCount += weight;
      aggregate.unweightedCount += 1;
      aggregates.set(aggregateKey, aggregate);
      const denominator = denominators.get(denominatorKey) ?? { totalWeight: 0, sampleSize: 0 };
      denominator.totalWeight += weight;
      denominator.sampleSize += 1;
      denominators.set(denominatorKey, denominator);
    }
  }
  const aggregateResults = [...aggregates.values()].map((value) => {
    const denominator = denominators.get(`${value.indicatorCode}|${value.countryCode}`);
    const suppressed = denominator.sampleSize < minimumSampleSize;
    return {
      ...value,
      totalWeight: denominator.totalWeight,
      unweightedSampleSize: denominator.sampleSize,
      weightedPercentage: suppressed ? null : (value.weightedCount / denominator.totalWeight) * 100,
      minimumSampleSize,
      isSuppressed: suppressed,
      suppressionReason: suppressed ? `Minimum sample size is ${minimumSampleSize}.` : null,
      weightField: AGGREGATE_WEIGHT_FIELD,
    };
  });
  const unmapped = questions
    .filter((question) => question.mappingStatus === "UNMAPPED")
    .map((question) => question.questionCode);
  const warnings = [
    `${unmapped.length} question codes remain unmapped pending reviewed explicit mappings from the authoritative Round 9 codebook.`,
    ...(missingWeightColumns.length
      ? [`Missing weighting fields: ${missingWeightColumns.join(", ")}.`]
      : []),
    ...(missingAggregateWeights
      ? [
          `${missingAggregateWeights} accepted rows lack a valid positive ${AGGREGATE_WEIGHT_FIELD} and are excluded from weighted aggregates.`,
        ]
      : []),
    ...(parserRejectedRows
      ? [`${parserRejectedRows} malformed CSV rows were rejected by the parser.`]
      : []),
  ];
  const sourceSha256 = sha256File(sourcePath);
  const dictionarySha256 = sha256File(dictionaryPath);
  return {
    sourceSha256,
    dictionarySha256,
    importVersion: `r9-${sourceSha256.slice(0, 12)}`,
    surveyRound: "9",
    rowsInspected,
    rowsImported,
    rejectedRows,
    questions,
    countries: [...countries.values()],
    regions: [...regions.values()],
    mappings,
    aggregateResults,
    warnings,
    unmappedQuestionCodes: unmapped,
    weightingFields: WEIGHT_FIELDS,
    aggregateWeightField: AGGREGATE_WEIGHT_FIELD,
    weightingValidation: Object.fromEntries(
      Object.entries(weightValidation).map(([field, profile]) => [
        field,
        { ...profile, sum: Number(profile.sum.toFixed(8)) },
      ]),
    ),
    transformationHistory: [
      { step: "raw-file-sha256", sourceSha256, dictionarySha256 },
      {
        step: "explicit-question-mapping",
        mappingVersion: AFROBAROMETER_MAPPING_VERSION,
        mappedQuestions: mappings.length,
        unmappedQuestions: unmapped.length,
      },
      {
        step: "weighted-aggregation",
        weightField: AGGREGATE_WEIGHT_FIELD,
        minimumSampleSize,
        individualResponsesPersisted: false,
      },
    ],
  };
}

export async function persistAfrobarometer(prisma, analysis, { sourceFile, dictionaryFile }) {
  const existing = await prisma.surveyImport.findUnique({
    where: { sourceSha256: analysis.sourceSha256 },
  });
  if (existing) {
    const aggregateCount = await prisma.surveyAggregateResult.count({
      where: { surveyImportId: existing.id },
    });
    if (!(analysis.aggregateResults?.length ?? 0))
      return {
        idempotent: true,
        importId: existing.id,
        rowsImported: existing.rowsImported,
        aggregateCount,
      };

    return prisma.$transaction(
      async (tx) => {
        const source = await tx.dataSource.findUnique({ where: { id: existing.dataSourceId } });
        const countries = await tx.surveyCountry.findMany({
          where: { surveyImportId: existing.id },
        });
        const countryIds = new Map(countries.map((country) => [country.sourceCode, country.id]));
        for (const country of analysis.countries)
          await tx.surveyCountry.update({
            where: { id: countryIds.get(country.sourceCode) },
            data: { countryName: country.countryName, mappingStatus: country.mappingStatus },
          });
        for (const mapping of analysis.mappings) {
          await tx.surveyQuestion.update({
            where: {
              surveyImportId_questionCode: {
                surveyImportId: existing.id,
                questionCode: mapping.questionCode,
              },
            },
            data: { questionText: mapping.questionText, mappingStatus: "MAPPED" },
          });
          await tx.surveyIndicatorDefinition.upsert({
            where: { indicatorCode: mapping.indicatorCode },
            update: {
              responseMapping: mapping.responseMapping,
              mappingVersion: AFROBAROMETER_MAPPING_VERSION,
            },
            create: {
              dataSourceId: source.id,
              indicatorCode: mapping.indicatorCode,
              indicatorName: mapping.indicatorName,
              category: mapping.category,
              questionCode: mapping.questionCode,
              surveyRound: analysis.surveyRound,
              responseMapping: mapping.responseMapping,
              mappingVersion: AFROBAROMETER_MAPPING_VERSION,
            },
          });
        }
        const definitions = await tx.surveyIndicatorDefinition.findMany({
          where: { dataSourceId: source.id },
        });
        const definitionIds = new Map(
          definitions.map((definition) => [definition.indicatorCode, definition.id]),
        );
        const createdValues = await tx.surveyIndicatorValue.createMany({
          data: analysis.aggregateResults.map((item) => ({
            surveyImportId: existing.id,
            indicatorDefinitionId: definitionIds.get(item.indicatorCode),
            surveyCountryId: countryIds.get(item.countryCode),
            responseCode: item.responseCode,
            weightedCount: item.weightedCount,
            totalWeight: item.totalWeight,
            unweightedCount: item.unweightedCount,
            weightField: item.weightField,
          })),
          skipDuplicates: true,
        });
        const createdAggregates = await tx.surveyAggregateResult.createMany({
          data: analysis.aggregateResults.map((item) => ({
            surveyImportId: existing.id,
            indicatorDefinitionId: definitionIds.get(item.indicatorCode),
            surveyCountryId: countryIds.get(item.countryCode),
            responseCode: item.responseCode,
            weightedPercentage: item.weightedPercentage,
            unweightedSampleSize: item.unweightedSampleSize,
            minimumSampleSize: item.minimumSampleSize,
            isSuppressed: item.isSuppressed,
            suppressionReason: item.suppressionReason,
            weightField: item.weightField,
          })),
          skipDuplicates: true,
        });
        await tx.surveyImport.update({
          where: { id: existing.id },
          data: {
            importVersion: analysis.importVersion,
            rowsInspected: analysis.rowsInspected,
            rowsImported: analysis.rowsImported,
            rejectedRows: analysis.rejectedRows,
            warnings: analysis.warnings,
            weightingValidation: analysis.weightingValidation,
            transformationHistory: analysis.transformationHistory,
          },
        });
        return {
          idempotent: createdValues.count === 0 && createdAggregates.count === 0,
          enrichedExistingImport: createdAggregates.count > 0,
          importId: existing.id,
          rowsImported: analysis.rowsImported,
          aggregateCount: aggregateCount + createdAggregates.count,
          aggregateRecordsAdded: createdAggregates.count,
        };
      },
      { timeout: 120000 },
    );
  }
  return prisma.$transaction(
    async (tx) => {
      const source = await tx.dataSource.upsert({
        where: { slug: "afrobarometer" },
        update: {},
        create: {
          slug: "afrobarometer",
          name: "Afrobarometer",
          sourceType: "PUBLIC_RESEARCH_SURVEY",
          attribution: "Afrobarometer public research data",
          sourceUrl: "https://www.afrobarometer.org/",
          isPublic: true,
        },
      });
      const imported = await tx.surveyImport.create({
        data: {
          dataSourceId: source.id,
          importVersion: analysis.importVersion,
          surveyRound: analysis.surveyRound,
          sourceFile,
          sourceSha256: analysis.sourceSha256,
          dictionaryFile,
          dictionarySha256: analysis.dictionarySha256,
          status: "PROCESSING",
          warnings: analysis.warnings,
          weightingFields: analysis.weightingFields,
          weightingValidation: analysis.weightingValidation,
          transformationHistory: analysis.transformationHistory,
        },
      });
      await tx.surveyQuestion.createMany({
        data: analysis.questions.map((question) => ({
          ...question,
          dataSourceId: source.id,
          surveyImportId: imported.id,
          surveyRound: analysis.surveyRound,
        })),
      });
      await tx.surveyCountry.createMany({
        data: analysis.countries.map((country) => ({ ...country, surveyImportId: imported.id })),
      });
      const countries = await tx.surveyCountry.findMany({ where: { surveyImportId: imported.id } });
      const countryIds = new Map(countries.map((country) => [country.sourceCode, country.id]));
      await tx.surveyRegion.createMany({
        data: analysis.regions.map((region) => ({
          surveyCountryId: countryIds.get(region.countryCode),
          sourceCode: region.sourceCode,
          regionName: region.regionName,
        })),
      });
      for (const mapping of analysis.mappings)
        await tx.surveyIndicatorDefinition.upsert({
          where: { indicatorCode: mapping.indicatorCode },
          update: {
            responseMapping: mapping.responseMapping,
            mappingVersion: AFROBAROMETER_MAPPING_VERSION,
          },
          create: {
            dataSourceId: source.id,
            indicatorCode: mapping.indicatorCode,
            indicatorName: mapping.indicatorName,
            category: mapping.category,
            questionCode: mapping.questionCode,
            surveyRound: analysis.surveyRound,
            responseMapping: mapping.responseMapping,
            mappingVersion: AFROBAROMETER_MAPPING_VERSION,
          },
        });
      const definitions = await tx.surveyIndicatorDefinition.findMany({
        where: { dataSourceId: source.id },
      });
      const definitionIds = new Map(
        definitions.map((definition) => [definition.indicatorCode, definition.id]),
      );
      if (analysis.aggregateResults.length) {
        await tx.surveyIndicatorValue.createMany({
          data: analysis.aggregateResults.map((item) => ({
            surveyImportId: imported.id,
            indicatorDefinitionId: definitionIds.get(item.indicatorCode),
            surveyCountryId: countryIds.get(item.countryCode),
            responseCode: item.responseCode,
            weightedCount: item.weightedCount,
            totalWeight: item.totalWeight,
            unweightedCount: item.unweightedCount,
            weightField: item.weightField,
          })),
        });
        await tx.surveyAggregateResult.createMany({
          data: analysis.aggregateResults.map((item) => ({
            surveyImportId: imported.id,
            indicatorDefinitionId: definitionIds.get(item.indicatorCode),
            surveyCountryId: countryIds.get(item.countryCode),
            responseCode: item.responseCode,
            weightedPercentage: item.weightedPercentage,
            unweightedSampleSize: item.unweightedSampleSize,
            minimumSampleSize: item.minimumSampleSize,
            isSuppressed: item.isSuppressed,
            suppressionReason: item.suppressionReason,
            weightField: item.weightField,
          })),
        });
      }
      await tx.surveyImport.update({
        where: { id: imported.id },
        data: {
          status: "COMPLETED",
          rowsInspected: analysis.rowsInspected,
          rowsImported: analysis.rowsImported,
          rejectedRows: analysis.rejectedRows,
          completedAt: new Date(),
        },
      });
      return {
        idempotent: false,
        importId: imported.id,
        rowsImported: analysis.rowsImported,
        aggregateCount: analysis.aggregateResults.length,
      };
    },
    { timeout: 120000 },
  );
}
