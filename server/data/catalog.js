export const roles = [
  {
    id: "candidate",
    label: "Candidate",
    permissions: ["view_dashboard", "approve_content", "review_strategy"],
  },
  {
    id: "campaign-manager",
    label: "Campaign Manager",
    permissions: ["manage_events", "manage_regions", "assign_staff"],
  },
  {
    id: "communications",
    label: "Communications Director",
    permissions: ["create_content", "approve_messages", "view_sentiment"],
  },
  {
    id: "volunteer-coordinator",
    label: "Volunteer Coordinator",
    permissions: ["manage_volunteers", "assign_tasks", "check_in_events"],
  },
  {
    id: "finance",
    label: "Finance Officer",
    permissions: ["track_donations", "issue_receipts", "export_compliance"],
  },
  {
    id: "administrator",
    label: "Administrator",
    permissions: ["manage_users", "configure_compliance", "view_audit_logs"],
  },
];

export const organizations = [
  {
    id: "africa-campaign-ai-demo",
    name: "AfricaCampaignAI Demo Campaign",
    country: "Ghana",
    region: "National",
    supporters: 184200,
    plan: "Enterprise",
  },
  {
    id: "lagos-civic-coalition",
    name: "Lagos Civic Coalition",
    country: "Nigeria",
    region: "South West",
    supporters: 96300,
    plan: "Growth",
  },
  {
    id: "nairobi-reform-ticket",
    name: "Nairobi Reform Ticket",
    country: "Kenya",
    region: "Nairobi County",
    supporters: 52100,
    plan: "Pilot",
  },
];

export const campaignModules = [
  {
    id: "dashboard",
    title: "Campaign Dashboard",
    subject: "Command Center",
    level: "Production",
    progress: 92,
    minutes: 30,
    lessons: 8,
  },
  {
    id: "speech-writer",
    title: "AI Speech Writer",
    subject: "Communications",
    level: "Production",
    progress: 88,
    minutes: 35,
    lessons: 9,
  },
  {
    id: "manifesto",
    title: "Manifesto Builder",
    subject: "Policy",
    level: "Production",
    progress: 84,
    minutes: 45,
    lessons: 10,
  },
  {
    id: "content-studio",
    title: "Campaign Content Studio",
    subject: "Media",
    level: "Production",
    progress: 90,
    minutes: 32,
    lessons: 8,
  },
  {
    id: "volunteers",
    title: "Volunteer Management",
    subject: "Field Operations",
    level: "Production",
    progress: 86,
    minutes: 40,
    lessons: 7,
  },
  {
    id: "events",
    title: "Event Management",
    subject: "Mobilization",
    level: "Production",
    progress: 82,
    minutes: 38,
    lessons: 7,
  },
  {
    id: "crm",
    title: "Voter Engagement CRM",
    subject: "Supporter Care",
    level: "Pilot",
    progress: 76,
    minutes: 42,
    lessons: 8,
  },
  {
    id: "sentiment",
    title: "AI Sentiment Analysis",
    subject: "Listening",
    level: "Pilot",
    progress: 74,
    minutes: 36,
    lessons: 6,
  },
  {
    id: "fundraising",
    title: "Fundraising Compliance",
    subject: "Finance",
    level: "Production",
    progress: 80,
    minutes: 44,
    lessons: 8,
  },
];

export const lessons = [
  {
    id: "lesson-speech",
    courseId: "speech-writer",
    title: "Draft multilingual speeches with citations and compliance review",
    type: "guided",
    completed: true,
  },
  {
    id: "lesson-compliance",
    courseId: "fundraising",
    title: "Configure country rules for donations, receipts, and spending reports",
    type: "workflow",
    completed: true,
  },
  {
    id: "lesson-field",
    courseId: "volunteers",
    title: "Assign volunteers by skills, geography, and availability",
    type: "operations",
    completed: false,
  },
  {
    id: "lesson-sentiment",
    courseId: "sentiment",
    title: "Summarize public issues without protected-attribute profiling",
    type: "model",
    completed: false,
  },
];

