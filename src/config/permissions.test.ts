import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PERMISSIONS,
  ROLE_DEFINITIONS,
  DEFAULT_WORKFLOW_STATUSES,
} from "@/config/permissions";

// ── Mock heavy server-side imports so rbac.ts can be imported in Vitest ──────
vi.mock("mongoose", () => ({
  Types: { ObjectId: class ObjectId {} },
  default: {},
}));
vi.mock("@/models/Role", () => ({ default: {} }));
vi.mock("@/models/Permission", () => ({ default: {} }));

// Import after mocks are registered
const { checkPermission } = await import("@/features/auth/rbac");

// ── PERMISSIONS array ─────────────────────────────────────────────────────────

describe("PERMISSIONS array", () => {
  it("is non-empty", () => {
    expect(PERMISSIONS.length).toBeGreaterThan(0);
  });

  it("every entry has resource, action, description, and group", () => {
    for (const p of PERMISSIONS) {
      expect(p.resource).toBeTruthy();
      expect(p.action).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.group).toBeTruthy();
    }
  });

  it("produces unique resource:action strings", () => {
    const keys = PERMISSIONS.map((p) => `${p.resource}:${p.action}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("contains expected core permissions", () => {
    const keys = new Set(PERMISSIONS.map((p) => `${p.resource}:${p.action}`));
    expect(keys.has("tasks:create")).toBe(true);
    expect(keys.has("tasks:view")).toBe(true);
    expect(keys.has("users:view")).toBe(true);
    expect(keys.has("roles:view")).toBe(true);
  });
});

// ── ROLE_DEFINITIONS ──────────────────────────────────────────────────────────

describe("ROLE_DEFINITIONS", () => {
  const allPermKeys = new Set(
    PERMISSIONS.map((p) => `${p.resource}:${p.action}`)
  );

  it("defines a super-admin role", () => {
    expect(ROLE_DEFINITIONS["super-admin"]).toBeDefined();
  });

  it("super-admin has every permission", () => {
    const superAdminPerms = ROLE_DEFINITIONS["super-admin"].permissions;
    expect(superAdminPerms.length).toBe(PERMISSIONS.length);
  });

  it("every role has a non-empty name and permissions list", () => {
    for (const [key, def] of Object.entries(ROLE_DEFINITIONS)) {
      expect(def.name, `role ${key} missing name`).toBeTruthy();
      expect(def.permissions.length, `role ${key} has no permissions`).toBeGreaterThan(0);
    }
  });

  it("no role references a permission that does not exist in PERMISSIONS", () => {
    for (const [role, def] of Object.entries(ROLE_DEFINITIONS)) {
      if (role === "super-admin") continue; // super-admin is synthesized
      for (const perm of def.permissions) {
        expect(
          allPermKeys.has(perm),
          `${role} references unknown permission "${perm}"`
        ).toBe(true);
      }
    }
  });
});

// ── DEFAULT_WORKFLOW_STATUSES ─────────────────────────────────────────────────

describe("DEFAULT_WORKFLOW_STATUSES", () => {
  it("has at least one default status", () => {
    const defaults = DEFAULT_WORKFLOW_STATUSES.filter((s) => s.isDefault);
    expect(defaults.length).toBeGreaterThan(0);
  });

  it("has at least one final status", () => {
    const finals = DEFAULT_WORKFLOW_STATUSES.filter((s) => s.isFinal);
    expect(finals.length).toBeGreaterThan(0);
  });

  it("order values are unique and sequential", () => {
    const orders = DEFAULT_WORKFLOW_STATUSES.map((s) => s.order).sort(
      (a, b) => a - b
    );
    for (let i = 0; i < orders.length; i++) {
      expect(orders[i]).toBe(i + 1);
    }
  });

  it("each status has a valid hex color", () => {
    const hexRe = /^#[0-9a-f]{6}$/i;
    for (const s of DEFAULT_WORKFLOW_STATUSES) {
      expect(hexRe.test(s.color), `invalid color for status "${s.slug}"`).toBe(true);
    }
  });
});

// ── checkPermission ───────────────────────────────────────────────────────────

describe("checkPermission()", () => {
  it("returns true when the exact permission is present", () => {
    const perms = new Set(["tasks:view", "users:view"]);
    expect(checkPermission(perms, "tasks:view")).toBe(true);
  });

  it("returns false when permission is absent", () => {
    const perms = new Set(["tasks:view"]);
    expect(checkPermission(perms, "tasks:delete")).toBe(false);
  });

  it("returns true for any permission when *:* wildcard is present", () => {
    const perms = new Set(["*:*"]);
    expect(checkPermission(perms, "tasks:delete")).toBe(true);
    expect(checkPermission(perms, "roles:create")).toBe(true);
    expect(checkPermission(perms, "anything:else")).toBe(true);
  });

  it("returns false on an empty permission set", () => {
    const perms = new Set<string>();
    expect(checkPermission(perms, "tasks:view")).toBe(false);
  });
});
