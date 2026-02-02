"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TaskComments({ taskId }: { taskId: string }) {
  const { data: session } = useSession();
  const { data: comments, isLoading } = useSWR(
    `/api/tasks/${taskId}/comments`,
    fetcher
  );
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent("");
        mutate(`/api/tasks/${taskId}/comments`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add comment");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments?.map(
          (comment: {
            _id: string;
            author: { firstName: string; lastName: string };
            content: string;
            isSystemGenerated: boolean;
            createdAt: string;
          }) => (
            <div
              key={comment._id}
              className={`flex gap-3 ${comment.isSystemGenerated ? "opacity-70" : ""}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px]">
                  {comment.author?.firstName?.[0]}
                  {comment.author?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.author?.firstName} {comment.author?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.createdAt), "MMM d, HH:mm")}
                  </span>
                  {comment.isSystemGenerated && (
                    <span className="text-xs text-muted-foreground">(system)</span>
                  )}
                </div>
                <p className="mt-1 text-sm">{comment.content}</p>
              </div>
            </div>
          )
        )}

        {session && (
          <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
            <Textarea
              placeholder="Add a comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