export const classroomSessions = [
  {
    id: "national-war-room",
    title: "National Campaign Command",
    instructor: "Campaign Manager",
    startsAt: "2026-07-11T09:00:00-04:00",
    learners: 64,
    raisedHands: 6,
    roomCode: "ACC-GHA-2026",
    zoomUrl: "https://meet.example/campaign-command",
    attendanceRate: 96,
  },
];

export const analytics = [
  { week: "Jun 01", engagement: 58, volunteers: 2300, donations: 38, sentiment: 51, events: 14 },
  { week: "Jun 08", engagement: 63, volunteers: 2850, donations: 44, sentiment: 54, events: 18 },
  { week: "Jun 15", engagement: 68, volunteers: 3400, donations: 49, sentiment: 57, events: 22 },
  { week: "Jun 22", engagement: 71, volunteers: 4120, donations: 55, sentiment: 60, events: 28 },
  { week: "Jun 29", engagement: 75, volunteers: 4890, donations: 62, sentiment: 64, events: 31 },
  { week: "Jul 06", engagement: 79, volunteers: 5620, donations: 69, sentiment: 67, events: 35 },
];

export const assessments = [
  {
    id: "quiz-campaign-governance",
    title: "Ethical Campaign AI Governance Readiness",
    subject: "Compliance and Safety",
    passingScore: 75,
    certificateEligible: true,
    questions: [
      {
        id: "q1",
        prompt: "Which practice is required before publishing AI-generated campaign content?",
        options: [
          "Publish immediately",
          "Fact-check, cite sources, and log approval",
          "Target opponents' private lives",
          "Hide sponsorship details",
        ],
        answer: 1,
      },
      {
        id: "q2",
        prompt: "What should the platform avoid when analyzing sentiment?",
        options: [
          "Topic summaries",
          "Protected-attribute inference and microtargeting",
          "Issue clustering",
          "Aggregate regional dashboards",
        ],
        answer: 1,
      },
      {
        id: "q3",
        prompt: "A donation workflow should be controlled by:",
        options: [
          "Country-specific legal rules and audit records",
          "Anonymous cash collection only",
          "No receipts",
          "Untracked personal accounts",
        ],
        answer: 0,
      },
    ],
  },
];

export const scenarioSimulations = [
  {
    id: "claim-electricity",
    channel: "Press",
    difficulty: "Moderate",
    title: "Infrastructure claim needs verification",
    content:
      "A draft press release claims the campaign will double electricity access in 100 days without naming a funding source or baseline.",
    redFlags: ["Unsupported claim", "Budget gap", "Timeline risk", "Fact-check required"],
    safeAction:
      "Request source data, convert the claim into a qualified commitment, attach policy assumptions, and route for legal and manifesto review.",
  },
  {
    id: "whatsapp-rumor",
    channel: "WhatsApp",
    difficulty: "Advanced",
    title: "Opponent rumor in volunteer group",
    content:
      "A volunteer asks the media team to create messages about an unverified personal allegation against an opponent.",
    redFlags: [
      "Personal allegation",
      "Unverified source",
      "Defamation risk",
      "Misinformation risk",
    ],
    safeAction:
      "Reject the content request, document the decision, and redirect messaging toward verified policy contrasts.",
  },
  {
    id: "event-checkin",
    channel: "Field",
    difficulty: "Beginner",
    title: "Rally check-in data export",
    content:
      "A regional team wants to export event attendees with phone numbers to a personal laptop for door-to-door follow-up.",
    redFlags: [
      "Personal data export",
      "Device security risk",
      "Consent check",
      "Access control needed",
    ],
    safeAction:
      "Keep the data inside the CRM, confirm consent, assign outreach tasks by role, and write an audit event.",
  },
];

export const scamSimulations = scenarioSimulations;

export const promptExercises = [
  {
    id: "prompt-speech",
    level: "Speech",
    audience: "Candidate",
    task: "Generate a town hall speech with local issues, factual claims, citations, and a hopeful but non-divisive tone.",
  },
  {
    id: "prompt-manifesto",
    level: "Policy",
    audience: "Manifesto Team",
    task: "Draft a sector policy with goals, implementation steps, budget assumptions, and measurable indicators.",
  },
  {
    id: "prompt-social",
    level: "Content",
    audience: "Communications",
    task: "Create multilingual social posts that disclose campaign source and avoid misinformation or voter suppression.",
  },
];

