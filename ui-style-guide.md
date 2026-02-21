# TaskMgr UI Style Guide
> Use this document as a prompt when upgrading or creating new pages/components.
> Paste the relevant sections into your prompt to ensure consistent styling.

---

## Prompt: Apply TaskMgr Dark Marketing Theme

When building or restyling a page or component, follow the design system below exactly.

---

## 1. Color Palette

| Token | Value | Usage |
|---|---|---|
| Page background | `#080d1a` | Full-page dark base |
| Card background | `#0d1426` | Panels, cards, modals |
| Primary gradient | `from-blue-500 to-violet-600` | Buttons, icons, highlights |
| Success gradient | `from-emerald-500 to-teal-600` | Success states |
| Text primary | `text-white` | Headings |
| Text secondary | `text-white/65` | Labels, body |
| Text muted | `text-white/45` | Descriptions, placeholders |
| Text subtle | `text-white/35` | Back links, metadata |
| Border default | `border-white/[0.09]` | Cards, panels |
| Border input | `border-white/[0.10]` | Form fields |
| Input fill | `bg-white/[0.06]` | Form fields |
| Input focus fill | `bg-white/[0.09]` | Form fields on focus |
| Input focus border | `focus:border-blue-500/60` | Form fields on focus |
| Card hover fill | `hover:bg-white/[0.055]` | Feature cards |
| Card hover border | `hover:border-blue-500/35` | Feature cards |
| Accent blue | `text-blue-400` | Links, icons, checkmarks |
| Accent violet | `text-violet-300` | Badges, tags |

---

## 2. Page Shell

Every full-page layout uses this shell:

```tsx
<div className="min-h-screen bg-[#080d1a] text-white overflow-x-hidden">
  {/* Ambient glows */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]" />
    <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-violet-600/10 rounded-full blur-[100px]" />
    <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-indigo-600/8 rounded-full blur-[80px]" />
  </div>
  {/* content */}
</div>
```

---

## 3. Navbar

Sticky top bar with glass blur effect:

```tsx
<nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.08] bg-[#080d1a]/80 backdrop-blur-md">
  <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <CheckCircle className="h-4.5 w-4.5 text-white" />
      </div>
      <span className="text-lg font-bold tracking-tight">TaskMgr</span>
    </div>
    {/* Nav links + CTA */}
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5">
        Sign In
      </Link>
      <Link href="/login" className="text-sm px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 font-medium hover:opacity-90 transition-opacity shadow-md shadow-blue-500/20">
        Get Started Free
      </Link>
    </div>
  </div>
</nav>
```

---

## 4. Logo Icon Tile

Used in navbars, auth cards, and section headers:

```tsx
{/* Standard – blue/violet */}
<div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
  <CheckCircle className="h-7 w-7 text-white" />
</div>

{/* Small – navbar */}
<div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
  <CheckCircle className="h-4 w-4 text-white" />
</div>

{/* Success state – emerald/teal */}
<div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
  <CheckCircle className="h-7 w-7 text-white" />
</div>
```

---

## 5. Buttons

```tsx
{/* Primary – gradient */}
<button className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
  Label
</button>

{/* Secondary – ghost border */}
<button className="h-11 px-8 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
  Label
</button>

{/* Large CTA (hero / final section) */}
<button className="h-14 px-10 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-2xl shadow-blue-500/30 flex items-center gap-2">
  Label <ArrowRight className="h-4 w-4" />
</button>
```

---

## 6. Cards

### Feature card (grid)
```tsx
<div className="group p-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.055] hover:border-blue-500/35 transition-all duration-300">
  {/* Icon */}
  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
    <Icon className="h-5 w-5 text-blue-400" />
  </div>
  <h3 className="text-base font-semibold mb-2">Title</h3>
  <p className="text-white/45 text-sm leading-relaxed">Description</p>
</div>
```

### Auth / modal card
```tsx
<div className="relative w-full">
  {/* Glow halo */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-3xl blur-2xl -z-10" />
  {/* Card */}
  <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-8">
    {/* content */}
  </div>
</div>
```

