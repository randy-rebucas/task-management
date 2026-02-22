import { withPermission, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { createLeadSchema } from "@/features/auth/validators";
export const GET = withPermission("crm:view", async (req, _ctx, _session, models) => {
  const url = new URL(req.url);
  const { skip, limit, page } = getPaginationParams(url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const source = url.searchParams.get("source") || "";
  const assignedTo = url.searchParams.get("assignedTo") || "";

  const filter: Record<string, unknown> = {};
  if (search) filter.$text = { $search: search };
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;

  const [data, total] = await Promise.all([
    models.Lead.find(filter)
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("convertedToClient", "name company")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    models.Lead.countDocuments(filter),
  ]);

  return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const POST = withPermission("crm:create", async (req, _ctx, session, models) => {
  const body = await req.json();
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const lead = await models.Lead.create({ ...parsed.data, createdBy: session.user.id });
  return apiSuccess(lead, 201);
});
