import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createKnowledgeRouter } from "../server/routes/knowledge.js";
import { chunkDocument, validateDocumentFile } from "../server/services/documentProcessing.js";
import {
  createKnowledgeBaseService,
  parseDocumentMetadata,
} from "../server/services/knowledgeBase.js";

function appFor(role, repository, service, tenantId = "org-a") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { user: { id: "user-a", memberships: [{ tenantId, role }] } };
    next();
  });
  app.use("/knowledge", createKnowledgeRouter({ repository, service }));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  return app;
}
const repositoryStub = { list: async () => [], updateApproval: async () => ({ count: 1 }) };

test("upload permissions deny readers and allow knowledge managers", async () => {
  let uploads = 0;
  const service = {
    upload: async () => {
      uploads += 1;
      return { id: "doc-a" };
    },
    remove: async () => true,
  };
  await request(appFor("ANALYST", repositoryStub, service))
    .post("/knowledge")
    .set("X-Organization-Id", "org-a")
    .field("title", "Policy")
    .attach("document", Buffer.from("safe text"), {
      filename: "policy.txt",
      contentType: "text/plain",
    })
    .expect(403);
  await request(appFor("CAMPAIGN_MANAGER", repositoryStub, service))
    .post("/knowledge")
    .set("X-Organization-Id", "org-a")
    .field("title", "Policy")
    .attach("document", Buffer.from("safe text"), {
      filename: "policy.txt",
      contentType: "text/plain",
    })
    .expect(201);
  assert.equal(uploads, 1);
});

test("tenant isolation rejects knowledge access through another organization header", async () => {
  let listed = false;
  const repository = {
    ...repositoryStub,
    list: async () => {
      listed = true;
      return [];
    },
  };
  await request(appFor("ANALYST", repository, { remove: async () => true }))
    .get("/knowledge?campaignId=campaign-b")
    .set("X-Organization-Id", "org-b")
    .expect(403);
  assert.equal(listed, false);
});

test("invalid file extensions and spoofed signatures are rejected", () => {
  assert.throws(
    () =>
      validateDocumentFile({
        originalname: "payload.exe",
        mimetype: "text/plain",
        buffer: Buffer.from("hello"),
      }),
    /not allowed/,
  );
  assert.throws(
    () =>
      validateDocumentFile({
        originalname: "fake.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("not a pdf"),
      }),
    /not allowed/,
  );
});

test("metadata is normalized and chunks are embedding-ready", () => {
  const metadata = parseDocumentMetadata({
    title: "  Public Health Policy  ",
    campaignId: "campaign-a",
    category: "policy",
    tags: "Health, health, Jobs",
    visibility: "campaign",
    author: "Demo Author",
    source: "Public record",
  });
  assert.deepEqual(metadata.tags, ["health", "jobs"]);
  assert.equal(metadata.category, "POLICY");
  assert.equal(metadata.approvalStatus, "DRAFT");
  const chunks = chunkDocument("A policy paragraph. ".repeat(200));
  assert.ok(chunks.length > 1);
  assert.equal(chunks[0].embeddingStatus, "PENDING");
  assert.equal(chunks[0].metadata.embeddingPrepared, true);
});

test("document deletion is tenant-scoped and removes stored content", async () => {
  let removedKey = null;
  let deletedTenant = null;
  const repository = {
    findForTenant: async (tenantId, id) =>
      tenantId === "org-a" && id === "doc-a" ? { id, storageKey: "org-a/file.txt" } : null,
    deleteForTenant: async (tenantId) => {
      deletedTenant = tenantId;
      return { count: 1 };
    },
  };
  const service = createKnowledgeBaseService(repository, {
    remove: async (key) => {
      removedKey = key;
    },
  });
  await assert.rejects(service.remove({ tenantId: "org-b", id: "doc-a" }), /not found/);
  assert.equal(await service.remove({ tenantId: "org-a", id: "doc-a" }), true);
  assert.equal(deletedTenant, "org-a");
  assert.equal(removedKey, "org-a/file.txt");
});

test("processing failures are recorded without leaking parser details", async () => {
  let failure = null;
  let storageRemoved = false;
  const repository = {
    campaignExists: async () => 1,
    createPending: async (data) => ({ id: "doc-failed", ...data }),
    complete: async () => {
      throw new Error("should not complete");
    },
    fail: async (_id, tenantId, message) => {
      failure = { tenantId, message };
    },
  };
  const storage = {
    put: async () => {},
    remove: async () => {
      storageRemoved = true;
    },
  };
  const service = createKnowledgeBaseService(repository, storage);
  await assert.rejects(
    service.upload({
      tenantId: "org-a",
      actorId: "user-a",
      body: {
        title: "Broken document",
        campaignId: "campaign-a",
        category: "policy",
        visibility: "campaign",
      },
      file: {
        originalname: "broken.docx",
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      },
    }),
    /processing failed/,
  );
  assert.deepEqual(failure, { tenantId: "org-a", message: "Document processing failed." });
  assert.equal(storageRemoved, true);
});
