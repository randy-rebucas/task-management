import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("joins class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false && "hidden", undefined, null, "bar")).toBe("foo bar");
  });

  it("merges conflicting Tailwind classes — last one wins", () => {
    // tailwind-merge should keep only p-4 (the later padding class)
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("merges conflicting Tailwind text-color classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional class objects", () => {
    const isActive = true;
    expect(cn("base", { active: isActive, inactive: !isActive })).toBe(
      "base active"
    );
  });

  it("handles array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
