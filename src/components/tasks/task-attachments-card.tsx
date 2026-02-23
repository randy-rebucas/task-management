"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip, Mic, X } from "lucide-react";
import { toast } from "sonner";
import { FILE_UPLOAD } from "@/config/constants";

interface Attachment {
  _id: string;
  fileName: string;
  fileUrl: string;
  attachmentType: "file" | "voice_note";
}

interface TaskAttachmentsCardProps {
  taskId: string;
  attachments: Attachment[];
  onMutate: () => void;
  canUpdate: boolean;
}

export function TaskAttachmentsCard({ taskId, attachments, onMutate, canUpdate }: TaskAttachmentsCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const fileAttachments = attachments.filter((a) => a.attachmentType !== "voice_note");
  const voiceNotes = attachments.filter((a) => a.attachmentType === "voice_note");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to upload file");
      }
      setFile(null);
      onMutate();
      toast.success("File uploaded");
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleVoiceUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!voiceFile) return;
    setVoiceUploading(true);
    setVoiceError(null);
    try {
      const fd = new FormData();
      fd.append("file", voiceFile);
      fd.append("attachmentType", "voice_note");
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to upload voice note");
      }
      setVoiceFile(null);
      onMutate();
      toast.success("Voice note uploaded");
    } catch (err: any) {
      setVoiceError(err.message);
    } finally {
      setVoiceUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm("Delete this attachment?")) return;
    const res = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" });
    if (res.ok) {
      onMutate();
      toast.success("Attachment deleted");
    } else {
      toast.error("Failed to delete attachment");
    }
  }

  return (
    <>
      {/* File Attachments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Attachments
            {fileAttachments.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({fileAttachments.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fileAttachments.length > 0 ? (
            <div className="space-y-1">
              {fileAttachments.map((a) => (
                <div key={a._id} className="flex items-center gap-2 group">
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline truncate flex-1"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    {a.fileName}
                  </a>
                  {canUpdate && (
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                      title="Delete attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No files attached.</p>
          )}
          {canUpdate && (
            <form onSubmit={handleUpload} className="flex flex-col gap-2 pt-1">
              <input
                type="file"
                className="text-xs"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                disabled={uploading}
              />
              <Button type="submit" disabled={uploading || !file} size="sm" className="h-7 text-xs">
                {uploading ? "Uploading…" : "Upload File"}
              </Button>
              {uploadError && <span className="text-xs text-destructive">{uploadError}</span>}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Voice Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="h-4 w-4" /> Voice Notes
            {voiceNotes.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({voiceNotes.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {voiceNotes.length > 0 ? (
            <div className="space-y-2">
              {voiceNotes.map((a) => (
                <div key={a._id} className="space-y-1 group">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">{a.fileName}</p>
                    {canUpdate && (
                      <button
                        onClick={() => handleDelete(a._id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                        title="Delete voice note"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <audio controls src={a.fileUrl} className="w-full h-8" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No voice notes yet.</p>
          )}
          {canUpdate && (
            <form onSubmit={handleVoiceUpload} className="flex flex-col gap-2 pt-1">
              <input
                type="file"
                className="text-xs"
                onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
                accept="audio/*"
                disabled={voiceUploading}
              />
              <Button type="submit" disabled={voiceUploading || !voiceFile} size="sm" className="h-7 text-xs">
                {voiceUploading ? "Uploading…" : "Upload Voice Note"}
              </Button>
              {voiceError && <span className="text-xs text-destructive">{voiceError}</span>}
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
