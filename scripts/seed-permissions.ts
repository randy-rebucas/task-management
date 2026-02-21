/**
 * seed-permissions.ts
 *
 * Safely upserts permissions and roles without touching users,
 * workflow statuses, or app settings. Safe to run at any time —
 * including on a live deployment to pick up new permissions.
 *
 * Usage:
 *   npm run seed:permissions
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import Permission from "../src/models/Permission";
import Role from "../src/models/Role";

import { PERMISSIONS, ROLE_DEFINITIONS } from "../src/config/permissions";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/task-management";

async function seedPermissions() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.\n");

  // ── 1. Upsert Permissions ────────────────────────────────────────────────
  console.log("--- Upserting Permissions ---");
  for (const perm of PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { resource: perm.resource, action: perm.action },
      { $set: { description: perm.description, group: perm.group } },
      { upsert: true, new: true }
    );
  }

  const allPermissions = await Permission.find().lean();
  console.log(`  ${allPermissions.length} permissions in DB.`);

  // Warn about permissions in DB that are no longer in config
  const configKeys = new Set(PERMISSIONS.map((p) => `${p.resource}:${p.action}`));
  const orphaned = allPermissions.filter(
    (p) => !configKeys.has(`${p.resource}:${p.action}`)
  );
  if (orphaned.length > 0) {
    console.warn(
      `  ⚠ ${orphaned.length} orphaned permission(s) found in DB (not in config):`,
      orphaned.map((p) => `${p.resource}:${p.action}`).join(", ")
    );
  }

  // ── 2. Upsert Roles ──────────────────────────────────────────────────────
  console.log("\n--- Upserting Roles ---");
  for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
    const permIds = allPermissions
      .filter((p) =>
        (def.permissions as string[]).includes(`${p.resource}:${p.action}`)
      )
      .map((p) => p._id);

    // Warn about any permission strings in the role def that have no DB record
    const missing = (def.permissions as string[]).filter(
      (key) => !allPermissions.some((p) => `${p.resource}:${p.action}` === key)
    );
    if (missing.length > 0) {
      console.warn(
        `  ⚠ Role "${def.name}" references unknown permission(s): ${missing.join(", ")}`
      );
    }

    await Role.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: def.name,
          description: def.description,
          permissions: permIds,
          isSystem: true,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`  ✓ "${def.name}" — ${permIds.length} permission(s)`);
  }

  console.log("\n--- Done ---");
  await mongoose.disconnect();
  process.exit(0);
}

seedPermissions().catch((err) => {
  console.error("seed-permissions failed:", err);
  process.exit(1);
});
