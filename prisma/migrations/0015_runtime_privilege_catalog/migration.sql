-- Complete, forward-only runtime privilege catalog.
-- The role is a separately authorized prerequisite; this migration never creates it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'polismart_runtime') THEN
    RAISE EXCEPTION 'Required role polismart_runtime is absent; complete the separately authorized role bootstrap first';
  END IF;

  REVOKE ALL PRIVILEGES ON TABLE
    "User", "WorkflowModule", "AgentRun", "AgentStep", "ReviewCase",
    "ReadinessCheck", "ReadinessQuestion", "ReadinessSubmission", "AuditEvent",
    "auth_users", "organizations", "campaigns", "memberships", "permissions",
    "role_permissions", "auth_sessions", "email_verification_tokens",
    "password_reset_tokens", "security_audit_events", "campaign_leaders", "initiatives",
    "activities", "campaign_tasks", "task_dependencies", "geographic_levels",
    "geographic_areas", "campaign_events", "volunteers", "volunteer_assignments",
    "event_participation", "knowledge_documents", "knowledge_chunks", "data_sources",
    "survey_imports", "survey_questions", "survey_countries", "survey_regions",
    "survey_indicator_definitions", "survey_indicator_values", "survey_aggregate_results",
    "ai_conversations", "ai_messages", "ai_feedback", "policy_cases", "policy_evidence",
    "policy_options", "policy_revisions", "policy_approvals", "media_items", "communications",
    "communication_revisions", "communication_approvals", "ai_provider_records",
    "prompt_template_versions", "ai_usage_logs", "ai_error_reports", "fundraising_goals",
    "fundraising_contacts", "fundraising_contributions", "fundraising_activities",
    "fundraising_follow_ups", "fundraising_history", "prelaunch_leads",
    "prelaunch_lead_follow_ups"
  FROM "polismart_runtime";

  GRANT SELECT, INSERT ON TABLE "auth_users", "organizations", "campaigns", "memberships",
    "security_audit_events", "campaign_leaders", "initiatives", "activities", "campaign_tasks",
    "task_dependencies", "geographic_levels", "geographic_areas", "campaign_events", "volunteers",
    "volunteer_assignments", "event_participation", "knowledge_chunks", "ai_conversations",
    "ai_messages", "ai_feedback", "policy_cases", "policy_evidence", "policy_options",
    "policy_revisions", "policy_approvals", "media_items", "communications",
    "communication_revisions", "communication_approvals", "ai_provider_records",
    "prompt_template_versions", "ai_usage_logs", "ai_error_reports", "prelaunch_leads",
    "prelaunch_lead_follow_ups"
  TO "polismart_runtime";

  GRANT SELECT, INSERT, DELETE ON TABLE "auth_sessions", "email_verification_tokens",
    "password_reset_tokens", "knowledge_documents"
  TO "polismart_runtime";

  GRANT SELECT ON TABLE "survey_imports", "survey_aggregate_results" TO "polismart_runtime";

  GRANT UPDATE ("password_hash", "email_verified_at", "updated_at")
    ON TABLE "auth_users" TO "polismart_runtime";
  GRANT UPDATE ("name", "country", "election_type", "status", "starts_at", "ends_at", "updated_at")
    ON TABLE "campaigns" TO "polismart_runtime";
  GRANT UPDATE ("role", "status", "updated_at")
    ON TABLE "memberships" TO "polismart_runtime";
  GRANT UPDATE ("used_at", "updated_at")
    ON TABLE "email_verification_tokens", "password_reset_tokens" TO "polismart_runtime";
  GRANT UPDATE ("title", "description", "owner_id", "priority", "status", "due_at", "updated_at")
    ON TABLE "initiatives", "activities", "campaign_tasks" TO "polismart_runtime";
  GRANT UPDATE ("contact_authorized", "email", "phone", "availability", "languages", "skills", "training_status", "updated_at")
    ON TABLE "volunteers" TO "polismart_runtime";
  GRANT UPDATE ("extracted_text", "processing_status", "processing_error", "approval_status", "updated_at")
    ON TABLE "knowledge_documents" TO "polismart_runtime";
  GRANT UPDATE ("type", "note", "updated_at")
    ON TABLE "ai_feedback" TO "polismart_runtime";
  GRANT UPDATE ("status", "updated_at")
    ON TABLE "policy_cases", "communications", "prelaunch_leads" TO "polismart_runtime";
  GRANT UPDATE ("campaign_id", "headline", "publisher", "published_at", "topic", "geography", "source", "source_url", "summary", "aggregate_sentiment", "updated_at")
    ON TABLE "media_items" TO "polismart_runtime";
  GRANT UPDATE ("is_active", "updated_at")
    ON TABLE "ai_provider_records" TO "polismart_runtime";
  GRANT UPDATE ("completed_at", "completed_by_id")
    ON TABLE "prelaunch_lead_follow_ups" TO "polismart_runtime";
END
$$;
