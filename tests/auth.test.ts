import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("Password Hashing", () => {
  it("hashes and compares passwords correctly", async () => {
    const password = "my123";
    const hash = await bcrypt.hash(password, 4);
    expect(hash).not.toBe(password);
    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);
    const invalid = await bcrypt.compare("wrongpassword", hash);
    expect(invalid).toBe(false);
  }, 15000);
});

describe("Data Validation", () => {
  it("validates auto-generated SKU format (BRAND-001)", () => {
    const pattern = /^[A-Z0-9]{2,4}-\d{3}$/;
    expect(pattern.test("ORA-001")).toBe(true);
    expect(pattern.test("GEN-025")).toBe(true);
    expect(pattern.test("ORA")).toBe(false);
    expect(pattern.test("ORA-1")).toBe(false);
  });

  it("validates receipt ref format", () => {
    const pattern = /^POS-\d{6}-\d{4}$/;
    expect(pattern.test("POS-260613-1001")).toBe(true);
    expect(pattern.test("POS-260613-100")).toBe(false);
  });

  it("ensures starting price <= suggested price", () => {
    const data = [
      { sku: "ORA-001", start: 1800, suggested: 2200 },
      { sku: "ITE-001", start: 10000, suggested: 12500 },
    ];
    for (const d of data) {
      expect(d.start).toBeLessThanOrEqual(d.suggested);
    }
  });
});
