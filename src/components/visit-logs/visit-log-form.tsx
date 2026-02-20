"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function VisitLogForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    placesVisited: "",
    peopleMet: "",
    purpose: "",
    outcome: "",
    nextAction: "",
    photos: [] as File[],
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("placesVisited", form.placesVisited);
      formData.append("peopleMet", form.peopleMet);
      formData.append("purpose", form.purpose);
      formData.append("outcome", form.outcome);
      formData.append("nextAction", form.nextAction);
      form.photos.forEach((file) => formData.append("photos", file));
      const res = await fetch("/api/visit-logs", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to submit visit log");
      toast.success("Visit log submitted");
      router.push("/visit-logs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="placesVisited">Places visited *</Label>
        <Input
          id="placesVisited"
          required
          placeholder="e.g. Company HQ, Client Office"
          value={form.placesVisited}
          onChange={e => setForm(f => ({ ...f, placesVisited: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="peopleMet">People met *</Label>
        <Input
          id="peopleMet"
          required
          placeholder="e.g. John Doe, Jane Smith"
          value={form.peopleMet}
          onChange={e => setForm(f => ({ ...f, peopleMet: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="purpose">Purpose of visit *</Label>
        <Input
          id="purpose"
          required
          placeholder="e.g. Project discussion"
          value={form.purpose}
          onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="outcome">Outcome *</Label>
        <Textarea
          id="outcome"
          required
          placeholder="e.g. Agreed on next steps"
          value={form.outcome}
          onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="nextAction">Next action *</Label>
        <Textarea
          id="nextAction"
          required
          placeholder="e.g. Prepare proposal, follow up meeting"
          value={form.nextAction}
          onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="photos">Photos (if applicable)</Label>
        <Input
          id="photos"
          type="file"
          multiple
          accept="image/*"
          onChange={e => setForm(f => ({ ...f, photos: e.target.files ? Array.from(e.target.files) : [] }))}
        />
      </div>
      <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Visit Log"}</Button>
    </form>
  );
}
