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

export default function Home() {
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
            No credit card required · Free 14-day trial · Cancel anytime
          </p>
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
