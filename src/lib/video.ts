export function toYouTubeEmbed(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const id = host === "youtu.be" ? url.pathname.slice(1) : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host) ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]) : null;
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error("Enter a valid YouTube video URL.");
  return `https://www.youtube-nocookie.com/embed/${id}`;
}