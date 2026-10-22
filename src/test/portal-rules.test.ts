import { describe, expect, it } from "vitest";
import { dashboardForRole, normalizeMobile, validatePaymentProof } from "@/lib/portal-rules";
import { detectVideoSource, toDirectVideoUrl, toYouTubeEmbed } from "@/lib/video";

function shouldStripPublishableAuthorization(authorization: string | null, publishableKey: string): boolean {
  return authorization === "Bearer " + publishableKey;
}

describe("Portal account and payment rules", () => {
  it("strips only publishable-key authorization, never a user session token", () => {
    expect(shouldStripPublishableAuthorization("Bearer sb_publishable_test", "sb_publishable_test")).toBe(true);
    expect(shouldStripPublishableAuthorization("Bearer user-access-token", "sb_publishable_test")).toBe(false);
  });
  it("redirects admins to their protected dashboard", () => { expect(dashboardForRole("admin")).toBe("/admin/dashboard"); });
  it("redirects students to their learning dashboard", () => { expect(dashboardForRole("student")).toBe("/student/dashboard"); });
  it("matches Indian mobile numbers regardless of formatting", () => { expect(normalizeMobile("+91 98765 43210")).toBe("9876543210"); });
  it("accepts proofs up to 10 MB but rejects larger files", () => {
    expect(() => validatePaymentProof({ type: "image/png", size: 10485760 })).not.toThrow();
    expect(() => validatePaymentProof({ type: "image/png", size: 10485761 })).toThrow();
  });
  it("rejects executable proof uploads", () => { expect(() => validatePaymentProof({ type: "text/html", size: 1024 })).toThrow(); });
  it("embeds valid YouTube videos and rejects unrelated hosts", () => {
    expect(toYouTubeEmbed("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(() => toYouTubeEmbed("https://evil.example/watch?v=dQw4w9WgXcQ")).toThrow();
  });
  it("detects and validates direct MP4 video URLs", () => {
    expect(detectVideoSource("https://cdn.example.com/lesson.mp4?token=abc")).toBe("direct");
    expect(toDirectVideoUrl("https://cdn.example.com/lesson.mp4?token=abc")).toBe("https://cdn.example.com/lesson.mp4?token=abc");
    expect(() => toDirectVideoUrl("https://cdn.example.com/lesson.webm")).toThrow();
  });
});