-- Demo seed data for Agentic AI Workflows.
-- Run after applying prisma/migrations/0001_init_agentic_workflows.

INSERT INTO "User" (id, email, name, role, title, department) VALUES
  ('11111111-1111-4111-8111-111111111111', 'jordan@example.com', 'Jordan Kim', 'OPERATOR', 'Workflow Operator', 'Operations'),
  ('22222222-2222-4222-8222-222222222222', 'nora@example.com', 'Nora Patel', 'SUPERVISOR', 'Agent Supervisor', 'Automation CoE'),
  ('33333333-3333-4333-8333-333333333333', 'admin@example.com', 'Platform Admin', 'ADMIN', 'Platform Administrator', 'AI Governance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "WorkflowModule" (id, title, domain, level, minutes, "isPublished") VALUES
  ('44444444-4444-4444-8444-444444444444', 'Intake Triage Agent', 'Customer Operations', 'Production', 35, true),
  ('55555555-5555-4555-8555-555555555555', 'Research and Source Synthesis Agent', 'Knowledge Work', 'Pilot', 42, true),
  ('66666666-6666-4666-8666-666666666666', 'Human Approval and Exception Router', 'Governance', 'Production', 28, true),
  ('77777777-7777-4777-8777-777777777777', 'Audit, Drift, and Policy Monitor', 'Risk Operations', 'Advanced', 48, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "ReadinessCheck" (id, "workflowModuleId", title, domain) VALUES
  ('88888888-8888-4888-8888-888888888888', '66666666-6666-4666-8666-666666666666', 'Agentic Workflow Readiness Check', 'Workflow Governance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "ReadinessQuestion" ("readinessCheckId", prompt, options, "answerIndex") VALUES
  ('88888888-8888-4888-8888-888888888888', 'What should happen before an autonomous agent sends a high-impact external response?', '["Route to a human approval step", "Send immediately", "Delete the audit log", "Bypass policy checks"]'::jsonb, 0),
  ('88888888-8888-4888-8888-888888888888', 'Which input is safest for an agentic workflow test run?', '["Production credentials", "Synthetic customer ticket", "Private payroll file", "Unredacted medical record"]'::jsonb, 1);

INSERT INTO "AgentRun" (
  id,
  "operatorId",
  "workflowModuleId",
  "automationGoal",
  "dataSensitivity",
  "riskLevel",
  confidence,
  "toolReference"
) VALUES
  (
    '99999999-9999-4999-8999-999999999999',
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555555',
    'Automate routine support triage while keeping refunds human-approved',
    'Synthetic workflow data',
    'MEDIUM',
    87,
    'https://internal.example.com/support-policy'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO "ReviewCase" (
  id,
  "agentRunId",
  "reviewerId",
  status,
  trigger,
  decision,
  "dueAt"
) VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '99999999-9999-4999-8999-999999999999',
    '22222222-2222-4222-8222-222222222222',
    'OPEN',
    'Low-confidence refund recommendation',
    'Escalate to supervisor',
    CURRENT_TIMESTAMP + INTERVAL '4 hours'
  )
ON CONFLICT (id) DO NOTHING;
