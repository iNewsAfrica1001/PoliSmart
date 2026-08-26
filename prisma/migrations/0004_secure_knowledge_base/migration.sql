-- pgvector is optional at deployment time but required before embeddings are written.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TYPE "DocumentCategory" AS ENUM ('MANIFESTO','POLICY','SPEECH','RESEARCH','CAMPAIGN_MANUAL','STRATEGY','APPROVED_COMMUNICATION','PUBLIC_REPORT');
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE','CAMPAIGN','ORGANIZATION','PUBLIC');
CREATE TYPE "DocumentApprovalStatus" AS ENUM ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','ARCHIVED');
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING','PROCESSING','READY','FAILED');
CREATE TABLE "knowledge_documents" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenant_id" UUID NOT NULL,"campaign_id" UUID NOT NULL,"uploaded_by_id" UUID NOT NULL,"title" TEXT NOT NULL,"source" TEXT,"author" TEXT,"category" "DocumentCategory" NOT NULL,"tags" TEXT[] NOT NULL,"visibility" "DocumentVisibility" NOT NULL DEFAULT 'CAMPAIGN',"approval_status" "DocumentApprovalStatus" NOT NULL DEFAULT 'DRAFT',"processing_status" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',"original_filename" TEXT NOT NULL,"media_type" TEXT NOT NULL,"file_extension" TEXT NOT NULL,"file_size_bytes" INTEGER NOT NULL,"sha256" TEXT NOT NULL,"storage_key" TEXT NOT NULL UNIQUE,"extracted_text" TEXT,"processing_error" TEXT,"uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE,FOREIGN KEY("uploaded_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT,CHECK("file_size_bytes" > 0));
CREATE UNIQUE INDEX "knowledge_documents_tenant_campaign_sha_key" ON "knowledge_documents"("tenant_id","campaign_id","sha256");
CREATE INDEX "knowledge_documents_tenant_metadata_idx" ON "knowledge_documents"("tenant_id","campaign_id","category","approval_status");
CREATE INDEX "knowledge_documents_tenant_processing_idx" ON "knowledge_documents"("tenant_id","processing_status","uploaded_at");
CREATE INDEX "knowledge_documents_text_search_idx" ON "knowledge_documents" USING GIN (to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("extracted_text",'')));
CREATE TABLE "knowledge_chunks" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenant_id" UUID NOT NULL,"document_id" UUID NOT NULL,"chunk_index" INTEGER NOT NULL,"content" TEXT NOT NULL,"token_estimate" INTEGER NOT NULL,"content_sha256" TEXT NOT NULL,"embedding_model" TEXT,"embedding" vector(1536),"embedding_status" TEXT NOT NULL DEFAULT 'PENDING',"metadata" JSONB,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE,CHECK("chunk_index" >= 0),CHECK("token_estimate" >= 0));
CREATE UNIQUE INDEX "knowledge_chunks_document_index_key" ON "knowledge_chunks"("document_id","chunk_index");
CREATE INDEX "knowledge_chunks_tenant_document_idx" ON "knowledge_chunks"("tenant_id","document_id");
CREATE INDEX "knowledge_chunks_text_search_idx" ON "knowledge_chunks" USING GIN (to_tsvector('simple', "content"));
-- Create an HNSW index after embeddings exist and pgvector sizing is confirmed:
-- CREATE INDEX knowledge_chunks_embedding_hnsw_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
