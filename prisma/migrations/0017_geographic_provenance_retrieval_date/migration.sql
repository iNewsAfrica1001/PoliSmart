-- Additive provenance support for authoritative sources without a published version date.
-- Existing rows remain valid; the application requires retrieval_date for new controlled imports.
ALTER TABLE "geographic_areas" ADD COLUMN "retrieval_date" DATE;
