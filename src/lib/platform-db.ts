/**
 * Platform database connection.
 * Stores tenant registry (tenants collection) on a shared "platform" database.
 * Uses the same MONGODB_URI but connects to the "platform" DB.
 */
import mongoose from "mongoose";

// Derive the platform DB URI — replace the last path segment with "platform"
function getPlatformUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please define the MONGODB_URI environment variable");
  const url = new URL(uri);
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
