import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

export function createLocalDocumentStorage(rootDirectory) {
  const root = path.resolve(rootDirectory);
  function resolveKey(key) {
    const target = path.resolve(root, key);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage key.");
    return target;
  }
  return {
    async put(key, buffer) {
      const target = resolveKey(key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, buffer, { flag: "wx", mode: 0o600 });
    },
    async remove(key) {
      try {
        await fs.unlink(resolveKey(key));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    },
  };
}

export function createVercelBlobDocumentStorage(token) {
  const authentication = token ? { token } : {};
  return {
    async put(key, buffer) {
      await put(key, buffer, {
        access: "private",
        addRandomSuffix: false,
        ...authentication,
      });
    },
    async remove(key) {
      await del(key, authentication);
    },
  };
}

export function createDocumentStorage(config) {
  if (config.storageProvider === "vercel-blob")
    return createVercelBlobDocumentStorage(config.blobReadWriteToken);
  if (config.storageProvider === "local")
    return createLocalDocumentStorage(config.documentStoragePath);
  throw new Error(`Unsupported document storage provider: ${config.storageProvider}`);
}
