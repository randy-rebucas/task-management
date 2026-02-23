"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Plus, X } from "lucide-react";

interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
}

interface TaskSubtasksCardProps {
  taskId: string;
  subtasks: Subtask[];
  onMutate: () => void;
  canUpdate: boolean;
}

export function TaskSubtasksCard({ taskId, subtasks, onMutate, canUpdate }: TaskSubtasksCardProps) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const completedCount = subtasks.filter((s) => s.completed).length;

  async function addSubtask() {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add subtask");
      setNewTitle("");
      setAdding(false);
      onMutate();
    } finally {
      setLoading(false);
    }
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    onMutate();
  }

  async function deleteSubtask(subtaskId: string) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" });
    onMutate();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Subtasks
            {subtasks.length > 0 && (
              <span className="text-muted-foreground font-normal text-xs">
                {completedCount}/{subtasks.length}
              </span>
            )}
          </CardTitle>
          {canUpdate && (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {subtasks.length > 0 && (
          <Progress value={(completedCount / subtasks.length) * 100} className="h-1.5 mb-3" />
        )}
        {subtasks.map((sub) => (
          <div key={sub._id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={sub.completed}
              onChange={(e) => toggleSubtask(sub._id, e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary"
              disabled={!canUpdate}
            />
            <span className={`flex-1 text-sm ${sub.completed ? "line-through text-muted-foreground" : ""}`}>
              {sub.title}
            </span>
            {canUpdate && (
              <button
                onClick={() => deleteSubtask(sub._id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {subtasks.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No subtasks yet.</p>
        )}
        {adding && (
          <div className="flex gap-2 mt-2">
            <Input
              autoFocus
              className="h-8 text-sm"
              placeholder="Subtask title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSubtask();
                if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
              }}
            />
            <Button size="sm" onClick={addSubtask} disabled={loading}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); }}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
