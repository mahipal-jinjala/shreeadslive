export const PORTAL_UPI_ID = "mahipaljinjala@oksbi";

export function createUpiPaymentUri(courseTitle: string, amount: number, reference: string): string {
  const params = new URLSearchParams({
    pa: PORTAL_UPI_ID,
    pn: "SHREE ADS",
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Course: ${courseTitle}`,
    tr: reference,
  });
  return `upi://pay?${params.toString()}`;
}