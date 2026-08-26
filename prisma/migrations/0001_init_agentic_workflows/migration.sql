CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('OPERATOR', 'SUPERVISOR', 'ADMIN');
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'APPROVED', 'CORRECTED', 'ESCALATED', 'CLOSED');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "title" TEXT,
  "department" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WorkflowModule" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AgentRun" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "operatorId" UUID NOT NULL REFERENCES "User"("id"),
  "workflowModuleId" UUID REFERENCES "WorkflowModule"("id"),
  "automationGoal" TEXT NOT NULL,
  "dataSensitivity" TEXT NOT NULL DEFAULT 'Synthetic workflow data',
  "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "toolReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AgentStep" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentRunId" UUID NOT NULL REFERENCES "AgentRun"("id") ON DELETE CASCADE,
  "actor" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "modelProvider" TEXT,
  "toolName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReviewCase" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentRunId" UUID NOT NULL REFERENCES "AgentRun"("id") ON DELETE CASCADE,
  "reviewerId" UUID REFERENCES "User"("id"),
  "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
  "trigger" TEXT NOT NULL,
  "decision" TEXT,
  "resolution" TEXT,
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReadinessCheck" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowModuleId" UUID REFERENCES "WorkflowModule"("id"),
  "title" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReadinessQuestion" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "readinessCheckId" UUID NOT NULL REFERENCES "ReadinessCheck"("id") ON DELETE CASCADE,
  "prompt" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "answerIndex" INTEGER NOT NULL
);

CREATE TABLE "ReadinessSubmission" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "readinessCheckId" UUID NOT NULL REFERENCES "ReadinessCheck"("id"),
  "operatorId" UUID NOT NULL REFERENCES "User"("id"),
  "score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "results" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "AgentRun_operatorId_idx" ON "AgentRun"("operatorId");
CREATE INDEX "AgentRun_workflowModuleId_idx" ON "AgentRun"("workflowModuleId");
CREATE INDEX "AgentRun_riskLevel_idx" ON "AgentRun"("riskLevel");
CREATE INDEX "AgentRun_createdAt_idx" ON "AgentRun"("createdAt");
CREATE INDEX "AgentStep_agentRunId_idx" ON "AgentStep"("agentRunId");
CREATE INDEX "ReviewCase_status_idx" ON "ReviewCase"("status");
CREATE INDEX "ReviewCase_reviewerId_idx" ON "ReviewCase"("reviewerId");
CREATE INDEX "ReviewCase_dueAt_idx" ON "ReviewCase"("dueAt");
CREATE INDEX "ReadinessQuestion_readinessCheckId_idx" ON "ReadinessQuestion"("readinessCheckId");
CREATE INDEX "ReadinessSubmission_readinessCheckId_idx" ON "ReadinessSubmission"("readinessCheckId");
CREATE INDEX "ReadinessSubmission_operatorId_idx" ON "ReadinessSubmission"("operatorId");
CREATE INDEX "ReadinessSubmission_createdAt_idx" ON "ReadinessSubmission"("createdAt");
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");
CREATE INDEX "AuditEvent_entity_idx" ON "AuditEvent"("entity");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
