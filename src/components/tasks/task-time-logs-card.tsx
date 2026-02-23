"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";
import LogTimeForm from "@/components/LogTimeForm";

interface TimeLog {
  _id: string;
}

interface TaskTimeLogsCardProps {
  taskId: string;
  actualHours: number;
  estimatedHours: number;
  timeLogs: TimeLog[];
  onMutate: () => void;
  canUpdate: boolean;
}

export function TaskTimeLogsCard({
  taskId,
  actualHours,
  estimatedHours,
  timeLogs,
  onMutate,
  canUpdate,
}: TaskTimeLogsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> Time Logged
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5 mb-1">
          <p className="text-xl font-bold">{actualHours?.toFixed(1) ?? 0}h</p>
          {estimatedHours > 0 && (
            <p className="text-xs text-muted-foreground">of {estimatedHours}h estimated</p>
          )}
        </div>
        {estimatedHours > 0 && (
          <Progress
            value={Math.min((actualHours / estimatedHours) * 100, 100)}
            className="h-1.5 mb-2"
          />
        )}
        <p className="text-xs text-muted-foreground mb-3">
          {timeLogs?.length ?? 0} entr{timeLogs?.length === 1 ? "y" : "ies"}
        </p>
        {canUpdate && <LogTimeForm taskId={taskId} onLogged={onMutate} />}
      </CardContent>
    </Card>
  );
}
