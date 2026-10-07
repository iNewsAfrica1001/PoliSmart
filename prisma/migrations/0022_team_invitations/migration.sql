-- Additive tenant team invitation lifecycle. No existing data is rewritten.
CREATE TYPE "TeamInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'SUPERSEDED');

CREATE TABLE "team_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "status" "TeamInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "invited_by_id" UUID NOT NULL,
  "accepted_by_id" UUID,
  "revoked_by_id" UUID,
  "accepted_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "team_invitations_email_normalized" CHECK ("recipient_email" = lower(trim("recipient_email")))
);

CREATE UNIQUE INDEX "team_invitations_token_hash_key" ON "team_invitations"("token_hash");
CREATE UNIQUE INDEX "team_invitations_one_pending_per_tenant_email" ON "team_invitations"("tenant_id", "recipient_email") WHERE "status" = 'PENDING';
CREATE INDEX "team_invitations_tenant_id_status_created_at_idx" ON "team_invitations"("tenant_id", "status", "created_at");
CREATE INDEX "team_invitations_recipient_email_status_idx" ON "team_invitations"("recipient_email", "status");

ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE "team_invitations" FROM "polismart_runtime";
GRANT SELECT, INSERT ON TABLE "team_invitations" TO "polismart_runtime";
GRANT UPDATE ("token_hash", "role", "status", "expires_at", "accepted_by_id", "revoked_by_id", "accepted_at", "revoked_at", "updated_at") ON TABLE "team_invitations" TO "polismart_runtime";
