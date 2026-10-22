export const DEFAULT_PORTAL_UPI_ID = "mahipaljinjala@oksbi";
export const DEFAULT_PORTAL_WHATSAPP_NUMBER = "919265106657";

export type PortalSettings = {
  upi_id: string;
  whatsapp_number: string;
};

export function normalizeWhatsAppNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function validatePortalSettings(settings: PortalSettings): void {
  if (!/^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9._-]{2,64}$/.test(settings.upi_id.trim())) {
    throw new Error("Enter a valid UPI ID, for example name@bank.");
  }
  const number = normalizeWhatsAppNumber(settings.whatsapp_number);
  if (!/^[1-9][0-9]{9,14}$/.test(number)) {
    throw new Error("Enter a valid WhatsApp number with country code.");
  }
}
