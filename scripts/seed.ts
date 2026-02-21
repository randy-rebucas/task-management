import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import Department from "../src/models/Department";
import Permission from "../src/models/Permission";
import Role from "../src/models/Role";
import User from "../src/models/User";
import WorkflowStatus from "../src/models/WorkflowStatus";

import { PERMISSIONS, ROLE_DEFINITIONS, DEFAULT_WORKFLOW_STATUSES } from "../src/config/permissions";
import AppSetting from "../src/models/AppSetting";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/task-management";

const DEPARTMENTS = [
  { name: "Business Operations",                       code: "BIZ-OPS",  description: "Manages overall business operations, processes, and cross-functional coordination." },
  { name: "Customer Success",                          code: "CX",       description: "Ensures client satisfaction, retention, and long-term relationship management." },
  { name: "Finance & Legal",                           code: "FIN-LEG",  description: "Oversees financial planning, reporting, compliance, and legal affairs." },
  { name: "Marketing & Growth",                        code: "MKT",      description: "Drives brand awareness, lead generation, and growth campaigns." },
  { name: "Sales & Partnerships",                      code: "SALES",    description: "Manages sales pipelines, partner deals, and revenue generation." },
  { name: "Service Provider Onboarding & Quality Control", code: "SPQC", description: "Handles onboarding of service providers and maintains quality standards." },
  { name: "Tech & Product",                            code: "TECH",     description: "Builds and maintains the product, infrastructure, and technical systems." },
  { name: "Academy / Training Division",               code: "ACADEMY",  description: "Develops training programs, learning materials, and staff development initiatives." },
];

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log("\n--- Cleaning up existing data ---");
  await Promise.all([
    Permission.deleteMany({}),
    Role.deleteMany({}),
    User.deleteMany({}),
    WorkflowStatus.deleteMany({}),
    Department.deleteMany({}),
    AppSetting.deleteMany({}),
  ]);
  console.log("All relevant collections cleared.");

  // ── 1. Seed Permissions ────────────────────────────────────────────────────
  console.log("\n--- Seeding Permissions ---");
  for (const perm of PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { resource: perm.resource, action: perm.action },
      { ...perm },
      { upsert: true, new: true }
    );
  }
  const allPermissions = await Permission.find().lean();
  console.log(`Seeded ${allPermissions.length} permissions.`);

  // ── 2. Seed Roles ──────────────────────────────────────────────────────────
  console.log("\n--- Seeding Roles ---");
  for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
    const permIds = allPermissions
      .filter((p) =>
        (def.permissions as string[]).includes(`${p.resource}:${p.action}`)
      )
      .map((p) => p._id);

    await Role.findOneAndUpdate(
      { slug },
      {
        name: def.name,
        slug,
        description: def.description,
        permissions: permIds,
        isSystem: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log(`  Role "${def.name}" — ${permIds.length} permissions`);
  }

  // ── 3. Seed Departments ────────────────────────────────────────────────────
  console.log("\n--- Seeding Departments ---");
  for (const dept of DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { code: dept.code },
      { ...dept, isActive: true },
      { upsert: true, new: true }
    );
    console.log(`  Department "${dept.name}" (${dept.code})`);
  }

  // ── 4. Seed Workflow Statuses ──────────────────────────────────────────────
  console.log("\n--- Seeding Workflow Statuses ---");
  for (const status of DEFAULT_WORKFLOW_STATUSES) {
    await WorkflowStatus.findOneAndUpdate(
      { slug: status.slug },
      { ...status, isActive: true },
      { upsert: true, new: true }
    );
    console.log(`  Status "${status.name}"`);
  }

  // ── 5. Seed Super Admin User ───────────────────────────────────────────────
  console.log("\n--- Seeding Super Admin User ---");
  const superAdminRole = await Role.findOne({ slug: "super-admin" });
  if (!superAdminRole) throw new Error("Super Admin role not found");

  const existingAdmin = await User.findOne({ email: "admin@taskmanager.com" });
  if (!existingAdmin) {
    await User.create({
      email: "admin@taskmanager.com",
      password: "Admin@123",
      firstName: "Super",
      lastName: "Admin",
      roles: [superAdminRole._id],
      isActive: true,
    });
    console.log("  Created super admin: admin@taskmanager.com / Admin@123");
  } else {
    console.log("  Super admin already exists.");
  }

  // ── 6. Seed App Settings ───────────────────────────────────────────────────
  console.log("\n--- Seeding App Settings ---");
  const defaultSettings = [
    { key: "theme",              value: "light" },
    { key: "paginationLimit",    value: 20 },
    { key: "fileUploadMaxSize",  value: 10485760 }, // 10 MB
  ];
  for (const setting of defaultSettings) {
    await AppSetting.findOneAndUpdate(
      { key: setting.key },
      { value: setting.value },
      { upsert: true, new: true }
    );
    console.log(`  Setting "${setting.key}" = ${setting.value}`);
  }

  console.log("\n--- Seed Complete ---");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
