export const PORTAL_UPI_ID = "mahipaljinjala@oksbi";
export const PORTAL_WHATSAPP_NUMBER = "919265106657";
export const PORTAL_WHATSAPP_GREETING = "નમસ્તે, મેં તમારી જાહેરાત જોઈ છે. મારે Ads Setup કરવાનું શીખવું છે. કૃપા કરીને મને Ads Setup Training અને તેની ફી વિશે વધુ માહિતી આપશો.";

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

export function createPortalWhatsAppUri(): string {
  return `https://wa.me/${PORTAL_WHATSAPP_NUMBER}?${new URLSearchParams({ text: PORTAL_WHATSAPP_GREETING })}`;
}

export function createPaymentWhatsAppUri(details: {
  studentName: string;
  mobile?: string;
  email?: string;
  courseTitle: string;
  amount: number;
  utrNumber: string;
  status: string;
}): string {
  const message = [
    "Hello SHREE ADS, I need help with my course payment.",
    `Student: ${details.studentName}`,
    details.mobile ? `Mobile: ${details.mobile}` : null,
    details.email ? `Email: ${details.email}` : null,
    `Course: ${details.courseTitle}`,
    `Amount: ₹${details.amount.toFixed(2)}`,
    `UTR: ${details.utrNumber}`,
    `Status: ${details.status}`,
  ].filter((line): line is string => line !== null).join("\n");
  return `https://wa.me/${PORTAL_WHATSAPP_NUMBER}?${new URLSearchParams({ text: message })}`;
}