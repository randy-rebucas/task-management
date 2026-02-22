/**
 * Multi-tenant migration script: Update all API route handlers
 * to accept tenant models as the 4th parameter.
 *
 * Run with:  node scripts/migrate-routes.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(process.cwd(), "src/app/api");

// Models available in TenantModels - used to replace direct model usage
const TENANT_MODELS = [
  "ActivityLog", "AppSetting", "Client", "CommissionRule", "CrmAttachment",
  "CrmInteraction", "Deal", "Department", "FieldSession", "Lead", "LoginHistory",
  "Notification", "NotificationRule", "PartnerLocation", "PerformanceTarget",
  "Permission", "ProofOfWork", "Role", "Subscription", "Task", "TaskAttachment",
  "TaskComment", "TaskDependency", "TaskTimeLog", "User", "VisitLog",
  "WorkflowStatus", "WorkflowTransition",
];

function getAllRouteFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...getAllRouteFiles(full));
    else if (entry === "route.ts") files.push(full);
  }
  return files;
}

function transformFile(filePath) {
  let src = readFileSync(filePath, "utf-8");
  const original = src;
  let changed = false;

  // 1. Remove direct model imports from @/models/* (keep platform, keep type-only)
  // e.g.  import Task from "@/models/Task";
  //        import "@/models/Lead";   (side-effect / registration imports)
  src = src.replace(/^import\s+\w+\s+from\s+"@\/models\/(?!platform)[^"]+";?\s*\n/gm, "");
  src = src.replace(/^import\s+"@\/models\/(?!platform)[^"]+";?\s*\n/gm, "");

  // 2. Remove dbConnect imports and calls
  src = src.replace(/^import\s+\{[^}]*dbConnect[^}]*\}\s*from\s+"[^"]+";?\s*\n/gm, "");
  src = src.replace(/^import\s+\{[^}]*dbConnect[^}]*\}\s*from\s+'[^']+';?\s*\n/gm, "");
  src = src.replace(/\s*await\s+dbConnect\(\);\s*\n/g, "\n");

  // 3. Update withAuth handler signature: (req, ctx, session) → (req, ctx, session, models)
  src = src.replace(
    /withAuth\s*\(\s*async\s*\(\s*req\s*,\s*ctx\s*,\s*session\s*\)/g,
    "withAuth(async (req, ctx, session, models)"
  );
  // Handle cases where req is _ or _req
  src = src.replace(
    /withAuth\s*\(\s*async\s*\(\s*(_req|req)\s*\)/g,
    "withAuth(async ($1, _ctx, _session, models)"
  );

  // 4. Update withPermission handler signature
  src = src.replace(
    /withPermission\s*\(\s*"([^"]+)"\s*,\s*async\s*\(\s*req\s*,\s*ctx\s*,\s*session\s*\)/g,
    `withPermission("$1", async (req, ctx, session, models)`
  );
  src = src.replace(
    /withPermission\s*\(\s*'([^']+)'\s*,\s*async\s*\(\s*req\s*,\s*ctx\s*,\s*session\s*\)/g,
    `withPermission('$1', async (req, ctx, session, models)`
  );
  // withPermission where handler only has req
  src = src.replace(
    /withPermission\s*\(\s*"([^"]+)"\s*,\s*async\s*\(\s*(req|_req)\s*\)/g,
    `withPermission("$1", async ($2, _ctx, _session, models)`
  );

  // 5. Add models. prefix to all direct model usages (e.g. Task.find → models.Task.find)
  for (const model of TENANT_MODELS) {
    // Match ModelName.something but not models.ModelName or @/models/ paths or strings
    const re = new RegExp(`(?<!models\\.)(?<!['"/@])\\b${model}\\.(find|findById|findOne|findByIdAndUpdate|findOneAndUpdate|findByIdAndDelete|findOneAndDelete|create|insertMany|updateOne|updateMany|deleteOne|deleteMany|countDocuments|aggregate|distinct|exists|lean)\\b`, "g");
    if (re.test(src)) {
      src = src.replace(re, `models.${model}.$1`);
      changed = true;
    }
  }

  // 6. Update logActivity calls to pass models
  src = src.replace(
    /logActivity\(\{([^}]*)\}\)/gs,
    (match, inner) => {
      if (inner.includes("models")) return match; // already has models
      return `logActivity({${inner}, models })`;
    }
  );

  // 7. Update triggerNotification calls to pass models
  src = src.replace(
    /triggerNotification\(([^)]+)\)/g,
    (match, args) => {
      if (args.includes("models")) return match;
      return `triggerNotification(${args}, models)`;
    }
  );

  // 8. Update getUserPermissions calls to getTenantPermissions
  src = src.replace(
    /getUserPermissions\(([^)]+)\)/g,
    "getTenantPermissions($1, models)"
  );
  if (src.includes("getTenantPermissions") && src.includes("getUserPermissions")) {
    src = src.replace(/import\s*\{[^}]*getUserPermissions[^}]*\}\s*from\s*["']@\/features\/auth\/rbac["'];?\n?/g, "");
    // Add import if needed
    if (!src.includes("getTenantPermissions")) {
      src = `import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";\n` + src.replace(/import\s*\{[^}]*getUserPermissions[^}]*\}\s*from\s*["']@\/features\/auth\/rbac["'];?\n?/g, "");
    }
  }

  if (src !== original) {
    writeFileSync(filePath, src, "utf-8");
    return true;
  }
  return false;
}

const files = getAllRouteFiles(ROOT);
let updated = 0;
for (const f of files) {
  const wasChanged = transformFile(f);
  if (wasChanged) {
    updated++;
    console.log(`  ✓ ${relative(process.cwd(), f)}`);
  }
}
console.log(`\nDone. Updated ${updated}/${files.length} route files.`);
