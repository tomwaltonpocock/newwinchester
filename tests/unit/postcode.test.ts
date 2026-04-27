import { describe, it, expect } from "vitest";
import { parsePostcode } from "../../src/lib/postcode";

describe("parsePostcode", () => {
  it("recognises a Winchester full postcode", () => {
    const r = parsePostcode("SO23 9LJ", ["SO22", "SO23"]);
    expect(r.outward).toBe("SO23");
    expect(r.sector).toBe("SO23 9");
    expect(r.full).toBe("SO23 9LJ");
    expect(r.status).toBe("winchester_city");
  });

  it("recognises an outward-only Winchester postcode", () => {
    const r = parsePostcode("so22", ["SO22", "SO23"]);
    expect(r.outward).toBe("SO22");
    expect(r.status).toBe("winchester_city");
  });

  it("recognises outward + sector", () => {
    const r = parsePostcode("SO22 5", ["SO22", "SO23"]);
    expect(r.outward).toBe("SO22");
    expect(r.sector).toBe("SO22 5");
    expect(r.status).toBe("winchester_city");
  });

  it("tags district/nearby outwards", () => {
    const r = parsePostcode("SO21 1AA", ["SO22", "SO23"]);
    expect(r.status).toBe("winchester_district_or_nearby");
  });

  it("classes London postcodes as uk_other", () => {
    const r = parsePostcode("SW1A 1AA", ["SO22", "SO23"]);
    expect(r.status).toBe("uk_other");
  });

  it("rejects nonsense", () => {
    const r = parsePostcode("hello world", ["SO22", "SO23"]);
    expect(r.status).toBe("invalid_or_missing");
  });

  it("treats missing input as invalid_or_missing", () => {
    const r = parsePostcode(null, ["SO22", "SO23"]);
    expect(r.status).toBe("invalid_or_missing");
  });
});
