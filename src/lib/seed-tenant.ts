/**
 * Seeds a freshly-created tenant database with default reference data:
 * Permissions, Roles, Departments, Workflow Statuses, App Settings, and the first admin user.
 */
import mongoose from "mongoose";
import { getTenantModels } from "@/lib/tenant-models";
import { PERMISSIONS, ROLE_DEFINITIONS, DEFAULT_WORKFLOW_STATUSES } from "@/config/permissions";

const DEFAULT_DEPARTMENTS = [
  { name: "Business Operations",    code: "BIZ-OPS",  description: "Manages overall business operations and cross-functional coordination." },
  { name: "Customer Success",       code: "CX",       description: "Ensures client satisfaction and long-term relationship management." },
  { name: "Finance & Legal",        code: "FIN-LEG",  description: "Oversees financial planning, compliance, and legal affairs." },
  { name: "Marketing & Growth",     code: "MKT",      description: "Drives brand awareness and lead generation." },
  { name: "Sales & Partnerships",   code: "SALES",    description: "Manages sales pipelines and revenue generation." },
  { name: "Tech & Product",         code: "TECH",     description: "Builds and maintains the product and infrastructure." },
];

export interface SeedTenantOptions {
  conn: mongoose.Connection;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export async function seedTenant({
  conn,
  adminEmail,
  adminPassword,
  adminFirstName,
  adminLastName,
}: SeedTenantOptions) {
  const models = getTenantModels(conn);

  // 1. Seed Permissions
  for (const perm of PERMISSIONS) {
    await models.Permission.findOneAndUpdate(
      { resource: perm.resource, action: perm.action },
      { ...perm },
      { upsert: true, new: true }
    );
  }
  const allPermissions = await models.Permission.find().lean();

  // 2. Seed Roles
  const roleMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
    const permIds = allPermissions
      .filter((p: any) =>
        (def.permissions as string[]).includes(`${p.resource}:${p.action}`)
      )
      .map((p: any) => p._id);

    const role = await models.Role.findOneAndUpdate(
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
    if (role) roleMap[slug] = (role as any)._id;
  }

  // 3. Seed Departments
  for (const dept of DEFAULT_DEPARTMENTS) {
    await models.Department.findOneAndUpdate(
      { code: dept.code },
      { ...dept, isActive: true },
      { upsert: true, new: true }
    );
  }

  // 4. Seed Workflow Statuses
  for (const status of DEFAULT_WORKFLOW_STATUSES) {
    await models.WorkflowStatus.findOneAndUpdate(
      { slug: (status as any).slug },
      { ...(status as any), isActive: true },
      { upsert: true, new: true }
    );
  }

  // 5. Seed default App Settings
  await models.AppSetting.findOneAndUpdate(
    { key: "allow_self_registration" },
    { key: "allow_self_registration", value: false },
    { upsert: true }
  );

  // 6. Create the first admin user
  const superAdminRole = roleMap["super-admin"] ?? roleMap["admin"];

  const existingAdmin = await models.User.findOne({
    email: adminEmail.toLowerCase(),
  });
  if (!existingAdmin) {
    await models.User.create({
      email: adminEmail.toLowerCase(),
      password: adminPassword, // pre("save") hook in UserSchema will hash this
      firstName: adminFirstName,
      lastName: adminLastName,
      roles: superAdminRole ? [superAdminRole] : [],
      isActive: true,
    });
  }

  return { permissionsCount: allPermissions.length };
}
