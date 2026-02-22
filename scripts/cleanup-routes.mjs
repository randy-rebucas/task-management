import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(process.cwd(), "src/app/api");

function getAll(dir) {
  const files = [];
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) files.push(...getAll(f));
    else if (e === "route.ts") files.push(f);
  }
  return files;
}

let fixed = 0;
for (const f of getAll(ROOT)) {
  let src = readFileSync(f, "utf-8");
  const orig = src;

  // Remove leftover side-effect model registration imports
  src = src.replace(/^import\s+"@\/models\/(?!platform)[^"]+";?\s*\/\/[^\n]*\n/gm, "");
  src = src.replace(/^import\s+"@\/models\/(?!platform)[^"]+";?\s*\n/gm, "");

  // Add getTenantPermissions import if the function is used but import is missing
  if (
    src.includes("getTenantPermissions") &&
    !src.includes('from "@/features/auth/rbac"')
  ) {
    src =
      'import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";\n' +
      src;
  }

  if (src !== orig) {
    writeFileSync(f, src, "utf-8");
    fixed++;
  }
}
console.log("Fixed " + fixed + " files");
