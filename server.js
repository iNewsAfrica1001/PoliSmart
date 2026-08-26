import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { loadConfig, validateProductionEnvironment } from "./server/config/env.js";
import {
  securityHeaders,
  assignRequestId,
  logRequest,
  rateLimit,
  createApiErrorHandler,
} from "./server/middleware/http.js";
import { createAiRouter } from "./server/routes/ai.js";
import { createAuthRouter } from "./server/routes/auth.js";
import { createCampaignRouter } from "./server/routes/campaigns.js";
import { createOperationsRouter } from "./server/routes/operations.js";
import { createKnowledgeRouter } from "./server/routes/knowledge.js";
import { createPublicIntelligenceRouter } from "./server/routes/publicIntelligence.js";
import { createCommandCenterRouter } from "./server/routes/commandCenter.js";
import { createIntelligenceWorkflowsRouter } from "./server/routes/intelligenceWorkflows.js";
import { createGovernanceRouter } from "./server/routes/governance.js";
import { createAssessmentRouter } from "./server/routes/assessments.js";
import { createClassroomRouter } from "./server/routes/classrooms.js";
import { createTrainingRouter } from "./server/routes/training.js";
import {
  authenticateRequests,
  requireSession,
  requireTenantPermission,
} from "./server/middleware/authentication.js";
import { prisma } from "./server/data/prisma.js";
import { createCampaignRepository } from "./server/repositories/campaignRepository.js";
import { createOperationsRepository } from "./server/repositories/operationsRepository.js";
import { createKnowledgeRepository } from "./server/repositories/knowledgeRepository.js";
import { createPublicIntelligenceRepository } from "./server/repositories/publicIntelligenceRepository.js";
import { createCommandCenterRepository } from "./server/repositories/commandCenterRepository.js";
import { createIntelligenceWorkflowRepository } from "./server/repositories/intelligenceWorkflowRepository.js";
import { createGovernanceRepository } from "./server/repositories/governanceRepository.js";
import { createAiRepository } from "./server/repositories/aiRepository.js";
import { createAuthenticationService } from "./server/services/authentication.js";
import { createAccountNotificationService } from "./server/services/accountNotifications.js";
import { createKnowledgeBaseService } from "./server/services/knowledgeBase.js";
import { createAiProvider } from "./server/services/aiProvider.js";
import { createAiAssistantService, createAiRateLimiter } from "./server/services/aiAssistant.js";
import { createIntelligenceWorkflowService } from "./server/services/intelligenceWorkflows.js";
import { createGovernanceService } from "./server/services/governance.js";
import { createDocumentStorage } from "./server/services/documentStorage.js";
import { registerClassroomSockets } from "./server/sockets/classroom.js";
import { PERMISSIONS } from "./server/config/authorization.js";

const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig(__dirname);
const productionEnvironmentErrors = validateProductionEnvironment(config);
if (productionEnvironmentErrors.length)
  throw new Error(`Invalid production environment: ${productionEnvironmentErrors.join(" ")}`);
const authService = createAuthenticationService(prisma, {
  tokenSecret: config.sessionSecret,
  notifications: createAccountNotificationService(config),
});
const knowledgeRepository = createKnowledgeRepository(prisma);
const knowledgeService = createKnowledgeBaseService(
  knowledgeRepository,
  createDocumentStorage(config),
);
const publicIntelligenceRepository = createPublicIntelligenceRepository(prisma);
const governanceRepository = createGovernanceRepository(prisma);
const governanceService = createGovernanceService(governanceRepository);
const aiProvider = createAiProvider(config);
const aiService = createAiAssistantService({
  repository: createAiRepository(prisma),
  intelligenceRepository: publicIntelligenceRepository,
  provider: aiProvider,
  governance: governanceService,
});
const intelligenceWorkflowRepository = createIntelligenceWorkflowRepository(prisma);
const io = new Server(server, {
  cors: { origin: config.clientOrigins, methods: ["GET", "POST"], credentials: true },
  connectionStateRecovery: { maxDisconnectionDuration: 120_000 },
  pingTimeout: 20_000,
  pingInterval: 25_000,
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors({ origin: config.clientOrigins, credentials: true }));
app.use(express.json({ limit: config.jsonLimit }));
app.use(assignRequestId);
app.use(securityHeaders({ isProduction: config.isProduction }));
app.use(logRequest);
app.use(
  "/api",
  rateLimit({ windowMs: config.rateLimitWindowMs, maxRequests: config.rateLimitMaxRequests }),
);

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "PoliSmart Africa AI",
    env: config.env,
    persistence: config.persistenceMode,
    documentStorage: config.storageProvider,
    databaseConfigured: Boolean(config.databaseUrl),
    llmConfigured: aiProvider.isConfigured,
    at: new Date().toISOString(),
  });
});

