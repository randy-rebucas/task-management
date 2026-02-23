"use client";

import { useEffect, useState } from "react";
import useSWR from "@/lib/swr-compat";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

/* ── types ─────────────────────────────────────────────────── */

interface MeUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  team?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: { _id: string; name: string; slug: string }[];
  department?: { _id: string; name: string; code?: string } | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function initials(u: MeUser) {
  return `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
}

function fmt(dateStr?: string) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ── Page ───────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { data: user, isLoading, mutate } = useSWR<MeUser>("/api/users/me", fetcher);
  const queryClient = useQueryClient();

  /* profile form */
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    jobTitle: "",
    team: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  /* password form */
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
        jobTitle: user.jobTitle ?? "",
        team: user.team ?? "",
      });
    }
  }, [user]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }
      toast.success("Profile updated");
      mutate();
      void queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to change password");
      }
      toast.success("Password changed successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingPassword(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div>
        <PageHeader title="Profile" description="Manage your personal information and security" />
        <div className="max-w-2xl space-y-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Profile" description="Manage your personal information and security" />

      <div className="max-w-2xl space-y-6">

        {/* ── Avatar + identity ── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              {/* Avatar circle */}
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold select-none">
                  {initials(user)}
                </div>
                <span
                  className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                    user.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <p className="text-xl font-semibold truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </p>
                {user.jobTitle && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {user.jobTitle}
                    {user.department ? ` · ${user.department.name}` : ""}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Personal info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Personal Information
            </CardTitle>
            <CardDescription>Update your name and contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="pl-9 bg-muted/40 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Contact an admin.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="jobTitle"
                      value={profile.jobTitle}
                      onChange={(e) => setProfile((p) => ({ ...p, jobTitle: e.target.value }))}
                      placeholder="e.g. Field Coordinator"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="team"
                      value={profile.team}
                      onChange={(e) => setProfile((p) => ({ ...p, team: e.target.value }))}
                      placeholder="e.g. North Region"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={savingProfile} className="gap-2">
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Account info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Roles */}
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1.5">Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((r) => (
                    <Badge key={r._id} variant="secondary" className="text-xs">
                      {r.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Department */}
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Department</p>
                <p className="text-sm text-muted-foreground">
                  {user.department ? user.department.name : "—"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div>
                  <p className="font-medium">Member since</p>
                  <p className="text-muted-foreground">{fmt(user.createdAt)}</p>
                </div>
                <div>
                  <p className="font-medium">Last login</p>
                  <p className="text-muted-foreground">{fmt(user.lastLoginAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Change password ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Change Password
            </CardTitle>
            <CardDescription>
              Use a strong password of at least 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
                    }
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  required
                />
                {passwords.confirmPassword &&
                  passwords.newPassword !== passwords.confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
              </div>

              <Button
                type="submit"
                disabled={
                  savingPassword ||
                  (passwords.confirmPassword.length > 0 &&
                    passwords.newPassword !== passwords.confirmPassword)
                }
                variant="outline"
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {savingPassword ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
