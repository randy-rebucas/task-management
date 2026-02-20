"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewClientPage() {
  const router = useRouter();
  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const { data: deptsData } = useSWR("/api/departments", fetcher);
  const users = usersData?.data ?? usersData ?? [];
  const departments = deptsData?.data ?? deptsData ?? [];

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name) { toast.error("Name is required"); return; }
    setSaving(true);
    const res = await fetch("/api/crm/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, company, industry, email, phone, address, website, notes,
        assignedTo: assignedTo || undefined,
        department: department || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to create client"); return; }
    const client = await res.json();
    toast.success("Client created");
    router.push(`/crm/clients/${client._id}`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/crm/clients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">New Client</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Client Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact or company name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Hotel, Retail" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Select value={assignedTo || "none"} onValueChange={(v) => setAssignedTo(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u._id} value={u._id}>{u.firstName} {u.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={department || "none"} onValueChange={(v) => setDepartment(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Client"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