export const jobTemplates = [
  {
    id: "workflow-rally",
    title: "Rally logistics",
    strengths: ["Venue checklist", "Volunteer roster", "QR check-in"],
  },
  {
    id: "workflow-donation",
    title: "Donation compliance",
    strengths: ["Donor eligibility", "Receipt generation", "Report export"],
  },
  {
    id: "workflow-content",
    title: "Content approval",
    strengths: ["Fact-check", "Legal review", "Publishing calendar"],
  },
];

export const certificates = [
  {
    id: "control-election-law",
    title: "Election Law Compliance Pack",
    status: "Ready for review",
    progress: 93,
    approver: "Legal and Compliance",
  },
  {
    id: "control-ai-ethics",
    title: "AI Ethics and Transparency Controls",
    status: "Ready for review",
    progress: 91,
    approver: "Campaign Governance Board",
  },
  {
    id: "control-security",
    title: "Security and RBAC Baseline",
    status: "In progress",
    progress: 78,
    approver: "Platform Administrator",
  },
];

export const campaignTasks = [
  {
    id: "CNT-2401",
    category: "Speech",
    urgency: "High",
    owner: "Communications",
    status: "Fact-check",
    eta: "3h",
    confidence: 89,
  },
  {
    id: "EVT-1188",
    category: "Town hall",
    urgency: "Medium",
    owner: "Regional Coordinator",
    status: "Logistics",
    eta: "1d",
    confidence: 84,
  },
  {
    id: "FIN-3310",
    category: "Donation batch",
    urgency: "High",
    owner: "Finance Officer",
    status: "Compliance review",
    eta: "2h",
    confidence: 92,
  },
  {
    id: "CRM-7750",
    category: "Supporter follow-up",
    urgency: "Standard",
    owner: "Volunteer Coordinator",
    status: "Segmented",
    eta: "6h",
    confidence: 87,
  },
];

export const regionalPerformance = [
  {
    region: "Greater Accra",
    supporters: 48200,
    volunteers: 1420,
    sentiment: 71,
    priority: "Youth jobs",
  },
  {
    region: "Ashanti",
    supporters: 39200,
    volunteers: 1160,
    sentiment: 64,
    priority: "Healthcare access",
  },
  {
    region: "Northern",
    supporters: 24700,
    volunteers: 760,
    sentiment: 59,
    priority: "Agriculture and roads",
  },
  {
    region: "Western",
    supporters: 22100,
    volunteers: 690,
    sentiment: 62,
    priority: "Small business credit",
  },
];

export const events = [
  {
    id: "EVT-01",
    title: "Youth Jobs Town Hall",
    location: "Accra",
    type: "Town hall",
    rsvp: 1260,
    checkedIn: 918,
    date: "2026-07-18",
  },
  {
    id: "EVT-02",
    title: "Market Women Listening Tour",
    location: "Kumasi",
    type: "Community outreach",
    rsvp: 840,
    checkedIn: 602,
    date: "2026-07-20",
  },
  {
    id: "EVT-03",
    title: "Agriculture Policy Forum",
    location: "Tamale",
    type: "Policy forum",
    rsvp: 520,
    checkedIn: 0,
    date: "2026-07-24",
  },
];

export const sentimentTopics = [
  { topic: "Cost of living", positive: 34, neutral: 38, negative: 28 },
  { topic: "Youth employment", positive: 46, neutral: 33, negative: 21 },
  { topic: "Healthcare", positive: 39, neutral: 36, negative: 25 },
  { topic: "Security", positive: 31, neutral: 40, negative: 29 },
];

export const architectureLayers = [
  "Next.js or React campaign workspace with mobile-responsive role views",
  "FastAPI/Express API gateway with JWT, OAuth, MFA, RBAC, rate limiting, and audit logging",
  "PostgreSQL campaign system of record with Redis queues and encrypted backups",
  "OpenAI API, RAG knowledge base, vector database, and LangGraph-style approval workflows",
  "Country compliance configuration for election law, donations, privacy, and content disclaimers",
  "Payment, SMS, WhatsApp, email, social, GIS, and media storage integrations",
  "Docker, Kubernetes, CI/CD, SAST, secrets management, monitoring, and disaster recovery",
];
