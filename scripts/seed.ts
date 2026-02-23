/**
 * Multi-tenant aware seed script.
 *
 * What it does:
 *   1. Creates/upserts a tenant record in the `platform` DB.
 *   2. Seeds the tenant DB (permissions, roles, departments, workflow statuses,
 *      app settings, and the first admin user) via the shared seedTenant helper.
 *   3. Seeds realistic demo data: staff users, tasks, CRM leads & clients,
 *      and field visit logs for QA and demo environments.
 *
 * Configurable via env vars (all have sensible defaults):
 *   TENANT_SLUG        – subdomain slug   (default: "localpro")
 *   TENANT_NAME        – display name     (default: "LocalPro")
 *   ADMIN_EMAIL        – admin email      (default: "admin@taskmanager.com")
 *   ADMIN_PASSWORD     – admin password   (default: "Admin@123")
 *   ADMIN_FIRST_NAME   – first name       (default: "Super")
 *   ADMIN_LAST_NAME    – last name        (default: "Admin")
 *   SEED_DEMO_DATA     – set to "true" to seed demo data (default: "true")
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getTenantConnection, tenantDbName } from "@/lib/tenant-db";
import { seedTenant } from "@/lib/seed-tenant";
import { getTenantModels } from "@/lib/tenant-models";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set in .env.local");

// ── Config ─────────────────────────────────────────────────────────────────────
const TENANT_SLUG       = process.env.TENANT_SLUG       || "localpro";
const TENANT_NAME       = process.env.TENANT_NAME       || "LocalPro";
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL       || "admin@taskmanager.com";
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD    || "Admin@123";
const ADMIN_FIRST_NAME  = process.env.ADMIN_FIRST_NAME  || "Super";
const ADMIN_LAST_NAME   = process.env.ADMIN_LAST_NAME   || "Admin";
const SEED_DEMO_DATA    = process.env.SEED_DEMO_DATA    !== "false"; // default: true

// ── Demo Data ────────────────────────────────────────────────────────────────
/**
 * Seeds realistic demo data into the tenant DB:
 *   - 6 staff users across multiple roles and departments
 *   - 12 tasks spread across all workflow statuses
 *   - 6 CRM leads in various pipeline stages
 *   - 3 CRM clients
 *   - 6 field visit logs
 */