app.get("/api/ready", async (_request, response) => {
  let databaseReachable = false;
  if (config.databaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch {
      databaseReachable = false;
    }
  }
  const checks = {
    staticBuild: config.isDistReady(),
    productionEnvironment: productionEnvironmentErrors.length === 0,
    originConfigured: config.clientOrigins.length > 0,
    realtime: io.engine.clientsCount >= 0,
    databaseConfigured: Boolean(config.databaseUrl),
    databaseReachable,
    llmConfigured: aiProvider.isConfigured,
  };
  const ready =
    checks.staticBuild &&
    checks.productionEnvironment &&
    checks.originConfigured &&
    checks.realtime &&
    (!config.isProduction ||
      (checks.databaseConfigured && checks.databaseReachable && checks.llmConfigured));
  response.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not-ready",
  });
});

app.use("/api", authenticateRequests(authService));
app.get(
  "/api/metrics",
  requireSession,
  requireTenantPermission(PERMISSIONS.PLATFORM_AUDIT_READ),
  (_request, response) => {
    const memory = process.memoryUsage();
    response.json({
      uptimeSeconds: Math.round(process.uptime()),
      connectedSockets: io.engine.clientsCount,
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
    });
  },
);
app.use("/api/auth", createAuthRouter({ authService, config, governance: governanceService }));
app.use("/api/campaigns", createCampaignRouter(createCampaignRepository(prisma)));
app.use("/api/operations", createOperationsRouter(createOperationsRepository(prisma)));
app.use("/api/command-center", createCommandCenterRouter(createCommandCenterRepository(prisma)));
app.use(
  "/api/workflows",
  createIntelligenceWorkflowsRouter({
    repository: intelligenceWorkflowRepository,
    service: createIntelligenceWorkflowService(intelligenceWorkflowRepository, governanceService),
    provider: aiProvider,
    governance: governanceService,
  }),
);
app.use("/api/governance", createGovernanceRouter(governanceRepository));
app.use(
  "/api/knowledge",
  createKnowledgeRouter({
    repository: knowledgeRepository,
    service: knowledgeService,
    governance: governanceService,
  }),
);
app.use("/api/intelligence", createPublicIntelligenceRouter(publicIntelligenceRepository));
app.use(
  "/api/ai",
  createAiRouter({
    service: aiService,
    rateLimiter: createAiRateLimiter({
      windowMs: config.aiRateLimitWindowMs,
      maxRequests: config.aiRateLimitMaxRequests,
    }),
  }),
);
app.use("/api/assessments", requireSession, createAssessmentRouter());
app.use("/api/classrooms", requireSession, createClassroomRouter(io));
app.use("/api/training", requireSession, createTrainingRouter());

app.use("/api", (request, response) => {
  response.status(404).json({
    message: "API route not found.",
    requestId: request.id,
  });
});

app.use("/api", createApiErrorHandler({ isProduction: config.isProduction }));

registerClassroomSockets(io);

app.use(
  express.static(path.join(__dirname, "dist"), {
    etag: true,
    maxAge: config.isProduction ? "1y" : 0,
    immutable: config.isProduction,
    setHeaders: (response, filePath) => {
      if (filePath.endsWith(".html")) response.setHeader("Cache-Control", "no-store");
    },
  }),
);

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(__dirname, "dist", "index.html"));
});

function shutdown(signal) {
  console.info(
    JSON.stringify({
      at: new Date().toISOString(),
      signal,
      message: "Shutting down PoliSmart Africa AI API",
    }),
  );
  const forceExit = setTimeout(() => {
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        signal,
        message: "Forced shutdown after timeout",
      }),
    );
    process.exit(1);
  }, 10_000);
  forceExit.unref();
  io.close();
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
}

if (!process.env.VERCEL) {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (error) => {
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        type: "unhandledRejection",
        message: error?.message || String(error),
      }),
    );
  });
  process.on("uncaughtException", (error) => {
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        type: "uncaughtException",
        message: error?.message || String(error),
      }),
    );
    shutdown("uncaughtException");
  });
  server.listen(config.port, config.host, () => {
    console.log(
      `PoliSmart Africa AI API listening on http://${config.host}:${config.port} in ${config.env} mode`,
    );
  });
}

export { app, config };
export default app;
