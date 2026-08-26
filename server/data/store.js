import {
  analytics,
  architectureLayers,
  assessments,
  campaignModules,
  campaignTasks,
  certificates,
  classroomSessions,
  events,
  jobTemplates,
  lessons,
  organizations,
  promptExercises,
  regionalPerformance,
  roles,
  scenarioSimulations,
  sentimentTopics,
} from "./catalog.js";

const users = new Map([
  [
    "candidate-demo",
    {
      id: "candidate-demo",
      name: "Amina Mensah",
      email: "candidate@africacampaign.ai",
      role: "candidate",
      title: "Candidate",
      organizationId: "africa-campaign-ai-demo",
    },
  ],
  [
    "manager-demo",
    {
      id: "manager-demo",
      name: "Kwame Boateng",
      email: "manager@africacampaign.ai",
      role: "campaign-manager",
      title: "Campaign Manager",
      organizationId: "africa-campaign-ai-demo",
    },
  ],
  [
    "communications-demo",
    {
      id: "communications-demo",
      name: "Nadia Okafor",
      email: "comms@africacampaign.ai",
      role: "communications",
      title: "Communications Director",
      organizationId: "africa-campaign-ai-demo",
    },
  ],
  [
    "volunteer-demo",
    {
      id: "volunteer-demo",
      name: "Thandi Ndlovu",
      email: "volunteers@africacampaign.ai",
      role: "volunteer-coordinator",
      title: "Volunteer Coordinator",
      organizationId: "africa-campaign-ai-demo",
    },
  ],
  [
    "finance-demo",
    {
      id: "finance-demo",
      name: "Samuel Adeyemi",
      email: "finance@africacampaign.ai",
      role: "finance",
      title: "Finance Officer",
      organizationId: "africa-campaign-ai-demo",
    },
  ],
  [
    "administrator-demo",
    {
      id: "administrator-demo",
      name: "Platform Admin",
      email: "admin@africacampaign.ai",
      role: "administrator",
      title: "Administrator",
    },
  ],
]);

const sessions = new Map();
const chatMessages = [];
const handQueue = [];
const whiteboardEvents = [];
const submissions = [];
const usageLogs = [];
const certificatesIssued = [];
const auditLogs = [
  {
    id: "audit-1",
    actor: "legal@africacampaign.ai",
    action: "APPROVED_CONTENT_POLICY",
    entity: "country-gh",
    at: new Date().toISOString(),
  },
  {
    id: "audit-2",
    actor: "system",
    action: "AI_RECOMMENDATION_REVIEWED",
    entity: "strategy-assistant",
    at: new Date().toISOString(),
  },
];

export const store = {
  users,
  sessions,
  chatMessages,
  handQueue,
  whiteboardEvents,
  submissions,
  usageLogs,
  certificatesIssued,
  auditLogs,
  getCatalog() {
    return {
      roles,
      organizations,
      modules: campaignModules,
      lessons,
      classrooms: classroomSessions,
      analytics,
      assessments,
      scamSimulations: scenarioSimulations,
      promptExercises,
      jobTemplates,
      certificates,
      operationalTickets: campaignTasks,
      deviceHealth: regionalPerformance,
      regionalPerformance,
      events,
      sentimentTopics,
      architectureLayers,
      auditLogs,
    };
  },
};
