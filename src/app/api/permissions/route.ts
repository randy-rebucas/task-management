import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import type { IPermission } from "@/types";
export const GET = withPermission("roles:view", async (_req, _ctx, _session, models) => {
  const permissions = await models.Permission.find().sort({ group: 1, resource: 1, action: 1 }).lean() as unknown as IPermission[];

  // Group by group field
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return apiSuccess({ permissions, grouped });
});
