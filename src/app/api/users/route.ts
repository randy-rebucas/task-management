import { NextRequest } from "next/server";
import { withPermission, apiSuccess, apiError, getPaginationParams } from "@/lib/api-helpers";
import { createUserSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import User from "@/models/User";

export const GET = withPermission("users:view", async (req) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const search = url.searchParams.get("search") || "";
  const department = url.searchParams.get("department");
  const role = url.searchParams.get("role");
  const isActive = url.searchParams.get("isActive");

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (department) filter.department = department;
  if (role) filter.roles = role;
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    filter.isActive = isActive === "true";
  }

  const [data, total] = await Promise.all([
    User.find(filter)
      .populate("roles", "name slug")
      .populate("department", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const POST = withPermission("users:create", async (req, ctx, session) => {
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message);
  }

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return apiError("A user with this email already exists", 409);
  }

  const user = await User.create(parsed.data);

  await logActivity({
    actor: session.user.id,
    action: "user.created",
    resource: "user",
    resourceId: user._id.toString(),
    details: { email: user.email },
    req,
  });

  return apiSuccess(user, 201);
});
