import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  createRoleSchema,
  updateRoleSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createVisitLogSchema,
  createNotificationRuleSchema,
  createTaskSchema,
  resetPasswordSchema,
} from "@/features/auth/validators";

// ── loginSchema ───────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(() =>
      loginSchema.parse({ email: "user@example.com", password: "pass" })
    ).not.toThrow();
  });

  it("rejects an invalid email", () => {
    const r = loginSchema.safeParse({ email: "not-an-email", password: "pass" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const r = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(r.success).toBe(false);
  });
});

// ── registerSchema ────────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const valid = {
    email: "new@example.com",
    password: "password1",
    firstName: "Jane",
    lastName: "Doe",
  };

  it("accepts valid registration data", () => {
    expect(() => registerSchema.parse(valid)).not.toThrow();
  });

  it("rejects passwords shorter than 8 characters", () => {
    const r = registerSchema.safeParse({ ...valid, password: "short" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty firstName", () => {
    const r = registerSchema.safeParse({ ...valid, firstName: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing lastName", () => {
    const r = registerSchema.safeParse({ ...valid, lastName: undefined });
    expect(r.success).toBe(false);
  });
});

// ── resetPasswordSchema ───────────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  it("accepts a valid token and long enough password", () => {
    expect(() =>
      resetPasswordSchema.parse({ token: "abc123", password: "newpassword" })
    ).not.toThrow();
  });

  it("rejects password shorter than 8 characters", () => {
    const r = resetPasswordSchema.safeParse({ token: "abc", password: "short" });
    expect(r.success).toBe(false);
  });
});

// ── createUserSchema ──────────────────────────────────────────────────────────

describe("createUserSchema", () => {
  const valid = {
    email: "staff@example.com",
    password: "password1",
    firstName: "Staff",
    lastName: "Member",
    roles: ["role-id-1"],
  };

  it("accepts valid user data", () => {
    expect(() => createUserSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty roles array", () => {
    const r = createUserSchema.safeParse({ ...valid, roles: [] });
    expect(r.success).toBe(false);
  });

  it("accepts optional fields omitted", () => {
    expect(() => createUserSchema.parse(valid)).not.toThrow();
  });

  it("accepts optional department and jobTitle", () => {
    expect(() =>
      createUserSchema.parse({
        ...valid,
        department: "dept-id",
        jobTitle: "Engineer",
      })
    ).not.toThrow();
  });
});

// ── updateUserSchema ──────────────────────────────────────────────────────────

describe("updateUserSchema", () => {
  it("accepts a partial update (only isActive)", () => {
    expect(() =>
      updateUserSchema.parse({ isActive: false })
    ).not.toThrow();
  });

  it("rejects empty roles array on update", () => {
    const r = updateUserSchema.safeParse({ roles: [] });
    expect(r.success).toBe(false);
  });
});

// ── createRoleSchema ──────────────────────────────────────────────────────────

describe("createRoleSchema", () => {
  it("accepts valid role data", () => {
    expect(() =>
      createRoleSchema.parse({ name: "Reviewer", permissions: ["tasks:view"] })
    ).not.toThrow();
  });

  it("rejects empty permissions array", () => {
    const r = createRoleSchema.safeParse({ name: "Reviewer", permissions: [] });
    expect(r.success).toBe(false);
  });

  it("rejects name longer than 50 characters", () => {
    const r = createRoleSchema.safeParse({
      name: "A".repeat(51),
      permissions: ["tasks:view"],
    });
    expect(r.success).toBe(false);
  });
});

// ── updateRoleSchema ──────────────────────────────────────────────────────────

describe("updateRoleSchema", () => {
  it("accepts partial updates", () => {
    expect(() =>
      updateRoleSchema.parse({ isActive: true })
    ).not.toThrow();
  });

  it("rejects empty permissions array on update", () => {
    const r = updateRoleSchema.safeParse({ permissions: [] });
    expect(r.success).toBe(false);
  });
});

// ── createDepartmentSchema ────────────────────────────────────────────────────

describe("createDepartmentSchema", () => {
  it("accepts valid department data", () => {
    expect(() =>
      createDepartmentSchema.parse({ name: "Engineering", code: "ENG" })
    ).not.toThrow();
  });

  it("rejects empty name", () => {
    const r = createDepartmentSchema.safeParse({ name: "", code: "ENG" });
    expect(r.success).toBe(false);
  });

  it("rejects code longer than 20 characters", () => {
    const r = createDepartmentSchema.safeParse({
      name: "Dept",
      code: "A".repeat(21),
    });
    expect(r.success).toBe(false);
  });

  it("uppercases the code via .toUpperCase()", () => {
    const result = createDepartmentSchema.parse({ name: "Sales", code: "sls" });
    expect(result.code).toBe("SLS");
  });
});

// ── createVisitLogSchema ──────────────────────────────────────────────────────

describe("createVisitLogSchema", () => {
  const valid = {
    placesVisited: "Client HQ",
    peopleMet: "CEO",
    purpose: "Demo",
    outcome: "Positive",
    nextAction: "Follow up",
  };

  it("accepts a valid visit log", () => {
    expect(() => createVisitLogSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing required field", () => {
    const { outcome: _omitted, ...rest } = valid;
    const r = createVisitLogSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it("accepts optional photos array", () => {
    expect(() =>
      createVisitLogSchema.parse({ ...valid, photos: ["url1", "url2"] })
    ).not.toThrow();
  });
});

// ── createNotificationRuleSchema ──────────────────────────────────────────────

describe("createNotificationRuleSchema", () => {
  const valid = {
    event: "task.assigned",
    channels: ["in_app" as const],
    recipientStrategy: "assignees" as const,
  };

  it("accepts valid notification rule", () => {
    expect(() => createNotificationRuleSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty channels array", () => {
    const r = createNotificationRuleSchema.safeParse({ ...valid, channels: [] });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid channel value", () => {
    const r = createNotificationRuleSchema.safeParse({
      ...valid,
      channels: ["sms"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid recipientStrategy", () => {
    const r = createNotificationRuleSchema.safeParse({
      ...valid,
      recipientStrategy: "unknown",
    });
    expect(r.success).toBe(false);
  });
});

// ── createTaskSchema ──────────────────────────────────────────────────────────

describe("createTaskSchema", () => {
  const valid = {
    title: "Fix login bug",
    priority: "high" as const,
  };

  it("accepts minimal valid task data", () => {
    expect(() => createTaskSchema.parse(valid)).not.toThrow();
  });

  it("rejects an empty title", () => {
    const r = createTaskSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a title longer than 200 characters", () => {
    const r = createTaskSchema.safeParse({ ...valid, title: "A".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const r = createTaskSchema.safeParse({ ...valid, priority: "critical" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid priorities", () => {
    for (const priority of ["low", "medium", "high", "urgent"] as const) {
      expect(() => createTaskSchema.parse({ ...valid, priority })).not.toThrow();
    }
  });

  it("accepts optional fields", () => {
    expect(() =>
      createTaskSchema.parse({
        ...valid,
        description: "Detailed desc",
        estimatedHours: 4,
        tags: ["bug", "frontend"],
      })
    ).not.toThrow();
  });

  it("rejects negative estimatedHours", () => {
    const r = createTaskSchema.safeParse({ ...valid, estimatedHours: -1 });
    expect(r.success).toBe(false);
  });
});
