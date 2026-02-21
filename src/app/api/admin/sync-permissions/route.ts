/**
 * POST /api/admin/sync-permissions
 *
 * Upserts all permissions and system roles from the config into the database.
 * Safe to call on a live DB — never deletes data.
 * Requires settings:manage (super-admin only in practice).
 */

import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import { dbConnect } from "@/lib/db";
import Permission from "@/models/Permission";
import Role from "@/models/Role";
import { PERMISSIONS, ROLE_DEFINITIONS } from "@/config/permissions";

export const POST = withPermission("settings:manage", async () => {
  await dbConnect();

  const results = {
    permissions: { added: 0, updated: 0, total: 0 },
    roles: { created: 0, updated: 0 },
  };

  // ── 1. Upsert permissions ───────────────────────────────────────────────
  for (const perm of PERMISSIONS) {
    const existing = await Permission.findOne({
      resource: perm.resource,
      action: perm.action,
    });

    if (!existing) {
      await Permission.create({ ...perm });
      results.permissions.added++;
    } else if (
      existing.description !== perm.description ||
      existing.group !== perm.group
    ) {
      await Permission.updateOne(
        { _id: existing._id },
        { description: perm.description, group: perm.group }
      );
      results.permissions.updated++;
    }
  }

  const allPermissions = await Permission.find().lean();
  results.permissions.total = allPermissions.length;

  // ── 2. Upsert system roles ──────────────────────────────────────────────
  for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
    const permIds = allPermissions
      .filter((p) =>
        (def.permissions as string[]).includes(`${p.resource}:${p.action}`)
      )
      .map((p) => p._id);

    const existing = await Role.findOne({ slug });

    if (!existing) {
      await Role.create({
        name: def.name,
        slug,
        description: def.description,
        permissions: permIds,
        isSystem: true,
        isActive: true,
      });
      results.roles.created++;
    } else {
      await Role.updateOne(
        { _id: existing._id },
        {
          name: def.name,
          description: def.description,
          permissions: permIds,
          isSystem: true,
          isActive: true,
        }
      );
      results.roles.updated++;
    }
  }

  return apiSuccess({ ok: true, results });
});
