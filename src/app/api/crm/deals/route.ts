import { withPermission, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { createDealSchema } from "@/features/auth/validators";
export const GET = withPermission("crm:view", async (req, _ctx) => {
  const url = new URL(req.url);
  const { skip, limit, page } = getPaginationParams(url);
  const search = url.searchParams.get("search") || "";
  const stage = url.searchParams.get("stage") || "";
  const assignedTo = url.searchParams.get("assignedTo") || "";

  const filter: Record<string, unknown> = {};
  if (search) filter.$text = { $search: search };
  if (stage) filter.stage = stage;
  if (assignedTo) filter.assignedTo = assignedTo;

  const [data, total] = await Promise.all([
    models.Deal.find(filter)
      .populate("lead", "name company email")
      .populate("client", "name company email")
      .populate("assignedTo", "firstName lastName email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    models.Deal.countDocuments(filter),
  ]);

  return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const POST = withPermission("crm:create", async (req, _ctx, session) => {
  const body = await req.json();
  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const deal = await models.Deal.create({ ...parsed.data, createdBy: session.user.id });
  return apiSuccess(deal, 201);
});
