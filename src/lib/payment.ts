export const PORTAL_UPI_ID = "mahipaljinjala@oksbi";
export const PORTAL_WHATSAPP_NUMBER = "919265106657";

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

export function createCourseWhatsAppUri(courseTitle: string, amount: number, studentName?: string): string {
  const details = [
    "Hello SHREE ADS, I have a question about a course.",
    studentName ? `Student: ${studentName}` : null,
    `Course: ${courseTitle}`,
    `Course price: ₹${amount.toFixed(2)}`,
  ].filter((line): line is string => line !== null);
  return `https://wa.me/${PORTAL_WHATSAPP_NUMBER}?${new URLSearchParams({ text: details.join("\n") })}`;
}

export function createPaymentWhatsAppUri(details: {
  studentName: string;
  courseTitle: string;
  amount: number;
  utrNumber: string;
  status: string;
}): string {
  const message = [
    "Hello SHREE ADS, I need help with my course payment.",
    `Student: ${details.studentName}`,
    `Course: ${details.courseTitle}`,
    `Amount: ₹${details.amount.toFixed(2)}`,
    `UTR: ${details.utrNumber}`,
    `Status: ${details.status}`,
  ].join("\n");
  return `https://wa.me/${PORTAL_WHATSAPP_NUMBER}?${new URLSearchParams({ text: message })}`;
}