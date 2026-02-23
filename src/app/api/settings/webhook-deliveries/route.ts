import { NextRequest, NextResponse } from "next/server";
import { withPermission, getPaginationParams } from "@/features/auth/api-helpers";
import type { IWebhookDelivery } from "@/models/WebhookDelivery";
import mongoose from "mongoose";

type LeanDelivery = IWebhookDelivery & { _id: mongoose.Types.ObjectId };

/**
 * GET /api/settings/webhook-deliveries
 * Returns paginated webhook delivery logs for the tenant.
 * Optional query params:
 *   - webhookId  filter by a specific webhook endpoint
 *   - status     filter by "success" | "failed" | "pending"
 *   - page, limit
 */
export const GET = withPermission(
  "settings:manage",
  async (req: NextRequest, _ctx: unknown, _session: unknown, models: any) => {
    const url = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(url);

    const filter: Record<string, unknown> = {};
    const webhookId = url.searchParams.get("webhookId");
    const status    = url.searchParams.get("status");

    if (webhookId && mongoose.isValidObjectId(webhookId)) {
      filter.webhookId = new mongoose.Types.ObjectId(webhookId);
    }
    if (status && ["pending", "success", "failed"].includes(status)) {
      filter.status = status;
    }

    const [deliveries, total] = await Promise.all([
      models.WebhookDelivery.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as Promise<LeanDelivery[]>,
      models.WebhookDelivery.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

/**
 * DELETE /api/settings/webhook-deliveries
 * Bulk-clears webhook delivery logs older than 30 days.
 * Requires settings:manage permission.
 */
export const DELETE = withPermission(
  "settings:manage",
  async (_req: NextRequest, _ctx: unknown, _session: unknown, models: any) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await models.WebhookDelivery.deleteMany({
      createdAt: { $lt: cutoff },
    });

    return NextResponse.json({
      message: `Cleared ${result.deletedCount} delivery log(s) older than 30 days.`,
      deletedCount: result.deletedCount,
    });
  }
);
