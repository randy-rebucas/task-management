import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  CheckCircle,
  BarChart3,
  Users,
  Shield,
  MapPin,
  Zap,
  ArrowRight,
  ClipboardList,
  TrendingUp,
  Target,
  Bell,
  Camera,
  Trophy,
  ScanLine,
  Star,
  FileCheck,
  Sparkles,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Smart Task Management",
    description:
      "Create, assign, and track tasks with subtasks, dependencies, file attachments, and real-time status updates across your entire team.",
  },
  {
    icon: Shield,
    title: "Role-Based Access Control",
    description:
      "Define granular permissions for Admins, Managers, and Staff. Ensure the right people see only the right data — nothing more.",
  },
  {
    icon: Users,
    title: "CRM & Deal Pipeline",
    description:
      "Manage leads, clients, and deals with a built-in CRM. Log interactions, move prospects through stages, and close more deals.",
  },
  {
    icon: TrendingUp,
    title: "KPI & Performance Tracking",
    description:
      "Set targets, auto-calculate scores, and view leaderboards. Keep your team aligned, motivated, and accountable every day.",
  },
  {
    icon: MapPin,
    title: "Field Monitoring",
    description:
      "Track field staff with GPS coverage maps, photo proof-of-work, and real-time session monitoring from any device.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Generate detailed reports on task completion, staff workload, and overdue items. Export to PDF or Excel in one click.",
  },
];

const stats = [
  { value: "10x", label: "Productivity Boost" },
  { value: "98%", label: "Task Completion Rate" },
  { value: "500+", label: "Teams Trust Us" },
  { value: "24/7", label: "Uptime Guarantee" },
];

const steps = [
  {
    step: "01",
    title: "Set Up Your Team",
    description:
      "Create departments, define roles, and invite your staff in minutes. Bulk import via CSV for large teams.",
  },
  {
    step: "02",
    title: "Assign & Track Tasks",
    description:
      "Create tasks with deadlines, priorities, and dependencies. Monitor progress in real time on your dashboard.",
  },
  {
    step: "03",
    title: "Analyze & Optimize",
    description:
      "Use built-in KPI dashboards and reports to identify bottlenecks and keep your team performing at its best.",
  },
];