### Highlight / CTA card
```tsx
<div className="relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] to-violet-600/[0.08] p-14 overflow-hidden">
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/20 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-0 w-[300px] h-[200px] bg-violet-600/15 rounded-full blur-2xl" />
  </div>
  <div className="relative">{/* content */}</div>
</div>
```

---

## 7. Form Inputs

```tsx
{/* Label */}
<label className="block text-sm font-medium text-white/65 mb-1.5">
  Field label
</label>

{/* Input */}
<input
  className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
  placeholder="placeholder text"
/>

{/* Error message */}
<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-center">
  Error text here
</div>
```

---

## 8. Badges / Pills

```tsx
{/* Blue – feature badge */}
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm">
  <Zap className="h-3.5 w-3.5" />
  Badge text
</div>

{/* Violet – section badge */}
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm">
  <Target className="h-3.5 w-3.5" />
  Badge text
</div>

{/* Emerald – positive metric */}
<div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
  <TrendingUp className="h-3 w-3" />
  +12% vs last month
</div>
```

---

## 9. Section Headings

```tsx
{/* Centered section heading */}
<div className="text-center mb-16">
  <h2 className="text-4xl sm:text-5xl font-bold mb-4">Section title</h2>
  <p className="text-white/45 text-lg max-w-xl mx-auto">
    Supporting description text.
  </p>
</div>

{/* Left-aligned with gradient accent */}
<h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.15]">
  Plain part of title
  <br />
  <span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
    Gradient accent part
  </span>
</h2>
```

---

## 10. Gradient Text

```tsx
{/* Blue → Violet (default) */}
<span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
  Gradient text
</span>

{/* Stats / numbers */}
<span className="bg-gradient-to-r from-blue-400 to-violet-500 bg-clip-text text-transparent">
  10x
</span>
```

---

## 11. Dividers

```tsx
{/* Section border */}
<div className="border-y border-white/[0.07] bg-white/[0.02]">
  {/* section content */}
</div>

{/* Card internal divider */}
<div className="my-6 border-t border-white/[0.07]" />
```

---

## 12. Back / Nav Links

```tsx
{/* Subtle back link */}
<Link
  href="/"
  className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
>
  <ArrowLeft className="h-3 w-3" />
  Back to home
</Link>

{/* Accent colored link */}
<Link href="/login" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
  Forgot password?
</Link>
```

---

## 13. Section Spacing

| Use | Class |
|---|---|
| Full page section | `py-28 px-6` |
| Compact section (stats, banners) | `py-16 px-6` |
| Content max width | `max-w-7xl mx-auto` |
| Narrow content / auth | `max-w-md` |
| Card padding | `p-8` (auth) / `p-7` (feature) / `p-14` (CTA) |

---

## 14. Applied Pages Reference

| Page | File | Notes |
|---|---|---|
| Marketing landing | `src/app/page.tsx` | Full dark page, all patterns |
| Auth layout (shell) | `src/app/(auth)/layout.tsx` | Dark bg + 3 ambient glows |
| Login form | `src/components/auth/login-form.tsx` | Auth card pattern |
| Forgot password form | `src/components/auth/forgot-password-form.tsx` | Auth card + success state |

---

## Quick Prompt Template

Paste this at the top of your prompt when asking for a new page or component:

```
Apply the TaskMgr dark marketing theme from docs/ui-style-guide.md:
- Background: #080d1a, cards: #0d1426/90 with backdrop-blur-sm
- Gradient accent: from-blue-500 to-violet-600 (buttons, icons, highlights)
- Borders: border-white/[0.09] on cards, border-white/[0.10] on inputs
- Text hierarchy: white → white/65 → white/45 → white/35
- Inputs: bg-white/[0.06], focus:border-blue-500/60, focus:bg-white/[0.09]
- Buttons: rounded-xl gradient bg, shadow-lg shadow-blue-500/20, hover:opacity-90
- Ambient glows: blue-600/15 top-center, violet-600/10 bottom-right, indigo-600/8 left
- Icons: gradient tile (rounded-2xl, from-blue-500 to-violet-600, shadow-xl shadow-blue-500/25)
- Use lucide-react for all icons. No shadcn Card/Button/Input — use native HTML with Tailwind.
```
