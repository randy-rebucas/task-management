/**
 * Atomic task number generator.
 *
 * Uses MongoDB findOneAndUpdate with $inc to safely increment a counter
 * document in an atomic operation, preventing race conditions when multiple
 * requests create tasks concurrently.
 */
import type { TenantModels } from "@/lib/tenant-models";

export async function getNextTaskNumber(models: TenantModels): Promise<string> {
  const counter = await (models.AppSetting as any).findOneAndUpdate(
    { key: "__task_counter__" },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean() as { value: number } | null;

  // On first upsert value is 1 (set by $inc starting from 0)
  const seq = counter?.value ?? 1;
  return `TASK-${String(seq).padStart(4, "0")}`;
}
