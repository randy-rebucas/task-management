import { NextResponse } from "next/server";

/**
 * GET /api/openapi
 *
 * Returns an OpenAPI 3.1 specification for the task-management API.
 *
 * To view interactively, paste the JSON response into:
 *   https://editor.swagger.io
 *
 * To render in-app, install swagger-ui-react and point it at this endpoint.
 */
export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Task Management API",
      version: "1.0.0",
      description:
        "Multi-tenant task management platform API. All tenant routes require session authentication and RBAC permission checks.",
      contact: { email: "dev@yourdomain.com" },
    },
    servers: [
      { url: "/api", description: "Current deployment" },
    ],
    tags: [
      { name: "Auth",          description: "Authentication & password reset" },
      { name: "Tasks",         description: "Task CRUD, comments, attachments, time logs" },
      { name: "Users",         description: "User & staff management" },
      { name: "Roles",         description: "Role & permission management" },
      { name: "Departments",   description: "Department management" },
      { name: "CRM",           description: "Leads, clients, deals, and pipeline" },
      { name: "Visit Logs",    description: "Field visit log submissions" },
      { name: "Proof of Work", description: "Proof-of-work submissions and locations" },
      { name: "Performance",   description: "KPIs and performance targets" },
      { name: "Analytics",     description: "Aggregated analytics data" },
      { name: "Reports",       description: "Exportable reports" },
      { name: "Notifications", description: "In-app notifications and rules" },
      { name: "Activity Logs", description: "Audit activity log" },
      { name: "Workflow",      description: "Workflow status configuration" },
      { name: "Settings",      description: "Tenant settings and billing" },
      { name: "Webhooks",      description: "Webhook delivery logs" },
      { name: "Dashboard",     description: "Dashboard summary data" },
      { name: "Plans",         description: "Platform subscription plans" },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
          description: "Session cookie issued by NextAuth after login.",
        },
      },
      schemas: {
        Pagination: {
          type: "object",
          properties: {
            page:       { type: "integer", example: 1 },
            limit:      { type: "integer", example: 20 },
            total:      { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 5 },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Unauthorized" },
          },
        },
        Task: {
          type: "object",
          properties: {
            _id:            { type: "string" },
            taskNumber:     { type: "string", example: "TASK-001" },
            title:          { type: "string" },
            description:    { type: "string" },
            status:         { type: "string", description: "WorkflowStatus ObjectId" },
            priority:       { type: "string", enum: ["low", "medium", "high", "urgent"] },
            taskType:       { type: "string" },
            assignees:      { type: "array", items: { type: "string" } },
            dueDate:        { type: "string", format: "date-time" },
            isRecurring:    { type: "boolean" },
            isArchived:     { type: "boolean" },
            createdAt:      { type: "string", format: "date-time" },
            updatedAt:      { type: "string", format: "date-time" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id:        { type: "string" },
            email:      { type: "string", format: "email" },
            firstName:  { type: "string" },
            lastName:   { type: "string" },
            jobTitle:   { type: "string" },
            isActive:   { type: "boolean" },
            roles:      { type: "array", items: { type: "string" } },
            department: { type: "string" },
          },
        },
        Lead: {
          type: "object",
          properties: {
            _id:        { type: "string" },
            name:       { type: "string" },
            company:    { type: "string" },
            email:      { type: "string", format: "email" },
            status:     { type: "string", enum: ["new", "contacted", "qualified", "unqualified", "converted"] },
            source:     { type: "string", enum: ["referral", "cold_call", "social_media", "website", "event", "other"] },
            assignedTo: { type: "string" },
          },
        },
        Client: {
          type: "object",
          properties: {
            _id:     { type: "string" },
            name:    { type: "string" },
            company: { type: "string" },
            email:   { type: "string", format: "email" },
            status:  { type: "string", enum: ["active", "inactive"] },
          },
        },
        VisitLog: {
          type: "object",
          properties: {
            _id:           { type: "string" },
            user:          { type: "string" },
            placesVisited: { type: "string" },
            peopleMet:     { type: "string" },
            purpose:       { type: "string" },
            outcome:       { type: "string" },
            nextAction:    { type: "string" },
            photos:        { type: "array", items: { type: "string" } },
            createdAt:     { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            _id:       { type: "string" },
            title:     { type: "string" },
            message:   { type: "string" },
            type:      { type: "string" },
            read:      { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        WebhookDelivery: {
          type: "object",
          properties: {
            _id:          { type: "string" },
            webhookId:    { type: "string" },
            event:        { type: "string" },
            url:          { type: "string", format: "uri" },
            status:       { type: "string", enum: ["pending", "success", "failed"] },
            responseCode: { type: "integer", example: 200 },
            durationMs:   { type: "integer", example: 145 },
            retryCount:   { type: "integer", example: 0 },
            deliveredAt:  { type: "string", format: "date-time" },
            error:        { type: "string" },
            createdAt:    { type: "string", format: "date-time" },
          },
        },
        Role: {
          type: "object",
          properties: {
            _id:         { type: "string" },
            name:        { type: "string" },
            slug:        { type: "string" },
            description: { type: "string" },
            permissions: { type: "array", items: { type: "string" } },
            isSystem:    { type: "boolean" },
          },
        },
        Department: {
          type: "object",
          properties: {
            _id:         { type: "string" },
            name:        { type: "string" },
            code:        { type: "string" },
            description: { type: "string" },
            isActive:    { type: "boolean" },
          },
        },
      },
    },
    security: [{ sessionCookie: [] }],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "firstName", "lastName"],
                  properties: {
                    email:     { type: "string", format: "email" },
                    password:  { type: "string", minLength: 8 },
                    firstName: { type: "string" },
                    lastName:  { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "User created" },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request a password reset email",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: { "200": { description: "Reset email sent (if address exists)" } },
        },
      },
      "/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Reset password using a token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "password"],
                  properties: {
                    token:    { type: "string" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Password reset successful" },
            "400": { description: "Invalid or expired token" },
          },
        },
      },

      // ── Tasks ─────────────────────────────────────────────────────────────
      "/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "List tasks",
          description: "Respects `tasks:view` vs `tasks:view_all` permissions.",
          parameters: [
            { name: "page",       in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit",      in: "query", schema: { type: "integer", default: 20 } },
            { name: "status",     in: "query", schema: { type: "string" } },
            { name: "priority",   in: "query", schema: { type: "string", enum: ["low", "medium", "high", "urgent"] } },
            { name: "assignee",   in: "query", schema: { type: "string" } },
            { name: "department", in: "query", schema: { type: "string" } },
            { name: "search",     in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Paginated task list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data:       { type: "array", items: { $ref: "#/components/schemas/Task" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Tasks"],
          summary: "Create a task",
          description: "Requires `tasks:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "status"],
                  properties: {
                    title:          { type: "string" },
                    description:    { type: "string" },
                    status:         { type: "string", description: "WorkflowStatus _id" },
                    priority:       { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    assignees:      { type: "array", items: { type: "string" } },
                    dueDate:        { type: "string", format: "date-time" },
                    department:     { type: "string" },
                    estimatedHours: { type: "number" },
                    tags:           { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Task created", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
            "400": { description: "Validation error" },
            "403": { description: "Forbidden — missing tasks:create permission" },
          },
        },
      },
      "/tasks/{taskId}": {
        get: {
          tags: ["Tasks"],
          summary: "Get task by ID",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Task detail", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } }, "404": { description: "Not found" } },
        },
        patch: {
          tags: ["Tasks"],
          summary: "Update a task",
          description: "Requires `tasks:update` permission.",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
          responses: { "200": { description: "Updated task" }, "403": { description: "Forbidden" }, "404": { description: "Not found" } },
        },
        delete: {
          tags: ["Tasks"],
          summary: "Delete / archive a task",
          description: "Requires `tasks:delete` permission.",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Task deleted" }, "403": { description: "Forbidden" } },
        },
      },
      "/tasks/{taskId}/comments": {
        get: {
          tags: ["Tasks"],
          summary: "List comments on a task",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Comment list" } },
        },
        post: {
          tags: ["Tasks"],
          summary: "Add a comment",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } } } } },
          responses: { "201": { description: "Comment created" } },
        },
      },
      "/tasks/{taskId}/time-logs": {
        get: {
          tags: ["Tasks"],
          summary: "List time logs for a task",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Time log list" } },
        },
        post: {
          tags: ["Tasks"],
          summary: "Log time on a task",
          parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["hours"],
                  properties: {
                    hours:   { type: "number", minimum: 0.25 },
                    notes:   { type: "string" },
                    logDate: { type: "string", format: "date" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Time log created" } },
        },
      },

      // ── Users ─────────────────────────────────────────────────────────────
      "/users": {
        get: {
          tags: ["Users"],
          summary: "List staff users",
          description: "Requires `users:view` permission.",
          parameters: [
            { name: "page",       in: "query", schema: { type: "integer" } },
            { name: "limit",      in: "query", schema: { type: "integer" } },
            { name: "search",     in: "query", schema: { type: "string" } },
            { name: "department", in: "query", schema: { type: "string" } },
            { name: "isActive",   in: "query", schema: { type: "boolean" } },
          ],
          responses: {
            "200": {
              description: "Paginated user list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data:       { type: "array", items: { $ref: "#/components/schemas/User" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Create a staff user",
          description: "Requires `users:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "firstName", "lastName", "roles"],
                  properties: {
                    email:      { type: "string", format: "email" },
                    password:   { type: "string" },
                    firstName:  { type: "string" },
                    lastName:   { type: "string" },
                    jobTitle:   { type: "string" },
                    department: { type: "string" },
                    roles:      { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "User created" }, "409": { description: "Email already exists" } },
        },
      },
      "/users/{userId}": {
        get: {
          tags: ["Users"],
          summary: "Get user profile",
          parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "User profile", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
        },
        patch: {
          tags: ["Users"],
          summary: "Update user",
          description: "Requires `users:update` permission.",
          parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          responses: { "200": { description: "Updated" } },
        },
        delete: {
          tags: ["Users"],
          summary: "Deactivate user",
          description: "Requires `users:delete` permission.",
          parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "User deactivated" } },
        },
      },

      // ── Roles ─────────────────────────────────────────────────────────────
      "/roles": {
        get: {
          tags: ["Roles"],
          summary: "List roles",
          description: "Requires `roles:view` permission.",
          responses: { "200": { description: "Role list", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Role" } } } } } },
        },
        post: {
          tags: ["Roles"],
          summary: "Create a custom role",
          description: "Requires `roles:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "permissions"],
                  properties: {
                    name:        { type: "string" },
                    description: { type: "string" },
                    permissions: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Role created" } },
        },
      },

      // ── Departments ───────────────────────────────────────────────────────
      "/departments": {
        get: {
          tags: ["Departments"],
          summary: "List departments",
          responses: { "200": { description: "Department list", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Department" } } } } } },
        },
        post: {
          tags: ["Departments"],
          summary: "Create a department",
          description: "Requires `departments:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "code"],
                  properties: {
                    name:        { type: "string" },
                    code:        { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Department created" } },
        },
      },

      // ── CRM ───────────────────────────────────────────────────────────────
      "/crm/leads": {
        get: {
          tags: ["CRM"],
          summary: "List leads",
          description: "Requires `crm:view` permission.",
          parameters: [
            { name: "page",   in: "query", schema: { type: "integer" } },
            { name: "limit",  in: "query", schema: { type: "integer" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Lead list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data:       { type: "array", items: { $ref: "#/components/schemas/Lead" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["CRM"],
          summary: "Create a lead",
          description: "Requires `crm:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "source"],
                  properties: {
                    name:    { type: "string" },
                    company: { type: "string" },
                    email:   { type: "string", format: "email" },
                    source:  { type: "string", enum: ["referral", "cold_call", "social_media", "website", "event", "other"] },
                    status:  { type: "string", enum: ["new", "contacted", "qualified", "unqualified", "converted"] },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Lead created" } },
        },
      },
      "/crm/clients": {
        get: {
          tags: ["CRM"],
          summary: "List clients",
          description: "Requires `crm:view` permission.",
          parameters: [
            { name: "page",   in: "query", schema: { type: "integer" } },
            { name: "limit",  in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Client list" } },
        },
        post: {
          tags: ["CRM"],
          summary: "Create a client",
          description: "Requires `crm:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name:    { type: "string" },
                    company: { type: "string" },
                    email:   { type: "string", format: "email" },
                    phone:   { type: "string" },
                    address: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Client created" } },
        },
      },

      // ── Visit Logs ────────────────────────────────────────────────────────
      "/visit-logs": {
        get: {
          tags: ["Visit Logs"],
          summary: "List visit logs",
          description: "Respects `visit_logs:view` (own) vs `visit_logs:view_all` permissions.",
          parameters: [
            { name: "page",  in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "user",  in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "Visit log list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data:       { type: "array", items: { $ref: "#/components/schemas/VisitLog" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Visit Logs"],
          summary: "Submit a visit log",
          description: "Requires `visit_logs:create` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["placesVisited", "peopleMet", "purpose", "outcome", "nextAction"],
                  properties: {
                    placesVisited: { type: "string" },
                    peopleMet:     { type: "string" },
                    purpose:       { type: "string" },
                    outcome:       { type: "string" },
                    nextAction:    { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Visit log submitted" } },
        },
      },

      // ── Notifications ─────────────────────────────────────────────────────
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List notifications for the current user",
          parameters: [
            { name: "page",   in: "query", schema: { type: "integer" } },
            { name: "limit",  in: "query", schema: { type: "integer" } },
            { name: "unread", in: "query", schema: { type: "boolean" } },
          ],
          responses: {
            "200": {
              description: "Notification list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data:        { type: "array", items: { $ref: "#/components/schemas/Notification" } },
                      pagination:  { $ref: "#/components/schemas/Pagination" },
                      unreadCount: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/notifications/read-all": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark all notifications as read",
          responses: { "200": { description: "All notifications marked as read" } },
        },
      },

      // ── Activity Logs ─────────────────────────────────────────────────────
      "/activity-logs": {
        get: {
          tags: ["Activity Logs"],
          summary: "List audit activity logs",
          description: "Requires `activity_logs:view` permission.",
          parameters: [
            { name: "page",   in: "query", schema: { type: "integer" } },
            { name: "limit",  in: "query", schema: { type: "integer" } },
            { name: "user",   in: "query", schema: { type: "string" } },
            { name: "action", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Activity log list" } },
        },
      },

      // ── Analytics ─────────────────────────────────────────────────────────
      "/analytics/coordinator-efficiency": {
        get: { tags: ["Analytics"], summary: "Coordinator task completion efficiency", description: "Requires `reports:view` permission.", responses: { "200": { description: "Efficiency data" } } },
      },
      "/analytics/pipeline-aging": {
        get: { tags: ["Analytics"], summary: "CRM pipeline aging breakdown", responses: { "200": { description: "Pipeline aging data" } } },
      },
      "/analytics/revenue-by-territory": {
        get: { tags: ["Analytics"], summary: "Revenue breakdown by territory", responses: { "200": { description: "Revenue data" } } },
      },
      "/analytics/visit-to-close": {
        get: { tags: ["Analytics"], summary: "Visit-to-close conversion rate", responses: { "200": { description: "Conversion data" } } },
      },
      "/analytics/conversion-by-industry": {
        get: { tags: ["Analytics"], summary: "Lead-to-client conversion by industry", responses: { "200": { description: "Industry conversion data" } } },
      },

      // ── Reports ───────────────────────────────────────────────────────────
      "/reports/tasks": {
        get: {
          tags: ["Reports"],
          summary: "Tasks summary report",
          description: "Requires `reports:view` permission.",
          parameters: [
            { name: "from",       in: "query", schema: { type: "string", format: "date" } },
            { name: "to",         in: "query", schema: { type: "string", format: "date" } },
            { name: "department", in: "query", schema: { type: "string" } },
            { name: "format",     in: "query", schema: { type: "string", enum: ["json", "csv", "pdf"] } },
          ],
          responses: { "200": { description: "Task report data or file download" } },
        },
      },
      "/reports/staff": {
        get: { tags: ["Reports"], summary: "Staff performance report", description: "Requires `reports:view` permission.", responses: { "200": { description: "Staff report" } } },
      },
      "/reports/overdue": {
        get: { tags: ["Reports"], summary: "Overdue tasks report", description: "Requires `reports:view` permission.", responses: { "200": { description: "Overdue tasks" } } },
      },

      // ── Dashboard ─────────────────────────────────────────────────────────
      "/dashboard": {
        get: {
          tags: ["Dashboard"],
          summary: "Dashboard summary data",
          description: "Data scoped by the caller's role and permissions.",
          responses: { "200": { description: "Dashboard summary" } },
        },
      },

      // ── Workflow ──────────────────────────────────────────────────────────
      "/workflow/statuses": {
        get: {
          tags: ["Workflow"],
          summary: "List workflow statuses",
          responses: { "200": { description: "Workflow status list" } },
        },
        post: {
          tags: ["Workflow"],
          summary: "Create a workflow status",
          description: "Requires `workflow:configure` permission.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name:      { type: "string" },
                    color:     { type: "string", example: "#3b82f6" },
                    isFinal:   { type: "boolean" },
                    isDefault: { type: "boolean" },
                    order:     { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Status created" } },
        },
      },

      // ── Performance ───────────────────────────────────────────────────────
      "/performance": {
        get: { tags: ["Performance"], summary: "List performance targets", description: "Requires `performance:view` permission.", responses: { "200": { description: "Target list" } } },
        post: { tags: ["Performance"], summary: "Create a performance target", description: "Requires `performance:manage` permission.", responses: { "201": { description: "Target created" } } },
      },

      // ── Proof of Work ─────────────────────────────────────────────────────
      "/proof-of-work": {
        get: { tags: ["Proof of Work"], summary: "List proof-of-work submissions", description: "Requires `proof_of_work:view` permission.", responses: { "200": { description: "Submission list" } } },
        post: { tags: ["Proof of Work"], summary: "Submit proof of work", description: "Requires `proof_of_work:submit` permission.", responses: { "201": { description: "Submission recorded" } } },
      },

      // ── Settings ──────────────────────────────────────────────────────────
      "/settings/general": {
        get: { tags: ["Settings"], summary: "Get general settings", responses: { "200": { description: "Settings object" } } },
        put: { tags: ["Settings"], summary: "Update general settings", description: "Requires `settings:manage` permission.", responses: { "200": { description: "Updated settings" } } },
      },

      // ── Webhooks ──────────────────────────────────────────────────────────
      "/settings/webhook-deliveries": {
        get: {
          tags: ["Webhooks"],
          summary: "List webhook delivery logs",
          description: "Requires `settings:manage` permission.",
          parameters: [
            { name: "page",      in: "query", schema: { type: "integer" } },
            { name: "limit",     in: "query", schema: { type: "integer" } },
            { name: "webhookId", in: "query", schema: { type: "string" } },
            { name: "status",    in: "query", schema: { type: "string", enum: ["pending", "success", "failed"] } },
          ],
          responses: {
            "200": {
              description: "Paginated delivery log list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data:       { type: "array", items: { $ref: "#/components/schemas/WebhookDelivery" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          tags: ["Webhooks"],
          summary: "Clear delivery logs older than 30 days",
          description: "Requires `settings:manage` permission.",
          responses: {
            "200": {
              description: "Cleanup result",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message:      { type: "string" },
                      deletedCount: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Plans ─────────────────────────────────────────────────────────────
      "/plans": {
        get: {
          tags: ["Plans"],
          summary: "List available subscription plans",
          security: [],
          responses: { "200": { description: "Plan list" } },
        },
      },

      // ── Upload ────────────────────────────────────────────────────────────
      "/upload": {
        post: {
          tags: ["Settings"],
          summary: "Upload a file (avatar, attachment, proof photo)",
          requestBody: {
            required: true,
            content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } },
          },
          responses: {
            "200": {
              description: "Uploaded file URL",
              content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } } } } },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      // Allow Swagger UI hosted on other origins to consume this spec
      "Access-Control-Allow-Origin": "*",
    },
  });
}
