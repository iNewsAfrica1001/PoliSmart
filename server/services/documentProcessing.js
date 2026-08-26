import { createHash, randomUUID } from "node:crypto";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import yauzl from "yauzl";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TYPES = Object.freeze({
  ".pdf": {
    mediaTypes: ["application/pdf"],
    signature: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-",
  },
  ".docx": {
    mediaTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
      "application/octet-stream",
    ],
    signature: (buffer) => buffer[0] === 0x50 && buffer[1] === 0x4b,
  },
  ".txt": { mediaTypes: ["text/plain", "application/octet-stream"], signature: isSafeText },
  ".csv": {
    mediaTypes: [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
      "application/octet-stream",
    ],
    signature: isSafeText,
  },
});

function httpError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
function isSafeText(buffer) {
  if (buffer.includes(0)) return false;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    const controls = [...text].filter(
      (char) => char < " " && !["\n", "\r", "\t"].includes(char),
    ).length;
    return controls / Math.max(text.length, 1) < 0.01;
  } catch {
    return false;
  }
}
export function validateDocumentFile(file) {
  if (!file?.buffer?.length) throw httpError("A non-empty document file is required.");
  if (file.buffer.length > MAX_FILE_BYTES)
    throw httpError("Document exceeds the 10 MB upload limit.", 413);
  const extension = `.${String(file.originalname).split(".").pop()?.toLowerCase()}`;
  const expected = TYPES[extension];
  if (
    !expected ||
    !expected.mediaTypes.includes(String(file.mimetype).toLowerCase()) ||
    !expected.signature(file.buffer)
  )
    throw httpError("File type or file signature is not allowed.");
  return {
    extension,
    mediaType: extension === ".docx" ? TYPES[extension].mediaTypes[0] : expected.mediaTypes[0],
    sha256: createHash("sha256").update(file.buffer).digest("hex"),
  };
}
export async function extractDocumentText(buffer, extension) {
  let text;
  if (extension === ".pdf") text = (await pdfParse(buffer, { max: 500 })).text;
  else if (extension === ".docx") {
    await validateDocxArchive(buffer);
    text = (await mammoth.extractRawText({ buffer })).value;
  } else text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) throw httpError("No extractable text was found in the document.", 422);
  if (normalized.length > 5_000_000)
    throw httpError("Extracted document text exceeds the processing limit.", 413);
  return normalized;
}
export function validateDocxArchive(buffer) {
  return new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(httpError("DOCX archive is invalid."));
      let entries = 0;
      let expanded = 0;
      let hasDocument = false;
      let settled = false;
      const fail = (message) => {
        if (settled) return;
        settled = true;
        zip.close();
        reject(httpError(message));
      };
      zip.on("entry", (entry) => {
        entries += 1;
        expanded += entry.uncompressedSize;
        if (entry.fileName === "word/document.xml") hasDocument = true;
        if (entries > 2000 || expanded > 25 * 1024 * 1024)
          return fail("DOCX archive exceeds safe processing limits.");
        if (
          (entry.generalPurposeBitFlag & 1) !== 0 ||
          entry.fileName.includes("..") ||
          entry.fileName.startsWith("/") ||
          /^[A-Za-z]:/.test(entry.fileName)
        )
          return fail("DOCX archive contains an unsafe entry.");
        zip.readEntry();
      });
      zip.on("end", () => {
        if (settled) return;
        settled = true;
        if (!hasDocument)
          return reject(httpError("DOCX archive does not contain a Word document."));
        resolve();
      });
      zip.on("error", () => fail("DOCX archive is invalid."));
      zip.readEntry();
    }),
  );
}
export function chunkDocument(text, { size = 1400, overlap = 180 } = {}) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end), text.lastIndexOf(" ", end));
      if (boundary > start + size * 0.6) end = boundary;
    }
    const content = text.slice(start, end).trim();
    if (content)
      chunks.push({
        chunkIndex: chunks.length,
        content,
        tokenEstimate: Math.ceil(content.length / 4),
        contentSha256: createHash("sha256").update(content).digest("hex"),
        embeddingStatus: "PENDING",
        metadata: { characterStart: start, characterEnd: end, embeddingPrepared: true },
      });
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
export function createStorageKey(tenantId, extension) {
  return `${tenantId}/${randomUUID()}${extension}`;
}
