export function dashboardForRole(role: "admin" | "student"): "/admin/dashboard" | "/student/dashboard" {
  return role === "admin" ? "/admin/dashboard" : "/student/dashboard";
}

export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function validatePaymentProof(file: { type: string; size: number }): void {
  if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) throw new Error("Choose a PNG, JPEG, WebP image or PDF.");
  if (file.size > 10 * 1024 * 1024 || file.size === 0) throw new Error("Choose a non-empty file up to 10 MB.");
}