const leaderboard = [
  { name: "Sarah K.", score: 94, tasks: 42 },
  { name: "James M.", score: 87, tasks: 38 },
  { name: "Aisha T.", score: 81, tasks: 35 },
  { name: "Carlos R.", score: 76, tasks: 31 },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#080d1a] text-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.08] bg-[#080d1a]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CheckCircle className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">TaskMgr</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 font-medium hover:opacity-90 transition-opacity shadow-md shadow-blue-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 text-center overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-24 right-0 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm mb-8">
            <Zap className="h-3.5 w-3.5" />
            <span>Now with AI-powered task insights</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Manage Tasks.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
              Grow Your Team.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one platform for task management, CRM, KPI tracking, and
            field monitoring — built for modern teams that demand results.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold text-base hover:opacity-90 transition-opacity shadow-xl shadow-blue-500/25"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/15 font-semibold text-base hover:bg-white/5 transition-colors"
            >
              View Live Demo
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/30">
            No credit card required · Free 7-day trial · Cancel anytime
          </p>

          {/* Industry tags */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-white/25 mr-1">Built for:</span>
            {["Cleaning", "Logistics", "Construction", "Sales Teams", "Field Services"].map((industry) => (
              <span
                key={industry}
                className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/45"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-16 px-6 border-y border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent mb-1.5">
                {s.value}
              </div>
              <div className="text-sm text-white/45">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Everything your team needs
            </h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">
              From task creation to field reporting, TaskMgr covers the full
              operational lifecycle of your business.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.055] hover:border-blue-500/35 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="h-5.5 w-5.5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-28 px-6 border-y border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Up and running in minutes
            </h2>
            <p className="text-white/45 text-lg">
              Simple setup. No consultants needed. Just results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-blue-500/50 via-violet-500/50 to-blue-500/50" />

            {steps.map((s) => (
              <div key={s.step} className="text-center relative">
                <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center text-xl font-extrabold mb-5 relative z-10 shadow-xl shadow-blue-500/20">
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature highlight: KPI dashboard mockup ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-6">
                <Target className="h-3.5 w-3.5" />
                <span>Built for high-performance teams</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.15]">
                Track KPIs that
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
                  actually matter
                </span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                Set custom performance rules, auto-score completions, and keep
                your team motivated with real-time leaderboards. Instant alerts
                when deadlines slip — before it becomes a problem.
              </p>
              <ul className="space-y-4">
                {[
                  "Automated KPI scoring with custom rules",
                  "Real-time team leaderboards",
                  "Overdue task alerts & escalations",
                  "One-click PDF & Excel exports",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-white/65"
                  >
                    <CheckCircle className="h-5 w-5 text-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
              >
                Try It Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Dashboard mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-violet-600/15 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl border border-white/[0.09] bg-[#0d1426] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold">Team Performance</p>
                    <p className="text-xs text-white/35 mt-0.5">February 2026</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                    <TrendingUp className="h-3 w-3" />
                    +12% vs last month
                  </div>
                </div>

                {/* Leaderboard rows */}
                <div className="space-y-3">
                  {leaderboard.map((person, i) => (
                    <div
                      key={person.name}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.05]"
                    >
                      <span className="text-xs font-bold text-white/25 w-5 shrink-0">
                        #{i + 1}
                      </span>
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: `linear-gradient(135deg, hsl(${220 + i * 30}, 80%, 60%), hsl(${260 + i * 20}, 70%, 55%))`,
                        }}
                      >
                        {person.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{person.name}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.08]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                              style={{ width: `${person.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/35 shrink-0">
                            {person.score}%
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-white/30 shrink-0">
                        {person.tasks} tasks
                      </span>
                    </div>
                  ))}
                </div>

                {/* Summary row */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Open Tasks", value: "24" },
                    { label: "Completed", value: "146" },
                    { label: "Overdue", value: "3" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                    >
                      <div className="text-lg font-bold">{m.value}</div>
                      <div className="text-xs text-white/35 mt-0.5">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature highlight: Field Monitoring ── */}
      <section className="py-28 px-6 border-t border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Mockup – LEFT */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-teal-600/15 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl border border-white/[0.09] bg-[#0d1426] p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold">Field Sessions</p>
                    <p className="text-xs text-white/35 mt-0.5">Live · 3 active now</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live Tracking
                  </div>
                </div>

                {/* GPS grid mockup */}
                <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 relative overflow-hidden h-36">
                  <div className="absolute inset-0 grid grid-cols-10 grid-rows-5">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div key={i} className="border-[0.5px] border-white/[0.04]" />
                    ))}
                  </div>
                  {/* Coverage blobs */}
                  <div className="absolute top-4 left-8 w-16 h-14 bg-emerald-500/20 rounded-full blur-xl" />
                  <div className="absolute top-8 left-[55%] w-14 h-12 bg-blue-500/20 rounded-full blur-xl" />
                  <div className="absolute bottom-4 left-[30%] w-12 h-10 bg-violet-500/20 rounded-full blur-xl" />
                  {/* Staff pins */}
                  {[
                    { top: "22%", left: "22%", label: "A", color: "#10b981" },
                    { top: "45%", left: "58%", label: "J", color: "#6366f1" },
                    { top: "68%", left: "38%", label: "M", color: "#3b82f6" },
                  ].map((pin) => (
                    <div
                      key={pin.label}
                      className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                      style={{ top: pin.top, left: pin.left }}
                    >
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ring-2 ring-white/20"
                        style={{ background: pin.color }}
                      >
                        {pin.label}
                      </div>
                      <div className="w-px h-2 opacity-60" style={{ background: pin.color }} />
                      <div className="h-1 w-1 rounded-full opacity-40" style={{ background: pin.color }} />
                    </div>
                  ))}
                  <p className="absolute bottom-2 right-3 text-[10px] text-white/20">GPS Coverage Map</p>
                </div>

                {/* Session rows */}
                <div className="space-y-2.5">
                  {[
                    { name: "Aisha T.", location: "Zone A – Downtown", checkin: "08:14 AM", photos: 6 },
                    { name: "James M.", location: "Zone C – Westside", checkin: "09:02 AM", photos: 3 },
                    { name: "Marcus L.", location: "Zone B – Midtown", checkin: "09:45 AM", photos: 4 },
                  ].map((session) => (
                    <div
                      key={session.name}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.05]"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {session.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{session.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-white/30 shrink-0" />
                          <span className="text-xs text-white/35 truncate">{session.location}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-white/35 justify-end">
                          <Camera className="h-3 w-3" />
                          {session.photos}
                        </div>
                        <div className="text-[10px] text-white/25 mt-0.5">{session.checkin}</div>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Copy – RIGHT */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm mb-6">
                <MapPin className="h-3.5 w-3.5" />
                <span>Real-time field intelligence</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.15]">
                Know exactly where
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  your team is
                </span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                Live GPS session tracking, photo proof-of-work, and automatic
                check-in/check-out — all in one dashboard. No more calling staff
                to confirm their whereabouts.
              </p>
              <ul className="space-y-4">
                {[
                  "Live GPS coverage map with staff location pins",
                  "Photo proof-of-work with timestamps",
                  "QR code check-in at client sites",
                  "Auto-generated visit log reports",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/65">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
              >
                See It Live
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Feature highlight: Performance ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Copy – LEFT */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm mb-6">
                <Trophy className="h-3.5 w-3.5" />
                <span>Drive a culture of excellence</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.15]">
                Performance rules
                <br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  you actually control
                </span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                Define exactly how scores are calculated — weight tasks by
                priority, reward early completions, deduct for overdue items.
                Set individual and team targets then watch the numbers move.
              </p>
              <ul className="space-y-4">
                {[
                  "Custom scoring rules by task type & priority",
                  "Individual & team performance targets",
                  "Auto-calculated scores — no manual work",
                  "Achievement streaks & milestone rewards",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/65">
                    <CheckCircle className="h-5 w-5 text-amber-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20"
              >
                Try It Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mockup – RIGHT */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-500/15 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl border border-white/[0.09] bg-[#0d1426] p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold">Performance Rules</p>
                    <p className="text-xs text-white/35 mt-0.5">Active · 4 rules configured</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= 4 ? "fill-amber-400" : "fill-white/10 text-white/20"}`} />
                    ))}
                  </div>
                </div>

                {/* Scoring rules */}
                <div className="space-y-2.5 mb-5">
                  {[
                    { rule: "Task completed on time", points: "+10 pts", color: "text-emerald-400" },
                    { rule: "High-priority task completed", points: "+25 pts", color: "text-blue-400" },
                    { rule: "Task completed early", points: "+15 pts", color: "text-violet-400" },
                    { rule: "Task overdue", points: "−8 pts", color: "text-red-400" },
                  ].map((r) => (
                    <div key={r.rule} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                      <div className="flex items-center gap-2.5">
                        <FileCheck className="h-4 w-4 text-white/30 shrink-0" />
                        <span className="text-sm text-white/70">{r.rule}</span>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${r.color}`}>{r.points}</span>
                    </div>
                  ))}
                </div>

                {/* Target progress */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-white/60">Monthly Target Progress</p>
                    <span className="text-xs text-amber-400 font-semibold">83% avg</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: "Sarah K.", pct: 94 },
                      { name: "James M.", pct: 87 },
                      { name: "Aisha T.", pct: 68 },
                    ].map((t) => (
                      <div key={t.name} className="flex items-center gap-3">
                        <span className="text-xs text-white/40 w-16 shrink-0">{t.name}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                            style={{ width: `${t.pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/35 w-8 text-right shrink-0">{t.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Feature highlight: Proof of Work ── */}
      <section className="py-28 px-6 border-t border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Mockup – LEFT */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/15 to-cyan-600/15 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl border border-white/[0.09] bg-[#0d1426] p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold">Proof of Work</p>
                    <p className="text-xs text-white/35 mt-0.5">Today · 12 submissions</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-sky-400 bg-sky-400/10 px-2.5 py-1 rounded-full border border-sky-400/20">
                    <ScanLine className="h-3.5 w-3.5" />
                    QR Verified
                  </div>
                </div>

                {/* QR scan strip */}
                <div className="mb-5 flex items-center gap-3 p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/[0.07]">
                  <div className="h-12 w-12 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-center justify-center shrink-0">
                    <ScanLine className="h-6 w-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-sky-300">QR Code Scanned</p>
                    <p className="text-xs text-white/35 mt-0.5">Site: Greenfield Office · 09:12 AM</p>
                  </div>
                  <div className="ml-auto shrink-0 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20 font-medium">
                    ✓ Valid
                  </div>
                </div>

                {/* Submission rows */}
                <div className="space-y-2.5">
                  {[
                    { name: "Aisha T.", task: "Site inspection – Block A", photos: 5, time: "09:14 AM", status: "approved" },
                    { name: "Carlos R.", task: "Equipment delivery – Bay 3", photos: 3, time: "10:02 AM", status: "approved" },
                    { name: "James M.", task: "Client meeting notes", photos: 2, time: "10:45 AM", status: "pending" },
                  ].map((sub) => (
                    <div key={sub.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {sub.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{sub.task}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Camera className="h-3 w-3 text-white/30" />
                          <span className="text-xs text-white/35">{sub.photos} photos · {sub.time}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border shrink-0 ${
                        sub.status === "approved"
                          ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                          : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                      }`}>
                        {sub.status === "approved" ? "✓ Approved" : "⏳ Pending"}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Copy – RIGHT */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-sm mb-6">
                <ScanLine className="h-3.5 w-3.5" />
                <span>Verifiable work evidence</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.15]">
                Evidence your team
                <br />
                <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                  actually showed up
                </span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8">
                Replace guesswork with verified evidence. Staff scan a QR code
                on-site, submit timestamped photos, and managers get instant
                confirmation — all without phone calls or manual check-ins.
              </p>
              <ul className="space-y-4">
                {[
                  "QR code scan verifies on-site presence",
                  "Timestamped photo submissions per task",
                  "Manager approval workflow with one click",
                  "Full audit trail for compliance & disputes",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/65">
                    <CheckCircle className="h-5 w-5 text-sky-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-sky-500/20"
              >
                See It Live
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Notification / alerts highlight ── */}
      <section className="py-16 px-6 border-y border-white/[0.07] bg-white/[0.02]">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Bell className="h-7 w-7 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">
              Never miss a deadline again
            </h3>
            <p className="text-white/45 text-sm leading-relaxed">
              Configurable notification rules send real-time alerts for
              overdue tasks, approaching deadlines, and workflow transitions —
              right in the app or via email.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Learn More
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-7xl">

          {/* Heading */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simple, transparent pricing</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              One flat price. Your whole team.
            </h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">
              No per-seat surprises. Every plan includes a{" "}
              <span className="text-white font-semibold">7-day free trial</span>
              {" "}— no credit card required.
            </p>
            <p className="mt-3 text-sm text-white/30">
              Designed for field businesses —{" "}
              <span className="text-white/50">cleaning · logistics · construction · sales teams</span>
            </p>
          </div>

          {/* Cards — 4 columns on lg, 2 on md, 1 on mobile */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">

            {/* Starter */}
            <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 flex flex-col">
              <div className="mb-5">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Starter</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">$49</span>
                  <span className="text-white/40 text-sm mb-1.5">/mo</span>
                </div>
                <p className="text-xs text-white/35 mt-1">Up to 10 team members</p>
              </div>

              <Link
                href="/subscribe/starter"
                className="block w-full text-center py-2.5 rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5 transition-colors mb-6"
              >
                Start Free Trial
              </Link>

              <ul className="space-y-2.5 flex-1">
                {[
                  "10 team members",
                  "Task management & subtasks",
                  "Basic dashboard",
                  "Email notifications",
                  "5 GB storage",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <CheckCircle className="h-4 w-4 text-white/25 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth – highlighted */}
            <div className="relative rounded-2xl p-px bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/20 flex flex-col">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 text-white">
                Most Popular
              </div>
              <div className="rounded-2xl bg-[#0d1426] p-6 flex flex-col h-full">
                <div className="mb-5">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Growth</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold">$149</span>
                    <span className="text-white/40 text-sm mb-1.5">/mo</span>
                  </div>
                  <p className="text-xs text-white/35 mt-1">Up to 30 team members</p>
                </div>

                <Link
                  href="/subscribe/growth"
                  className="block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20 mb-6"
                >
                  Start Free Trial
                </Link>

                <ul className="space-y-2.5 flex-1">
                  {[
                    "30 team members",
                    "Everything in Starter",
                    "CRM & deal pipeline",
                    "KPI & performance tracking",
                    "Field monitoring & GPS",
                    "Proof of work submissions",
                    "PDF & Excel exports",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <CheckCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 flex flex-col">
              <div className="mb-5">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Business</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">$299</span>
                  <span className="text-white/40 text-sm mb-1.5">/mo</span>
                </div>
                <p className="text-xs text-white/35 mt-1">Up to 100 team members</p>
              </div>

              <Link
                href="/subscribe/business"
                className="block w-full text-center py-2.5 rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5 transition-colors mb-6"
              >
                Start Free Trial
              </Link>

              <ul className="space-y-2.5 flex-1">
                {[
                  "100 team members",
                  "Everything in Growth",
                  "Advanced role permissions",
                  "Multi-department management",
                  "Custom workflow builder",
                  "50 GB storage",
                  "Dedicated onboarding",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <CheckCircle className="h-4 w-4 text-white/25 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 flex flex-col">
              <div className="mb-5">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Enterprise</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-3xl font-extrabold leading-tight">Custom</span>
                </div>
                <p className="text-xs text-white/35 mt-1">Unlimited team members</p>
              </div>

              <Link
                href="/login"
                className="block w-full text-center py-2.5 rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5 transition-colors mb-6"
              >
                Contact Sales
              </Link>

              <ul className="space-y-2.5 flex-1">
                {[
                  "Unlimited members",
                  "Everything in Business",
                  "Custom integrations & API",
                  "Dedicated account manager",
                  "SSO & advanced security",
                  "Custom SLA & uptime",
                  "Unlimited storage",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <Building2 className="h-4 w-4 text-white/25 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Savings note */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/30">
            <span>
              💡 Annual billing saves up to{" "}
              <span className="text-white/55 font-medium">20%</span>
            </span>
            <span className="hidden sm:block h-4 w-px bg-white/10" />
            <span>
              100+ members?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                Talk to us for volume pricing
              </Link>
            </span>
            <span className="hidden sm:block h-4 w-px bg-white/10" />
            <span>All prices in USD</span>
          </div>

        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] to-violet-600/[0.08] p-14 overflow-hidden">
            {/* Background glows */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-[300px] h-[200px] bg-violet-600/15 rounded-full blur-2xl" />
            </div>

            <div className="relative">
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
                Ready to transform
                <br />
                your team&apos;s productivity?
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Join hundreds of teams already using TaskMgr to stay organized,
                hit their goals, and grow faster.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 font-semibold text-base hover:opacity-90 transition-opacity shadow-2xl shadow-blue-500/30"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-sm text-white/30">
                Free 14-day trial · No credit card · Instant access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.07] py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">TaskMgr</span>
          </div>
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} TaskMgr. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/40">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
