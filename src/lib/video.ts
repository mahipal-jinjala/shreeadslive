export function toYouTubeEmbed(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const id = host === "youtu.be" ? url.pathname.slice(1) : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host) ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]) : null;
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error("Enter a valid YouTube video URL.");
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function toDirectVideoUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid direct MP4 video URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.pathname.toLowerCase().endsWith(".mp4")) {
    throw new Error("Direct video URLs must use HTTP(S) and end with .mp4.");
  }
  return url.toString();
}

export function detectVideoSource(value: string): "youtube" | "direct" {
  try {
    toYouTubeEmbed(value);
    return "youtube";
  } catch {
    toDirectVideoUrl(value);
    return "direct";
  }
}