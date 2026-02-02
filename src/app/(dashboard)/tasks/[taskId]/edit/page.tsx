"use client";

import { use } from "react";
import useSWR from "swr";
import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const { data: task, isLoading } = useSWR(`/api/tasks/${taskId}`, fetcher);

  if (isLoading) return <LoadingSkeleton />;
  if (!task) return <div>Task not found</div>;

  return (
    <div>
      <PageHeader title={`Edit ${task.taskNumber}`} />
      <TaskForm
        taskId={taskId}
        initialData={{
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category || "",
          assignees: task.assignees?.map((a: { _id: string }) => a._id) || [],
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
          startDate: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
          estimatedHours: task.estimatedHours || null,
          tags: task.tags || [],
          department: task.department?._id || "",
        }}
      />
    </div>
  );
}
