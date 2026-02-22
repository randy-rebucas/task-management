import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createInteractionSchema } from "@/features/auth/validators";
export const GET = withPermission("crm:view", async (_req, ctx, _session, models) => {
  const { clientId } = await ctx.params;
  const interactions = await models.CrmInteraction.find({ client: clientId })
    .sort({ date: -1 })
    .populate("loggedBy", "firstName lastName email avatar");
  return apiSuccess(interactions);
});

export const POST = withPermission("crm:update", async (req, ctx, session, models) => {
  const { clientId } = await ctx.params;
  const body = await req.json();
  const parsed = createInteractionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const interaction = await models.CrmInteraction.create({
    ...parsed.data,
    client: clientId,
    loggedBy: session.user.id,
  });
  const populated = await interaction.populate("loggedBy", "firstName lastName email avatar");
  return apiSuccess(populated, 201);
});
