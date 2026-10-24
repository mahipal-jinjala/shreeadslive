import { afterEach, describe, expect, it, vi } from "vitest";
import { measureVideoUpload, uploadVideoWithProgress } from "@/lib/video-upload";

describe("Video upload progress", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calculates percentage and remaining time from transferred bytes", () => {
    expect(measureVideoUpload(25, 100, 5000)).toEqual({ percent: 25, remainingSeconds: 15 });
    expect(measureVideoUpload(100, 100, 10000)).toEqual({ percent: 100, remainingSeconds: 0 });
    expect(measureVideoUpload(0, 100, 0)).toEqual({ percent: 0, remainingSeconds: null });
  });

  it("reports real transfer progress and waits for successful confirmation", async () => {
    const xhr = {
      upload: {} as { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void; onload?: () => void },
      open: vi.fn(), setRequestHeader: vi.fn(), send: vi.fn(), status: 200,
      onload: () => {}, onerror: () => {}, onabort: () => {},
    };
    vi.stubGlobal("XMLHttpRequest", class { constructor() { return xhr; } });
    const progress = vi.fn();
    const done = vi.fn();
    const file = new File(["test"], "lesson.mp4", { type: "video/mp4" });
    const promise = uploadVideoWithProgress("https://upload.example/signed", file, progress).then(done);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
    expect(progress.mock.lastCall?.[0].percent).toBe(50);
    xhr.upload.onload?.();
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    xhr.onload();
    await promise;
    expect(done).toHaveBeenCalledOnce();
    expect(xhr.open).toHaveBeenCalledWith("PUT", "https://upload.example/signed");
    expect(xhr.send).toHaveBeenCalledWith(file);
  });

  it("rejects failed uploads instead of reporting success", async () => {
    const xhr = { upload: {}, open: vi.fn(), setRequestHeader: vi.fn(), send: vi.fn(), status: 403, onload: () => {} };
    vi.stubGlobal("XMLHttpRequest", class { constructor() { return xhr; } });
    const promise = uploadVideoWithProgress("https://upload.example/signed", new File(["test"], "lesson.mp4"), vi.fn());
    xhr.onload();
    await expect(promise).rejects.toThrow("Video upload failed");
  });
});