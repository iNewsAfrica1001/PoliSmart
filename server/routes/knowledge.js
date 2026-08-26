import { Router } from "express";
import multer from "multer";
import { PERMISSIONS } from "../config/authorization.js";
import { requireSession, requireTenantPermission } from "../middleware/authentication.js";
import { asyncRoute } from "../middleware/http.js";
import { MAX_FILE_BYTES } from "../services/documentProcessing.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 20, fieldSize: 64 * 1024 },
});
function receiveDocument(request, response, next) {
  upload.single("document")(request, response, (error) => {
    if (error)
      return next(
        Object.assign(
          new Error(
            error.code === "LIMIT_FILE_SIZE"
              ? "Document exceeds the 10 MB upload limit."
              : "Invalid multipart upload.",
          ),
          { status: error.code === "LIMIT_FILE_SIZE" ? 413 : 400 },
        ),
      );
    next();
  });
}

export function createKnowledgeRouter({ repository, service, governance }) {
  const router = Router();
  router.use(requireSession);
  router.get(
    "/",
    requireTenantPermission(PERMISSIONS.KNOWLEDGE_READ),
    asyncRoute(async (request, response) => {
      const campaignId = String(request.query.campaignId ?? "");
      if (!campaignId) throw Object.assign(new Error("campaignId is required."), { status: 400 });
      response.json({
        documents: await repository.list(
          request.tenant.id,
          campaignId,
          request.auth.user.id,
          String(request.query.q ?? "")
            .trim()
            .slice(0, 200),
        ),
      });
    }),
  );
  router.post(
    "/",
    requireTenantPermission(PERMISSIONS.KNOWLEDGE_MANAGE),
    receiveDocument,
    asyncRoute(async (request, response) => {
      const document = await service.upload({
        tenantId: request.tenant.id,
        actorId: request.auth.user.id,
        file: request.file,
        body: request.body,
      });
      await governance?.audit({
        tenantId: request.tenant.id,
        actorId: request.auth.user.id,
        action: "DOCUMENT_UPLOAD",
        entity: "knowledge_document",
        entityId: document.id,
        metadata: { campaignId: document.campaignId || request.body.campaignId },
      });
      response.status(201).json({ document });
    }),
  );
  router.delete(
    "/:id",
    requireTenantPermission(PERMISSIONS.KNOWLEDGE_MANAGE),
    asyncRoute(async (request, response) => {
      await service.remove({ tenantId: request.tenant.id, id: request.params.id });
      await governance?.audit({
        tenantId: request.tenant.id,
        actorId: request.auth.user.id,
        action: "DOCUMENT_DELETE",
        entity: "knowledge_document",
        entityId: request.params.id,
      });
      response.status(204).end();
    }),
  );
  router.patch(
    "/:id/approval",
    requireTenantPermission(PERMISSIONS.KNOWLEDGE_APPROVE),
    asyncRoute(async (request, response) => {
      const status = String(request.body?.approvalStatus ?? "").toUpperCase();
      if (!["PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].includes(status))
        throw Object.assign(new Error("approvalStatus is invalid."), { status: 400 });
      const result = await repository.updateApproval(request.tenant.id, request.params.id, status);
      if (!result.count) throw Object.assign(new Error("Document not found."), { status: 404 });
      response.json({ updated: true });
    }),
  );
  return router;
}
