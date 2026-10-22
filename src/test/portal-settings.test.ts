import { describe, expect, it } from "vitest";
import { normalizeWhatsAppNumber, validatePortalSettings } from "@/lib/portal-settings";

describe("portal settings", () => {
  it("normalizes formatted WhatsApp numbers", () => {
    expect(normalizeWhatsAppNumber("+91 92651-06657")).toBe("919265106657");
  });

  it("accepts valid payment and contact settings", () => {
    expect(() => validatePortalSettings({ upi_id: "merchant@oksbi", whatsapp_number: "+91 9265106657" })).not.toThrow();
  });

  it("rejects invalid payment and contact settings", () => {
    expect(() => validatePortalSettings({ upi_id: "not-an-upi", whatsapp_number: "12345" })).toThrow();
  });
});
