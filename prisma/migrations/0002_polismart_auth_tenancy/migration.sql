-- PoliSmart authentication and tenancy foundation.
-- Non-destructive: legacy tables are retained pending a separate reviewed migration.
CREATE TYPE "MembershipRole" AS ENUM ('SUPER_ADMINISTRATOR','CAMPAIGN_ADMINISTRATOR','CANDIDATE','CAMPAIGN_MANAGER','POLICY_DIRECTOR','COMMUNICATIONS_DIRECTOR','FIELD_DIRECTOR','VOLUNTEER_COORDINATOR','ANALYST','VOLUNTEER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE','INVITED','SUSPENDED');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT','ACTIVE','ARCHIVED');

CREATE TABLE "auth_users" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"email" TEXT NOT NULL UNIQUE,"password_hash" TEXT NOT NULL,"display_name" TEXT NOT NULL,"email_verified_at" TIMESTAMP(3),"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "organizations" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"name" TEXT NOT NULL,"slug" TEXT NOT NULL UNIQUE,"country" TEXT NOT NULL,"is_demo" BOOLEAN NOT NULL DEFAULT false,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "campaigns" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenant_id" UUID NOT NULL,"name" TEXT NOT NULL,"slug" TEXT NOT NULL,"status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',"is_demo" BOOLEAN NOT NULL DEFAULT false,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE);
CREATE TABLE "memberships" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenant_id" UUID NOT NULL,"user_id" UUID NOT NULL,"role" "MembershipRole" NOT NULL,"status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE,CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE);
CREATE TABLE "permissions" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"key" TEXT NOT NULL UNIQUE,"description" TEXT NOT NULL,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "role_permissions" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"role" "MembershipRole" NOT NULL,"permission_id" UUID NOT NULL,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE);
CREATE TABLE "auth_sessions" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" UUID NOT NULL,"token_hash" TEXT NOT NULL UNIQUE,"expires_at" TIMESTAMP(3) NOT NULL,"last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"user_agent" TEXT,"ip_hash" TEXT,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE);
CREATE TABLE "email_verification_tokens" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" UUID NOT NULL,"token_hash" TEXT NOT NULL UNIQUE,"expires_at" TIMESTAMP(3) NOT NULL,"used_at" TIMESTAMP(3),"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE);
CREATE TABLE "password_reset_tokens" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" UUID NOT NULL,"token_hash" TEXT NOT NULL UNIQUE,"expires_at" TIMESTAMP(3) NOT NULL,"used_at" TIMESTAMP(3),"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE);
CREATE TABLE "security_audit_events" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),"tenant_id" UUID,"actor_id" UUID,"action" TEXT NOT NULL,"entity" TEXT NOT NULL,"entity_id" UUID,"metadata" JSONB,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX "campaigns_tenant_id_slug_key" ON "campaigns"("tenant_id","slug");
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id","status");
CREATE UNIQUE INDEX "memberships_tenant_id_user_id_key" ON "memberships"("tenant_id","user_id");
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id","status");
CREATE INDEX "memberships_tenant_id_role_idx" ON "memberships"("tenant_id","role");
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role","permission_id");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id","expires_at");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE INDEX "email_verification_tokens_user_id_expires_at_idx" ON "email_verification_tokens"("user_id","expires_at");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id","expires_at");
CREATE INDEX "security_audit_events_tenant_id_created_at_idx" ON "security_audit_events"("tenant_id","created_at");
CREATE INDEX "security_audit_events_actor_id_created_at_idx" ON "security_audit_events"("actor_id","created_at");
