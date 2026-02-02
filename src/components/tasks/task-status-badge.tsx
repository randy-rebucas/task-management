import { Badge } from "@/components/ui/badge";

interface TaskStatusBadgeProps {
  status: { name: string; color: string; slug?: string };
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      style={{ borderColor: status.color, color: status.color }}
    >
      {status.name}
    </Badge>
  );
}
