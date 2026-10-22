import { describe, expect, it } from "vitest";

import {
  createCourseWhatsAppUri,
  createPaymentWhatsAppUri,
  createPortalWhatsAppUri,
  PORTAL_WHATSAPP_GREETING,
  createUpiPaymentUri,
  PORTAL_UPI_ID,
  PORTAL_WHATSAPP_NUMBER,
} from "@/lib/payment";

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

describe("SHREE ADS WhatsApp contact details", () => {
  it("creates the fixed portal contact link with the editable Gujarati greeting", () => {
    const uri = new URL(createPortalWhatsAppUri());
    expect(uri.pathname).toBe(`/${PORTAL_WHATSAPP_NUMBER}`);
    expect(uri.searchParams.get("text")).toBe(PORTAL_WHATSAPP_GREETING);
  });

  it("prefills course name, price, and optional student name", () => {
    const uri = new URL(createCourseWhatsAppUri("Creator Basics", 1499, "Asha Patel"));

    expect(uri.hostname).toBe("wa.me");
    expect(uri.pathname).toBe(`/${PORTAL_WHATSAPP_NUMBER}`);
    expect(uri.searchParams.get("text")).toContain("Course: Creator Basics");
    expect(uri.searchParams.get("text")).toContain("Course price: ₹1499.00");
    expect(uri.searchParams.get("text")).toContain("Student: Asha Patel");
  });

  it("prefills the relevant payment record without exposing screenshot links", () => {
    const uri = new URL(createPaymentWhatsAppUri({
      studentName: "Asha Patel",
      mobile: "9876543210",
      email: "asha@example.com",
      courseTitle: "Creator Basics",
      amount: 1499,
      utrNumber: "TXN123456",
      status: "pending",
    }));
    const message = uri.searchParams.get("text");

    expect(uri.pathname).toBe(`/${PORTAL_WHATSAPP_NUMBER}`);
    expect(message).toContain("Course: Creator Basics");
    expect(message).toContain("Mobile: 9876543210");
    expect(message).toContain("Email: asha@example.com");
    expect(message).toContain("Amount: ₹1499.00");
    expect(message).toContain("UTR: TXN123456");
    expect(message).toContain("Status: pending");
    expect(message).not.toContain("http");
  });
});