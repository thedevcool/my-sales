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
  it("validates SKU format", () => {
    const pattern = /^FDT\d{3}$/;
    expect(pattern.test("FDT001")).toBe(true);
    expect(pattern.test("FDT025")).toBe(true);
    expect(pattern.test("FDT")).toBe(false);
    expect(pattern.test("FDT1234")).toBe(false);
  });

  it("validates receipt ref format", () => {
    const pattern = /^POS-\d{6}-\d{4}$/;
    expect(pattern.test("POS-260613-1001")).toBe(true);
    expect(pattern.test("POS-260613-100")).toBe(false);
  });

  it("ensures starting price <= suggested price", () => {
    const data = [
      { sku: "FDT001", start: 1800, suggested: 2200 },
      { sku: "FDT007", start: 10000, suggested: 12500 },
    ];
    for (const d of data) {
      expect(d.start).toBeLessThanOrEqual(d.suggested);
    }
  });
});
