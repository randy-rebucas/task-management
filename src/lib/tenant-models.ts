/**
 * Tenant Model Factory
 * ────────────────────
 * Registers and returns all Mongoose models bound to a tenant-specific DB connection.
 * Importing the model files registers their schemas on the default mongoose instance
 * (no actual DB connection required), allowing us to re-use those schemas on any
 * per-tenant connection via conn.model(name, defaultSchema).
 *
 * Usage in API routes (via withTenantAuth / withTenantPermission):
 *   const { Task, User, Department } = models;
 *   const tasks = await Task.find({ ... });
 */

// Side-effect imports: register schemas on the default mongoose instance
import "@/models/ActivityLog";
import "@/models/AppSetting";
import "@/models/Client";
import "@/models/CommissionRule";
import "@/models/CrmAttachment";
import "@/models/CrmInteraction";
import "@/models/Deal";
import "@/models/Department";
import "@/models/FieldSession";
import "@/models/Lead";
import "@/models/LoginHistory";
import "@/models/Notification";
import "@/models/NotificationRule";
import "@/models/PartnerLocation";
import "@/models/PerformanceTarget";
import "@/models/Permission";
import "@/models/ProofOfWork";
import "@/models/Role";
import "@/models/Subscription";
import "@/models/Task";
import "@/models/TaskAttachment";
import "@/models/TaskComment";
import "@/models/TaskDependency";
import "@/models/TaskTimeLog";
import "@/models/User";
import "@/models/VisitLog";
import "@/models/WorkflowStatus";
import "@/models/WorkflowTransition";

import mongoose, { Connection, Model } from "mongoose";
import type { IUser } from "@/types";

/**
 * Given a tenant-specific MongoDB connection, return all models
 * bound to that connection (uses schemas from the default instance).
 */
export function getTenantModels(conn: Connection) {
  function m<T>(name: string): Model<T> {
    return (
      conn.models[name] ??
      conn.model<T>(name, mongoose.models[name]?.schema)
    );
  }

  return {
    ActivityLog:      m("ActivityLog"),
    AppSetting:       m("AppSetting"),
    Client:           m("Client"),
    CommissionRule:   m("CommissionRule"),
    CrmAttachment:    m("CrmAttachment"),
    CrmInteraction:   m("CrmInteraction"),
    Deal:             m("Deal"),
    Department:       m("Department"),
    FieldSession:     m("FieldSession"),
    Lead:             m("Lead"),
    LoginHistory:     m("LoginHistory"),
    Notification:     m("Notification"),
    NotificationRule: m("NotificationRule"),
    PartnerLocation:  m("PartnerLocation"),
    PerformanceTarget:m("PerformanceTarget"),
    Permission:       m("Permission"),
    ProofOfWork:      m("ProofOfWork"),
    Role:             m("Role"),
    Subscription:     m("Subscription"),
    Task:             m("Task"),
    TaskAttachment:   m("TaskAttachment"),
    TaskComment:      m("TaskComment"),
    TaskDependency:   m("TaskDependency"),
    TaskTimeLog:      m("TaskTimeLog"),
    User:             m<IUser>("User"),
    VisitLog:         m("VisitLog"),
    WorkflowStatus:   m("WorkflowStatus"),
    WorkflowTransition: m("WorkflowTransition"),
  };
}

export type TenantModels = ReturnType<typeof getTenantModels>;
