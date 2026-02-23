/**
 * Storage abstraction layer.
 *
 * Today: writes files to the local `public/uploads/` filesystem.
 * To switch to cloud (S3, R2, Vercel Blob, etc.), replace the
 * `localStorageProvider` body with SDK calls — the rest of the
 * codebase only calls the three functions exported at the bottom.
 *
 * Environment variable `STORAGE_PROVIDER`:
 *   "local"  (default) — writes to public/uploads/{scope}/
 *   "s3"               — stub; swap in AWS SDK upload logic
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export interface UploadResult {
  /** Public URL (or key for cloud storage) */
  fileUrl: string;
  /** Name used on disk / in cloud */
  storedName: string;
}

type StorageProvider = {
  upload(scope: string, fileName: string, buffer: Buffer): Promise<UploadResult>;
  delete(fileUrl: string): Promise<void>;
};

// ── Local filesystem provider ──────────────────────────────────────────────

const localStorageProvider: StorageProvider = {
  async upload(scope, fileName, buffer) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", scope);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);
    return {
      fileUrl: `/uploads/${scope}/${fileName}`,
      storedName: fileName,
    };
  },

  async delete(fileUrl) {
    try {
      // fileUrl is like /uploads/{scope}/{file}
      const relative = fileUrl.replace(/^\/uploads\//, "");
      const filePath = path.join(process.cwd(), "public", "uploads", relative);
      await unlink(filePath);
    } catch {
      // Don't throw if file is already missing
    }
  },
};

// ── S3 provider stub (swap in real SDK calls when ready) ───────────────────

const s3StorageProvider: StorageProvider = {
  async upload(_scope, _fileName, _buffer) {
    // TODO: implement with @aws-sdk/client-s3
    // const client = new S3Client({ region: process.env.AWS_REGION });
    // await client.send(new PutObjectCommand({ Bucket, Key, Body: buffer }));
    throw new Error("S3 storage provider not yet configured.");
  },
  async delete(_fileUrl) {
    // TODO: implement delete from S3
    throw new Error("S3 storage provider not yet configured.");
  },
};

// ── Exported API ───────────────────────────────────────────────────────────

function getProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "s3") return s3StorageProvider;
  return localStorageProvider;
}

export async function uploadFile(
  scope: string,
  fileName: string,
  buffer: Buffer
): Promise<UploadResult> {
  return getProvider().upload(scope, fileName, buffer);
}

export async function deleteFile(fileUrl: string): Promise<void> {
  return getProvider().delete(fileUrl);
}
