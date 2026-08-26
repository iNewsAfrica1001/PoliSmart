import {
  chunkDocument,
  createStorageKey,
  extractDocumentText,
  validateDocumentFile,
} from "./documentProcessing.js";
const CATEGORIES = new Set([
  "MANIFESTO",
  "POLICY",
  "SPEECH",
  "RESEARCH",
  "CAMPAIGN_MANUAL",
  "STRATEGY",
  "APPROVED_COMMUNICATION",
  "PUBLIC_REPORT",
]);
const VISIBILITIES = new Set(["PRIVATE", "CAMPAIGN", "ORGANIZATION", "PUBLIC"]);
function enumValue(value, allowed, field) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
  if (!allowed.has(normalized))
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return normalized;
}
export function parseDocumentMetadata(body) {
  const title = String(body?.title ?? "").trim();
  if (title.length < 2 || title.length > 200)
    throw Object.assign(new Error("title must be 2-200 characters."), { status: 400 });
  return {
    title,
    campaignId: String(body?.campaignId ?? ""),
    source:
      String(body?.source ?? "")
        .trim()
        .slice(0, 500) || null,
    author:
      String(body?.author ?? "")
        .trim()
        .slice(0, 200) || null,
    category: enumValue(body?.category, CATEGORIES, "category"),
    tags: [
      ...new Set(
        String(body?.tags ?? "")
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 30),
    visibility: enumValue(body?.visibility ?? "CAMPAIGN", VISIBILITIES, "visibility"),
    approvalStatus: "DRAFT",
  };
}
export function createKnowledgeBaseService(repository, storage) {
  return {
    async upload({ tenantId, actorId, file, body }) {
      const metadata = parseDocumentMetadata(body);
      if (
        !metadata.campaignId ||
        (await repository.campaignExists(tenantId, metadata.campaignId)) !== 1
      )
        throw Object.assign(new Error("Campaign not found in this organization."), { status: 404 });
      const validated = validateDocumentFile(file);
      const storageKey = createStorageKey(tenantId, validated.extension);
      const document = await repository.createPending({
        ...metadata,
        tenantId,
        uploadedById: actorId,
        originalFilename: String(file.originalname).slice(0, 255),
        mediaType: validated.mediaType,
        fileExtension: validated.extension,
        fileSizeBytes: file.buffer.length,
        sha256: validated.sha256,
        storageKey,
        processingStatus: "PROCESSING",
      });
      try {
        await storage.put(storageKey, file.buffer);
        const text = await extractDocumentText(file.buffer, validated.extension);
        const chunks = chunkDocument(text);
        return await repository.complete(document.id, tenantId, text, chunks);
      } catch (error) {
        await storage.remove(storageKey).catch(() => {});
        await repository.fail(document.id, tenantId, "Document processing failed.");
        throw Object.assign(new Error("Document processing failed."), {
          status: error.status >= 400 && error.status < 500 ? error.status : 422,
        });
      }
    },
    async remove({ tenantId, id }) {
      const document = await repository.findForTenant(tenantId, id);
      if (!document) throw Object.assign(new Error("Document not found."), { status: 404 });
      const result = await repository.deleteForTenant(tenantId, id);
      if (result.count) await storage.remove(document.storageKey);
      return result.count === 1;
    },
  };
}
