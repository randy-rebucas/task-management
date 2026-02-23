import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/shared/page-header";

interface NewTaskPageProps {
  searchParams: Promise<{ dueDate?: string; startDate?: string }>;
}

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const params = await searchParams;

  // Pre-fill dates when coming from calendar day-view links
  const initialData = (params.dueDate || params.startDate)
    ? {
        title: "",
        description: "",
        priority: "medium",
        taskType: "",
        category: "",
        assignees: [],
        dueDate: params.dueDate ?? "",
        startDate: params.startDate ?? "",
        estimatedHours: null,
        tags: [],
        department: "",
        isRecurring: false,
      }
    : undefined;

  return (
    <div>
      <PageHeader title="Create Task" />
      <TaskForm initialData={initialData} />
    </div>
  );
}
