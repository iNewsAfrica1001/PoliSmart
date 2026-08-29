export function createPublicIntelligenceRepository(database) {
  return {
    async listAggregates({ category, country, surveyRound, minimumSampleSize = 100 }) {
      const rows = await database.surveyAggregateResult.findMany({
        where: {
          isSuppressed: false,
          unweightedSampleSize: { gte: minimumSampleSize },
          indicatorDefinition: category ? { category } : undefined,
          surveyCountry: country
            ? {
                is: {
                  OR: [
                    { sourceCode: { equals: country, mode: "insensitive" } },
                    { countryName: { equals: country, mode: "insensitive" } },
                  ],
                },
              }
            : undefined,
          surveyImport: surveyRound ? { is: { surveyRound } } : undefined,
        },
        select: {
          responseCode: true,
          weightedPercentage: true,
          unweightedSampleSize: true,
          weightField: true,
          surveyCountry: { select: { countryName: true, sourceCode: true } },
          indicatorDefinition: {
            select: {
              indicatorCode: true,
              indicatorName: true,
              category: true,
              questionCode: true,
              mappingVersion: true,
            },
          },
          surveyImport: {
            select: {
              surveyRound: true,
              importVersion: true,
              dataSource: { select: { name: true, attribution: true, sourceUrl: true } },
            },
          },
        },
        orderBy: [
          { surveyCountry: { countryName: "asc" } },
          { indicatorDefinition: { indicatorCode: "asc" } },
        ],
      });
      return rows.map((row) => ({
        country: row.surveyCountry.countryName,
        countrySourceCode: row.surveyCountry.sourceCode,
        question: row.indicatorDefinition.questionCode,
        indicator: row.indicatorDefinition.indicatorName,
        indicatorCode: row.indicatorDefinition.indicatorCode,
        category: row.indicatorDefinition.category,
        responseCode: row.responseCode,
        weightedPercentage: Number(row.weightedPercentage),
        unweightedSampleSize: row.unweightedSampleSize,
        weightField: row.weightField,
        surveyRound: row.surveyImport.surveyRound,
        importVersion: row.surveyImport.importVersion,
        mappingVersion: row.indicatorDefinition.mappingVersion,
        surveySource: row.surveyImport.dataSource.name,
        attribution: row.surveyImport.dataSource.attribution,
        sourceUrl: row.surveyImport.dataSource.sourceUrl,
      }));
    },
    latestImport() {
      return database.surveyImport.findFirst({
        where: { status: "COMPLETED" },
        select: {
          importVersion: true,
          surveyRound: true,
          rowsInspected: true,
          rowsImported: true,
          rejectedRows: true,
          warnings: true,
          weightingValidation: true,
          completedAt: true,
          _count: { select: { questions: true, aggregateResults: true } },
        },
        orderBy: { completedAt: "desc" },
      });
    },
  };
}
