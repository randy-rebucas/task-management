import { withPermission, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { createClientSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
export const GET = withPermission("crm:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const { skip, limit, page } = getPaginationParams(url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const assignedTo = url.searchParams.get("assignedTo") || "";

  const filter: Record<string, unknown> = {};
  if (search) filter.$text = { $search: search };
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;

  const [data, total] = await Promise.all([
    models.Client.find(filter)
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("department", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.Client.countDocuments(filter),
  ]);

  return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const POST = withPermission("crm:create", async (req, _ctx, session, models) => {
  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const client = await models.Client.create({ ...parsed.data, createdBy: session.user.id });

  await logActivity({
    actor: session.user.id,
    action: "client.created",
    resource: "client",
    resourceId: (client as any)._id.toString(),
    details: { name: (client as any).name },
    req,
  });

  return apiSuccess(client, 201);
});
