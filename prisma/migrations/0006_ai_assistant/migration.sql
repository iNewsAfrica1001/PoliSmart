CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "AiFeedbackType" AS ENUM ('HELPFUL', 'INCORRECT', 'REPORT');

CREATE TABLE "ai_conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL, "user_id" UUID NOT NULL, "title" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ai_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL, "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL, "intent" TEXT, "grounded" BOOLEAN NOT NULL DEFAULT false,
  "citations" JSONB, "structured_data" JSONB, "provider" TEXT, "model" TEXT,
  "provider_ref" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ai_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL,
  "message_id" UUID NOT NULL, "user_id" UUID NOT NULL, "type" "AiFeedbackType" NOT NULL,
  "note" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_conversations_tenant_id_campaign_id_user_id_updated_at_idx" ON "ai_conversations"("tenant_id", "campaign_id", "user_id", "updated_at");
CREATE INDEX "ai_messages_tenant_id_conversation_id_created_at_idx" ON "ai_messages"("tenant_id", "conversation_id", "created_at");
CREATE UNIQUE INDEX "ai_feedback_message_id_user_id_key" ON "ai_feedback"("message_id", "user_id");
CREATE INDEX "ai_feedback_tenant_id_type_created_at_idx" ON "ai_feedback"("tenant_id", "type", "created_at");
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
