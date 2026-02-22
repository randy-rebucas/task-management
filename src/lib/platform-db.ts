/**
 * Platform database connection.
 * Stores tenant registry (tenants collection) on a shared "platform" database.
 * Uses the same MONGODB_URI but connects to the "platform" DB.
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Derive the platform DB URI — replace the last path segment with "platform"
function getPlatformUri(): string {
  const url = new URL(MONGODB_URI);
  url.pathname = "/platform";
  return url.toString();
}

interface PlatformCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __platformDb: PlatformCache | undefined;
}

const cache: PlatformCache = global.__platformDb ?? { conn: null, promise: null };
global.__platformDb = cache;

export async function getPlatformDb(): Promise<mongoose.Connection> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = getPlatformUri();
    const conn = mongoose.createConnection(uri, { bufferCommands: false });
    cache.promise = conn.asPromise().then(() => conn);
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
