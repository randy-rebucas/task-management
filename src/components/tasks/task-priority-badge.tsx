import { Badge } from "@/components/ui/badge";
import { PRIORITY_COLORS } from "@/config/constants";

interface TaskPriorityBadgeProps {
  priority: string;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const colorClass = PRIORITY_COLORS[priority] || "bg-gray-100 text-gray-800";
  return (
    <Badge variant="secondary" className={colorClass}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}
