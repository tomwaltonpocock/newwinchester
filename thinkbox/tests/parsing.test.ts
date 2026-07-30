import { describe, expect, it } from "vitest";
import { parseAddress, parseAddressList } from "@/lib/gmail";
import { stripQuoted } from "@/lib/voice";

describe("address parsing", () => {
  it("handles name <email>", () => {
    expect(parseAddress('"Waters, Sam" <sam@acme.com>')).toEqual({ name: "Waters, Sam", email: "sam@acme.com" });
    expect(parseAddress("Tom <TOM@Geometry.xyz>")).toEqual({ name: "Tom", email: "tom@geometry.xyz" });
  });
  it("handles bare addresses and lists", () => {
    expect(parseAddress("a@b.com")).toEqual({ name: "", email: "a@b.com" });
    const list = parseAddressList('"Doe, Jane" <jane@x.com>, bob@y.com');
    expect(list).toHaveLength(2);
    expect(list[1].email).toBe("bob@y.com");
  });
});

describe("stripQuoted", () => {
  it("cuts quoted trails and reply headers", () => {
    const body = "Sounds good — Thursday works.\n\nOn Tue, 28 Jul 2026 at 10:12, Jane Doe wrote:\n> Are you free Thursday?";
    expect(stripQuoted(body)).toBe("Sounds good — Thursday works.");
  });
  it("keeps plain bodies intact", () => {
    expect(stripQuoted("Two lines\nof text")).toBe("Two lines\nof text");
  });
});
