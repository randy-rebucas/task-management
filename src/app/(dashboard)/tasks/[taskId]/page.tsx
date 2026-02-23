"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { usePermissions } from "@/features/auth/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit } from "lucide-react";

import { TaskSubtasksCard } from "@/components/tasks/task-subtasks-card";
import { TaskAttachmentsCard } from "@/components/tasks/task-attachments-card";
import { TaskTimeLogsCard } from "@/components/tasks/task-time-logs-card";
import { TaskProofCard } from "@/components/tasks/task-proof-card";
import { TaskCrmLinksCard } from "@/components/tasks/task-crm-links-card";
import { TaskPropertiesCard } from "@/components/tasks/task-properties-card";
import { TaskComments } from "@/components/tasks/task-comments";
import { FIELD_TASK_TYPES } from "@/config/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const { can } = usePermissions();

  const { data: task, isLoading, mutate: mutateTask } = useSWR(`/api/tasks/${taskId}`, fetcher);
  const { data: timeLogs } = useSWR(`/api/tasks/${taskId}/time-logs`, fetcher);
  const { data: attachments, mutate: mutateAttachments } = useSWR(
    `/api/tasks/${taskId}/attachments`,
    fetcher
  );

  if (isLoading) return <LoadingSkeleton />;
  if (!task) return <div className="p-6 text-muted-foreground">Task not found.</div>;

  const isFieldTask = FIELD_TASK_TYPES.includes(task.taskType as (typeof FIELD_TASK_TYPES)[number]);

  return (
    <div>
      <PageHeader
        title={`${task.taskNumber}: ${task.title}`}
        action={
          can("tasks:update") ? (
            <Button asChild variant="outline">
              <Link href={`/tasks/${taskId}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </CardContent>
          </Card>

          <TaskSubtasksCard
            taskId={taskId}
            subtasks={task.subtasks || []}
            onMutate={mutateTask}
            canUpdate={can("tasks:update")}
          />

          <TaskComments taskId={taskId} />
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          <TaskPropertiesCard
            task={task}
            taskId={taskId}
            onMutate={mutateTask}
            canUpdate={can("tasks:update")}
          />

          <TaskTimeLogsCard
            taskId={taskId}
            actualHours={task.actualHours ?? 0}
            estimatedHours={task.estimatedHours ?? 0}
            timeLogs={timeLogs || []}
            onMutate={mutateTask}
            canUpdate={can("tasks:update")}
          />

          <TaskAttachmentsCard
            taskId={taskId}
            attachments={attachments || []}
            onMutate={mutateAttachments}
            canUpdate={can("tasks:update")}
          />

          {isFieldTask && <TaskProofCard taskId={taskId} />}

          <TaskCrmLinksCard
            lead={task.lead}
            client={task.client}
            deal={task.deal}
          />
        </div>
      </div>
    </div>
  );
}
