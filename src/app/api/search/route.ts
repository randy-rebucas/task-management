import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";

const MAX_RESULTS_PER_ENTITY = 5;

export const GET = withAuth(async (req, _ctx, session, models) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return apiError("Query must be at least 2 characters.", 400);
  }

  const textFilter = { $text: { $search: q } };
  const scoreSort = { score: { $meta: "textScore" } };
  const limit = MAX_RESULTS_PER_ENTITY;

  // Run all searches in parallel
  const [tasks, clients, leads, users] = await Promise.all([
    models.Task.find(
      { ...textFilter, isArchived: { $ne: true } },
      { score: scoreSort }
    )
      .sort(scoreSort)
      .select("_id taskNumber title status priority dueDate")
      .populate("status", "name color")
      .limit(limit)
      .lean(),

    models.Client.find(textFilter, { score: scoreSort })
      .sort(scoreSort)
      .select("_id name company email status")
      .limit(limit)
      .lean(),

    models.Lead.find(
      { ...textFilter, status: { $nin: ["lost", "converted"] } },
      { score: scoreSort }
    )
      .sort(scoreSort)
      .select("_id name company email status")
      .limit(limit)
      .lean(),

    models.User.find(
      {
        $or: [
          { firstName: { $regex: q, $options: "i" } },
          { lastName:  { $regex: q, $options: "i" } },
          { email:     { $regex: q, $options: "i" } },
        ],
        isActive: true,
      }
    )
      .select("_id firstName lastName email avatar")
      .limit(limit)
      .lean(),
  ]);

  return apiSuccess({
    tasks,
    clients,
    leads,
    users,
    total: tasks.length + clients.length + leads.length + users.length,
  });
});
