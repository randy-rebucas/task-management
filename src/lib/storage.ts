/**
 * Storage abstraction layer.
 *
 * Today: writes files to the local `public/uploads/` filesystem.
 * To switch to cloud (S3), set the following env vars:
 *   STORAGE_PROVIDER=s3
 *   AWS_REGION=us-east-1
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_S3_BUCKET=my-bucket-name
 *   AWS_S3_CDN_URL=https://cdn.example.com  (optional, CDN prefix)
 *
 * Environment variable `STORAGE_PROVIDER`:
 *   "local"  (default) — writes to public/uploads/{scope}/
 *   "s3"               — uploads to AWS S3 (or any S3-compatible store)
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

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

// ── S3 provider ───────────────────────────────────────────────────────────

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

const s3StorageProvider: StorageProvider = {
  async upload(scope, fileName, buffer) {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error("AWS_S3_BUCKET env var is not set.");

    const key = `uploads/${scope}/${fileName}`;

    const upload = new Upload({
      client: getS3Client(),
      params: {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        // Let S3 infer content-type; callers may extend this if needed
      },
    });

    await upload.done();

    const cdnBase = process.env.AWS_S3_CDN_URL?.replace(/\/$/, "");
    const fileUrl = cdnBase
      ? `${cdnBase}/${key}`
      : `https://${bucket}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/${key}`;

    return { fileUrl, storedName: fileName };
  },

  async delete(fileUrl) {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) return;

    // Extract the S3 key from either a CDN URL or a direct S3 URL
    const cdnBase = process.env.AWS_S3_CDN_URL?.replace(/\/$/, "");
    let key: string;
    if (cdnBase && fileUrl.startsWith(cdnBase)) {
      key = fileUrl.slice(cdnBase.length + 1);
    } else {
      // https://{bucket}.s3.{region}.amazonaws.com/{key}
      const match = fileUrl.match(/amazonaws\.com\/(.+)$/);
      if (!match) return;
      key = match[1];
    }

    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
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
