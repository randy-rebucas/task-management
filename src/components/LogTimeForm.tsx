"use client";
import { useState } from "react";
import { Button } from "./ui/button";

// LogTimeForm component for logging time
function LogTimeForm({ taskId, onLogged }: { taskId: string; onLogged: () => void }) {
    const [showForm, setShowForm] = useState(false);
    const [hours, setHours] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function reset() {
        setHours(0);
        setMinutes(0);
        setDescription("");
        setDate(new Date().toISOString().slice(0, 10));
        setError(null);
        setShowForm(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const totalMinutes = hours * 60 + minutes;
            if (totalMinutes <= 0) throw new Error("Enter time greater than 0");
            const res = await fetch(`/api/tasks/${taskId}/time-logs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    duration: totalMinutes,
                    note: description,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || "Failed to log time");
            }
            reset();
            onLogged();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (!showForm) {
        return (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
                Log Time
            </Button>
        );
    }

    return (
        <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
            <div className="flex gap-2 items-end">
                <div>
                    <label className="block text-xs text-muted-foreground">Hours</label>
                    <input
                        type="number"
                        min={0}
                        max={24}
                        value={hours}
                        onChange={e => setHours(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm w-16"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs text-muted-foreground">Minutes</label>
                    <input
                        type="number"
                        min={0}
                        max={59}
                        value={minutes}
                        onChange={e => setMinutes(Number(e.target.value))}
                        className="border rounded px-2 py-1 text-sm w-16"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs text-muted-foreground">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs text-muted-foreground">Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                    placeholder="What did you work on?"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button type="button" size="sm" variant="outline" onClick={reset} disabled={saving}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Logging..." : "Log Time"}
                </Button>
            </div>
            {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        </form>
    );
}

export default LogTimeForm;