async function seedDemoData(conn: mongoose.Connection) {
  const models = getTenantModels(conn);

  // ── Resolve reference IDs ──────────────────────────────────────────────────
  const roles       = await (models.Role as any).find().lean() as any[];
  const departments = await (models.Department as any).find().lean() as any[];
  const statuses    = await (models.WorkflowStatus as any).find().sort({ order: 1 }).lean() as any[];
  const adminUser   = await (models.User as any).findOne({ email: ADMIN_EMAIL.toLowerCase() }).lean() as any;

  if (!adminUser) {
    console.log("  ⚠ Admin user not found — skipping demo data.");
    return;
  }

  const findRole   = (slug: string) => roles.find((r: any) => r.slug === slug)?._id;
  const findDept   = (code: string) => departments.find((d: any) => d.code === code)?._id;
  const findStatus = (s: string)    => statuses.find((ws: any) => ws.slug === s)?._id;

  const todoId       = findStatus("to-do");
  const inProgressId = findStatus("in-progress");
  const onHoldId     = findStatus("on-hold");
  const forReviewId  = findStatus("for-review");
  const completedId  = findStatus("completed");

  const salesDeptId = findDept("SALES");
  const techDeptId  = findDept("TECH");
  const mktDeptId   = findDept("MKT");
  const cxDeptId    = findDept("CX");
  const bizDeptId   = findDept("BIZ-OPS");

  // ── 1. Staff Users ─────────────────────────────────────────────────────────
  const staffSeed = [
    {
      email: "ops.manager@localpro.com",
      password: "Staff@123",
      firstName: "Maria",
      lastName: "Santos",
      jobTitle: "Operations Manager",
      roles: [findRole("operations-manager")].filter(Boolean),
      department: bizDeptId,
      isActive: true,
    },
    {
      email: "sales.rep1@localpro.com",
      password: "Staff@123",
      firstName: "Juan",
      lastName: "Dela Cruz",
      jobTitle: "Sales Representative",
      roles: [findRole("sales-staff") ?? findRole("field-staff") ?? findRole("staff")].filter(Boolean),
      department: salesDeptId,
      isActive: true,
    },
    {
      email: "sales.rep2@localpro.com",
      password: "Staff@123",
      firstName: "Ana",
      lastName: "Reyes",
      jobTitle: "Senior Sales Representative",
      roles: [findRole("sales-staff") ?? findRole("field-staff") ?? findRole("staff")].filter(Boolean),
      department: salesDeptId,
      isActive: true,
    },
    {
      email: "tech.lead@localpro.com",
      password: "Staff@123",
      firstName: "Kevin",
      lastName: "Tan",
      jobTitle: "Tech Lead",
      roles: [findRole("tech-staff") ?? findRole("staff")].filter(Boolean),
      department: techDeptId,
      isActive: true,
    },
    {
      email: "cx.agent@localpro.com",
      password: "Staff@123",
      firstName: "Liza",
      lastName: "Gomez",
      jobTitle: "Customer Success Agent",
      roles: [findRole("staff")].filter(Boolean),
      department: cxDeptId,
      isActive: true,
    },
    {
      email: "marketing.coord@localpro.com",
      password: "Staff@123",
      firstName: "Paulo",
      lastName: "Mendoza",
      jobTitle: "Marketing Coordinator",
      roles: [findRole("staff")].filter(Boolean),
      department: mktDeptId,
      isActive: true,
    },
  ];

  const createdUsers: any[] = [];
  for (const u of staffSeed) {
    const existing = await (models.User as any).findOne({ email: u.email.toLowerCase() });
    if (!existing) {
      const created = await (models.User as any).create({ ...u, email: u.email.toLowerCase() });
      createdUsers.push(created);
    } else {
      createdUsers.push(existing);
    }
  }
  console.log(`  Seeded ${createdUsers.length} staff users.`);

  const [opsManager, salesRep1, salesRep2, techLead, cxAgent, mktCoord] = createdUsers;

  // ── 2. Tasks ───────────────────────────────────────────────────────────────
  let taskCounter = 1;
  const taskNum = () => `TASK-${String(taskCounter++).padStart(4, "0")}`;

  const tomorrow  = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek  = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek  = new Date(); lastWeek.setDate(lastWeek.getDate() - 7);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);

  const tasksSeed = [
    {
      taskNumber: taskNum(),
      title: "Onboard new enterprise client — ABC Holdings",
      description: "Complete the onboarding checklist and schedule the initial training session.",
      status: inProgressId ?? todoId,
      priority: "high",
      taskType: "client_meeting",
      assignees: [salesRep1?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: salesDeptId,
      dueDate: nextWeek,
      estimatedHours: 8,
      tags: ["onboarding", "enterprise"],
    },
    {
      taskNumber: taskNum(),
      title: "Follow up on Q1 proposal — XYZ Corp",
      description: "Re-engage the client on the outstanding proposal. Confirm budget approval status.",
      status: todoId,
      priority: "urgent",
      taskType: "lead_follow_up",
      assignees: [salesRep2?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: salesDeptId,
      dueDate: tomorrow,
      estimatedHours: 2,
      tags: ["follow-up", "proposal"],
    },
    {
      taskNumber: taskNum(),
      title: "Deploy v2.3 hotfix to production",
      description: "Apply the critical security patch. Verify rollback plan before deployment.",
      status: forReviewId ?? inProgressId,
      priority: "urgent",
      taskType: "internal_task",
      assignees: [techLead?._id].filter(Boolean),
      createdBy: adminUser._id,
      department: techDeptId,
      dueDate: tomorrow,
      estimatedHours: 4,
      tags: ["deployment", "security"],
    },
    {
      taskNumber: taskNum(),
      title: "Prepare monthly marketing report",
      description: "Aggregate campaign metrics from all channels for the board deck.",
      status: inProgressId ?? todoId,
      priority: "medium",
      taskType: "internal_task",
      assignees: [mktCoord?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: mktDeptId,
      dueDate: nextWeek,
      estimatedHours: 6,
      tags: ["reporting", "marketing"],
    },
    {
      taskNumber: taskNum(),
      title: "Collect payment from Dela Rosa Enterprises",
      description: "Invoice #1042 is 14 days overdue. Coordinate with the client's accounts team.",
      status: inProgressId ?? todoId,
      priority: "high",
      taskType: "collection_payment",
      assignees: [salesRep1?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: salesDeptId,
      dueDate: tomorrow,
      estimatedHours: 1,
      tags: ["collections", "overdue"],
    },
    {
      taskNumber: taskNum(),
      title: "Conduct satisfaction survey — top 20 clients",
      description: "Send NPS survey via email and compile results for the quarterly review.",
      status: todoId,
      priority: "medium",
      taskType: "client_meeting",
      assignees: [cxAgent?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: cxDeptId,
      dueDate: nextWeek,
      estimatedHours: 5,
      tags: ["survey", "NPS"],
    },
    {
      taskNumber: taskNum(),
      title: "Partner onboarding — Sunrise Cleaning Co.",
      description: "Issue partner agreement, set up system access, and schedule kickoff.",
      status: completedId ?? forReviewId,
      priority: "medium",
      taskType: "partner_onboarding",
      assignees: [opsManager?._id].filter(Boolean),
      createdBy: adminUser._id,
      department: bizDeptId,
      dueDate: lastWeek,
      completedAt: lastWeek,
      estimatedHours: 3,
      actualHours: 3,
      tags: ["partner", "onboarding"],
    },
    {
      taskNumber: taskNum(),
      title: "Review and approve Q2 marketing budget",
      description: "Finance team requires sign-off before the budget is released.",
      status: onHoldId ?? todoId,
      priority: "high",
      taskType: "internal_task",
      assignees: [opsManager?._id].filter(Boolean),
      createdBy: adminUser._id,
      department: bizDeptId,
      dueDate: nextWeek,
      estimatedHours: 2,
      tags: ["budget", "approval"],
    },
    {
      taskNumber: taskNum(),
      title: "Field visit — Iloilo City industrial zone",
      description: "Site survey for potential service expansion in the industrial corridor.",
      status: completedId ?? forReviewId,
      priority: "medium",
      taskType: "field_visit",
      assignees: [salesRep2?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: salesDeptId,
      dueDate: yesterday,
      completedAt: yesterday,
      estimatedHours: 4,
      actualHours: 3.5,
      tags: ["field", "site-survey"],
    },
    {
      taskNumber: taskNum(),
      title: "Submit orientation event logistics plan",
      description: "Finalize venue, attendee list, and materials for the April orientation.",
      status: todoId,
      priority: "low",
      taskType: "orientation_event",
      assignees: [mktCoord?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: mktDeptId,
      dueDate: nextWeek,
      estimatedHours: 3,
      tags: ["event", "orientation"],
    },
    {
      taskNumber: taskNum(),
      title: "System access audit — deactivate ex-staff accounts",
      description: "Cross-check payroll records against active user accounts.",
      status: inProgressId ?? todoId,
      priority: "high",
      taskType: "internal_task",
      assignees: [techLead?._id].filter(Boolean),
      createdBy: adminUser._id,
      department: techDeptId,
      dueDate: tomorrow,
      estimatedHours: 2,
      tags: ["security", "audit"],
    },
    {
      taskNumber: taskNum(),
      title: "Send renewal notice to expiring subscriptions",
      description: "7 clients are within 30 days of contract expiry. Draft and send renewal emails.",
      status: completedId ?? inProgressId,
      priority: "medium",
      taskType: "lead_follow_up",
      assignees: [cxAgent?._id].filter(Boolean),
      createdBy: opsManager?._id ?? adminUser._id,
      department: cxDeptId,
      dueDate: lastWeek,
      completedAt: lastWeek,
      estimatedHours: 2,
      actualHours: 1.5,
      tags: ["renewal", "retention"],
    },
  ];

  let tasksSeeded = 0;
  for (const t of tasksSeed) {
    const existing = await (models.Task as any).findOne({ taskNumber: t.taskNumber });
    if (!existing) {
      await (models.Task as any).create(t);
      tasksSeeded++;
    }
  }
  console.log(`  Seeded ${tasksSeeded} tasks.`);

  // ── 3. CRM Leads ───────────────────────────────────────────────────────────
  const leadsSeed = [
    {
      name: "Roberto Aquino",
      company: "Aquino Trading Corp",
      industry: "Wholesale Distribution",
      email: "r.aquino@aquinotrading.com",
      phone: "+63 917 123 4567",
      source: "referral",
      status: "qualified",
      assignedTo: salesRep1?._id,
      createdBy: salesRep1?._id ?? adminUser._id,
      notes: "Referred by ABC Holdings. Very interested in the enterprise package.",
      followUpDate: nextWeek,
    },
    {
      name: "Claire Fontaine",
      company: "Fontaine Hospitality Group",
      industry: "Hospitality",
      email: "claire@fontainehotel.com",
      phone: "+63 918 234 5678",
      source: "website",
      status: "contacted",
      assignedTo: salesRep2?._id,
      createdBy: salesRep2?._id ?? adminUser._id,
      notes: "Filled out the website demo form. Needs a tailored deck for hotel operations.",
      followUpDate: tomorrow,
    },
    {
      name: "Dennis Morales",
      company: "Morales Construction Inc.",
      industry: "Construction",
      email: "dennis.morales@moralesci.ph",
      phone: "+63 919 345 6789",
      source: "cold_call",
      status: "new",
      assignedTo: salesRep1?._id,
      createdBy: opsManager?._id ?? adminUser._id,
      notes: "Cold outreach. Left a voicemail. Follow up by Thursday.",
    },
    {
      name: "Joy Villanueva",
      company: "Villanueva Pharma Distributors",
      industry: "Healthcare",
      email: "jvillanueva@vpharma.com",
      phone: "+63 920 456 7890",
      source: "event",
      status: "qualified",
      assignedTo: salesRep2?._id,
      createdBy: salesRep2?._id ?? adminUser._id,
      notes: "Met at the SME summit. Expressed urgency in streamlining field ops.",
      followUpDate: nextWeek,
    },
    {
      name: "Marco Lim",
      company: "Lim & Sons Property Management",
      industry: "Real Estate",
      email: "marco.lim@limsons.com",
      phone: "+63 921 567 8901",
      source: "social_media",
      status: "unqualified",
      assignedTo: salesRep1?._id,
      createdBy: opsManager?._id ?? adminUser._id,
      notes: "Budget is below minimum threshold. Re-engage in Q3.",
    },
    {
      name: "Patricia Sanche",
      company: "Sanche Edu Partners",
      industry: "Education",
      email: "p.sanche@sancheedu.org",
      phone: "+63 922 678 9012",
      source: "referral",
      status: "converted",
      assignedTo: salesRep2?._id,
      createdBy: salesRep2?._id ?? adminUser._id,
      notes: "Successfully converted to client in March 2026.",
    },
  ];

  let leadsSeeded = 0;
  for (const l of leadsSeed) {
    const existing = await (models.Lead as any).findOne({ email: l.email });
    if (!existing) {
      await (models.Lead as any).create(l);
      leadsSeeded++;
    }
  }
  console.log(`  Seeded ${leadsSeeded} CRM leads.`);

  // ── 4. CRM Clients ─────────────────────────────────────────────────────────
  const clientsSeed = [
    {
      name: "ABC Holdings Inc.",
      company: "ABC Holdings Inc.",
      industry: "Conglomerate",
      email: "admin@abcholdings.ph",
      phone: "+63 932 111 2222",
      address: "12F Ayala Tower, Makati City",
      website: "https://abcholdings.ph",
      contactPersonName: "Gina Ramos",
      contactPersonTitle: "Head of Operations",
      contactPersonPhone: "+63 932 111 2223",
      status: "active",
      assignedTo: salesRep1?._id,
      department: salesDeptId,
      createdBy: salesRep1?._id ?? adminUser._id,
      notes: "Flagship enterprise account. Renewed contract in January 2026.",
    },
    {
      name: "Sanche Edu Partners",
      company: "Sanche Edu Partners",
      industry: "Education",
      email: "p.sanche@sancheedu.org",
      phone: "+63 922 678 9012",
      address: "45 University Ave, Iloilo City",
      contactPersonName: "Patricia Sanche",
      contactPersonTitle: "Executive Director",
      contactPersonPhone: "+63 922 678 9013",
      status: "active",
      assignedTo: salesRep2?._id,
      department: salesDeptId,
      createdBy: salesRep2?._id ?? adminUser._id,
      notes: "Converted from lead pipeline in March 2026.",
    },
    {
      name: "Sunrise Cleaning Co.",
      company: "Sunrise Cleaning Co.",
      industry: "Facilities Management",
      email: "ops@sunrisecleaning.ph",
      phone: "+63 945 333 4444",
      address: "Brgy. Lapuz, Iloilo City",
      contactPersonName: "Billy Recto",
      contactPersonTitle: "Operations Head",
      contactPersonPhone: "+63 945 333 4445",
      status: "active",
      assignedTo: opsManager?._id,
      department: salesDeptId,
      createdBy: adminUser._id,
      notes: "Partner account. Service-provider agreement signed Feb 2026.",
    },
  ];

  let clientsSeeded = 0;
  for (const c of clientsSeed) {
    const existing = await (models.Client as any).findOne({ email: c.email });
    if (!existing) {
      await (models.Client as any).create(c);
      clientsSeeded++;
    }
  }
  console.log(`  Seeded ${clientsSeeded} CRM clients.`);

  // ── 5. Visit Logs ──────────────────────────────────────────────────────────
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const visitLogsSeed = [
    {
      user: salesRep1?._id ?? adminUser._id,
      placesVisited: "ABC Holdings Inc. — Makati City HQ",
      peopleMet: "Gina Ramos (Head of Operations), Dan Flores (IT Manager)",
      purpose: "Quarterly account review and contract renewal discussion",
      outcome: "Client confirmed renewal for another 12 months. Requested feature demo for mobile app.",
      nextAction: "Send renewal contract and schedule product demo for March 15.",
      createdAt: new Date(now - 2 * day),
    },
    {
      user: salesRep2?._id ?? adminUser._id,
      placesVisited: "Fontaine Hospitality Group — Iloilo Business Park",
      peopleMet: "Claire Fontaine (CEO), Mark Siy (CFO)",
      purpose: "Initial discovery meeting and product walkthrough",
      outcome: "Strong interest. Requested a customized pricing proposal for 3 branches.",
      nextAction: "Prepare tailored proposal and send by Friday.",
      createdAt: new Date(now - 1 * day),
    },
    {
      user: salesRep1?._id ?? adminUser._id,
      placesVisited: "Morales Construction Inc. — Mandurriao, Iloilo City",
      peopleMet: "Dennis Morales (Owner)",
      purpose: "Cold visit following unsuccessful phone outreach",
      outcome: "Met briefly. Prospect is currently reviewing solutions from two other vendors.",
      nextAction: "Send comparison sheet and follow up in 2 weeks.",
      createdAt: new Date(now - 3 * day),
    },
    {
      user: opsManager?._id ?? adminUser._id,
      placesVisited: "Sunrise Cleaning Co. — Operations Hub, Lapuz",
      peopleMet: "Billy Recto (Operations Head), Cita Cruz (Scheduler)",
      purpose: "Partner onboarding walkthrough and system training",
      outcome: "Onboarding complete. All 3 key staff have system access. First tasks created.",
      nextAction: "Schedule 30-day check-in call.",
      createdAt: new Date(now - 5 * day),
    },
    {
      user: salesRep2?._id ?? adminUser._id,
      placesVisited: "Iloilo City Industrial Corridor — Brgy. Bito-on",
      peopleMet: "Various business owners (3 establishments)",
      purpose: "Market expansion survey — feasibility of field service expansion",
      outcome: "Identified 2 high-potential prospects. Collected contact details.",
      nextAction: "Create leads in CRM and initiate contact within 48 hours.",
      createdAt: new Date(now - 4 * day),
    },
    {
      user: cxAgent?._id ?? adminUser._id,
      placesVisited: "Sanche Edu Partners — University Ave, Iloilo City",
      peopleMet: "Patricia Sanche (Executive Director)",
      purpose: "Post-onboarding check-in and NPS survey",
      outcome: "NPS score: 9/10. Client is very satisfied. Requested referral program info.",
      nextAction: "Send referral program details and materials.",
      createdAt: new Date(now - 6 * day),
    },
  ];

  let visitLogsSeeded = 0;
  for (const v of visitLogsSeed) {
    await (models.VisitLog as any).create(v);
    visitLogsSeeded++;
  }
  console.log(`  Seeded ${visitLogsSeeded} visit logs.`);
}

async function seed() {
  console.log("=== Multi-Tenant Seed ===\n");
  console.log(`  Tenant slug : ${TENANT_SLUG}`);
  console.log(`  Tenant name : ${TENANT_NAME}`);
  console.log(`  Admin email : ${ADMIN_EMAIL}`);

  // ── 1. Upsert tenant in platform DB ─────────────────────────────────────────
  console.log("\n--- Step 1: Platform DB — upsert tenant ---");
  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);

  const dbName = tenantDbName(TENANT_SLUG);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 365); // 1-year trial for seed

  const tenant = await Tenant.findOneAndUpdate(
    { slug: TENANT_SLUG },
    {
      slug: TENANT_SLUG,
      name: TENANT_NAME,
      dbName,
      adminEmail: ADMIN_EMAIL.toLowerCase(),
      plan: "trial",
      status: "active",
      trialEndsAt,
      maxUsers: 100,
    },
    { upsert: true, new: true }
  );
  console.log(`  Tenant "${tenant.name}" (slug: ${tenant.slug}, db: ${tenant.dbName}) — OK`);

  // ── 2. Seed tenant DB ────────────────────────────────────────────────────────
  console.log("\n--- Step 2: Tenant DB — seed data ---");
  const tenantConn = await getTenantConnection(dbName);

  const { permissionsCount } = await seedTenant({
    conn: tenantConn,
    adminEmail:      ADMIN_EMAIL,
    adminPassword:   ADMIN_PASSWORD,
    adminFirstName:  ADMIN_FIRST_NAME,
    adminLastName:   ADMIN_LAST_NAME,
  });

  console.log(`  Seeded ${permissionsCount} permissions, roles, departments, workflow statuses.`);
  console.log(`  Admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // ── 3. Demo data ─────────────────────────────────────────────────────────────
  if (SEED_DEMO_DATA) {
    console.log("\n--- Step 3: Demo data ---");
    await seedDemoData(tenantConn);
  } else {
    console.log("\n  Skipping demo data (SEED_DEMO_DATA=false).");
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;

  console.log("\n=== Seed Complete ===");
  console.log(`\nLogin URLs:`);
  console.log(`  Local dev  : http://localhost:3000/login?__tenant=${TENANT_SLUG}`);
  if (appDomain) {
    console.log(`  Production : https://${TENANT_SLUG}.${appDomain}/login`);
  }
  console.log(`\nCredentials:`);
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Tenant  : ${TENANT_SLUG}\n`);

  // Close named connections manually (platform + tenant)
  try { await platformDb.close(); } catch {}
  try { await tenantConn.close(); } catch {}
  try { await mongoose.disconnect(); } catch {}

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
