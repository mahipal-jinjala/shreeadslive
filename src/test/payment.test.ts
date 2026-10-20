import { describe, expect, it } from "vitest";

import { createUpiPaymentUri, PORTAL_UPI_ID } from "@/lib/payment";

describe("SHREE ADS UPI payment details", () => {
  it("uses the specified UPI ID and exact course amount and reference", () => {
    const uri = new URL(createUpiPaymentUri("Creator Basics", 1499, "course-abc"));

    expect(uri.protocol).toBe("upi:");
    expect(uri.searchParams.get("pa")).toBe("mahipaljinjala@oksbi");
    expect(uri.searchParams.get("pa")).toBe(PORTAL_UPI_ID);
    expect(uri.searchParams.get("am")).toBe("1499.00");
    expect(uri.searchParams.get("tr")).toBe("course-abc");
  });
});