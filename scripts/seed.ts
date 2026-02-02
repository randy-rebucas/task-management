import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import Permission from "../src/models/Permission";
import Role from "../src/models/Role";
import User from "../src/models/User";
import WorkflowStatus from "../src/models/WorkflowStatus";
import { PERMISSIONS, ROLE_DEFINITIONS, DEFAULT_WORKFLOW_STATUSES } from "../src/config/permissions";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/task-management";

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  // 1. Seed Permissions
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

  // 2. Seed Roles
  console.log("\n--- Seeding Roles ---");
  for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
    const permIds = allPermissions
      .filter((p) => def.permissions.includes(`${p.resource}:${p.action}`))
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
    console.log(`  Role "${def.name}" - ${permIds.length} permissions`);
  }

  // 3. Seed Workflow Statuses
  console.log("\n--- Seeding Workflow Statuses ---");
  for (const status of DEFAULT_WORKFLOW_STATUSES) {
    await WorkflowStatus.findOneAndUpdate(
      { slug: status.slug },
      { ...status, isActive: true },
      { upsert: true, new: true }
    );
    console.log(`  Status "${status.name}"`);
  }

  // 4. Seed Super Admin User
  console.log("\n--- Seeding Super Admin User ---");
  const superAdminRole = await Role.findOne({ slug: "super-admin" });
  if (!superAdminRole) {
    throw new Error("Super Admin role not found");
  }

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

  console.log("\n--- Seed Complete ---");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
