export type VideoUploadProgress = {
  percent: number;
  remainingSeconds: number | null;
};

export function measureVideoUpload(loaded: number, total: number, elapsedMs: number): VideoUploadProgress {
  if (total <= 0) return { percent: 0, remainingSeconds: null };
  const sent = Math.min(total, Math.max(0, loaded));
  return {
    percent: Math.floor(sent / total * 100),
    remainingSeconds: sent === total ? 0 : sent > 0 && elapsedMs >= 1000
      ? Math.ceil((total - sent) / (sent / (elapsedMs / 1000))) : null,
  };
}

export function formatUploadWait(seconds: number | null): string {
  if (seconds === null) return "Estimating remaining time…";
  if (seconds < 60) return `About ${Math.max(1, seconds)} seconds remaining`;
  return `About ${Math.ceil(seconds / 60)} minutes remaining`;
}

// The URL is issued by authenticated Storage, so existing INSERT policies still apply.
// Keep it in memory only; never log the temporary upload token.
export function uploadVideoWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (progress: VideoUploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const started = performance.now();
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(measureVideoUpload(event.loaded, event.total, performance.now() - started));
    };
    xhr.upload.onload = () => onProgress({ percent: 100, remainingSeconds: 0 });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress({ percent: 100, remainingSeconds: 0 });
        resolve();
      } else {
        reject(new Error("Video upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Video upload lost connection. Please check your internet and try again."));
    xhr.onabort = () => reject(new Error("Video upload was interrupted. Please try again."));
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Cache-Control", "max-age=3600");
    xhr.setRequestHeader("x-upsert", "false");
    onProgress({ percent: 0, remainingSeconds: null });
    xhr.send(file);
  });
}