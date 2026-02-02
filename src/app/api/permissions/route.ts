import { withPermission, apiSuccess } from "@/lib/api-helpers";
import Permission from "@/models/Permission";

export const GET = withPermission("roles:view", async () => {
  const permissions = await Permission.find().sort({ group: 1, resource: 1, action: 1 }).lean();

  // Group by group field
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return apiSuccess({ permissions, grouped });
});
