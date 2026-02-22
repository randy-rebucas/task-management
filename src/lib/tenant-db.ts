/**
 * Per-tenant database connection manager.
 * Each tenant gets its own MongoDB database (e.g., "tenant_acme").
 * Connections are cached globally to avoid re-connecting on every request.
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

function getTenantUri(dbName: string): string {
  const url = new URL(MONGODB_URI);
  url.pathname = `/${dbName}`;
  return url.toString();
}

declare global {
  // eslint-disable-next-line no-var
  var __tenantConnections: Map<string, mongoose.Connection> | undefined;
}

const connectionCache: Map<string, mongoose.Connection> =
  global.__tenantConnections ?? new Map();
global.__tenantConnections = connectionCache;

/**
 * Get (or lazily create) a Mongoose connection for the given tenant DB name.
 */
export async function getTenantConnection(
  dbName: string
): Promise<mongoose.Connection> {
  if (connectionCache.has(dbName)) {
    return connectionCache.get(dbName)!;
  }

  const uri = getTenantUri(dbName);
  const conn = mongoose.createConnection(uri, { bufferCommands: false });
  await conn.asPromise();
  connectionCache.set(dbName, conn);
  return conn;
}

/**
 * Generate a deterministic DB name from a tenant slug.
 * e.g. "acme" → "tenant_acme"
 */
export function tenantDbName(slug: string): string {
  return `tenant_${slug.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}
