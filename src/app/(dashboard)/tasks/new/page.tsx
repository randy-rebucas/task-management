import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewTaskPage() {
  return (
    <div>
      <PageHeader title="Create Task" />
      <TaskForm />
    </div>
  );
}
