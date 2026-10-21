import { useEffect, useState, type FormEvent } from "react";
import { Plus, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toYouTubeEmbed } from "@/lib/video";
import type { Database } from "@/integrations/supabase/types";

type Video = Database["public"]["Tables"]["videos"]["Row"];
export function VideoManager({ courses }: { courses: Array<{ id: string; title: string }> }) {
  const [courseId, setCourseId] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", source_type: "youtube", video_url: "", is_active: true });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; youtube: boolean } | null>(null);
  async function refresh(id: string) {
    const result = await supabase.from("videos").select("*").eq("course_id", id).order("created_at");
    if (result.error) setError(result.error.message); else setVideos(result.data);
  }
  useEffect(() => { if (courseId) void refresh(courseId); else setVideos([]); setPreview(null); }, [courseId]);
  function reset() { setEditing(null); setFile(null); setForm({ title: "", description: "", source_type: "youtube", video_url: "", is_active: true }); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!courseId) return; setBusy(true); setError("");
    let uploaded: string | null = null;
    try {
      let url = form.video_url.trim();
      if (form.source_type === "youtube") toYouTubeEmbed(url);
      else if (file) {
        if (!file.type.startsWith("video/") || file.size > 2 * 1024 ** 3) throw new Error("Choose a video file up to 2 GB.");
        uploaded = `${courseId}/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "mp4"}`;
        const upload = await supabase.storage.from("course-videos").upload(uploaded, file, { contentType: file.type });
        if (upload.error) throw upload.error;
        url = uploaded;
      } else if (!editing || !url) throw new Error("Choose a video file first.");
      const input = { ...form, video_url: url, course_id: courseId, title: form.title.trim() };
      const result = editing ? await supabase.from("videos").update(input).eq("id", editing).select("id").single() : await supabase.from("videos").insert(input).select("id").single();
      if (result.error) throw result.error;
      toast.success(editing ? "Lesson updated." : "Lesson added."); reset(); await refresh(courseId);
    } catch (e) { if (uploaded) await supabase.storage.from("course-videos").remove([uploaded]); setError(e instanceof Error ? e.message : "Could not save the lesson."); }
    finally { setBusy(false); }
  }
  async function remove(video: Video) {
    if (!window.confirm(`Remove lesson “${video.title}”?`)) return;
    const result = await supabase.from("videos").delete().eq("id", video.id);
    if (result.error) { toast.error(result.error.message); return; }
    if (video.source_type === "storage") {
      const removal = await supabase.storage.from("course-videos").remove([video.video_url]);
      if (removal.error) toast.error("Lesson removed, but its stored file could not be removed.");
    }
    await refresh(courseId);
  }
  return <section>
    <h1 className="text-3xl font-bold">Manage videos</h1>
    <div className="my-6 max-w-xl"><Label htmlFor="video-course" className="portal-label">Course</Label><select id="video-course" className="portal-input" value={courseId} onChange={e => { setCourseId(e.target.value); reset(); }}><option value="">Select course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
    {courseId && <>
      <form onSubmit={save} className="grid gap-4 border-y border-border py-6 sm:grid-cols-2">
        <div><Label htmlFor="lesson-title" className="portal-label">Lesson title</Label><Input id="lesson-title" required value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} /></div>
        <div><Label htmlFor="lesson-source" className="portal-label">Video source</Label><select id="lesson-source" className="portal-input" value={form.source_type} onChange={e => setForm(v => ({ ...v, source_type: e.target.value, video_url: "" }))}><option value="youtube">YouTube</option><option value="storage">Private video upload</option></select></div>
        <div className="sm:col-span-2"><Label htmlFor="lesson-description" className="portal-label">Description</Label><Textarea id="lesson-description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} /></div>
        <div>{form.source_type === "youtube" ? <><Label htmlFor="lesson-url" className="portal-label">YouTube URL</Label><Input id="lesson-url" required type="url" value={form.video_url} onChange={e => setForm(v => ({ ...v, video_url: e.target.value }))} /></> : <><Label htmlFor="lesson-file" className="portal-label">Video file</Label><Input id="lesson-file" type="file" accept="video/*" required={!editing} onChange={e => setFile(e.target.files?.[0] ?? null)} />{editing && <p className="mt-2 text-xs text-muted-foreground">Leave empty to keep the current file.</p>}</>}</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm(v => ({ ...v, is_active: e.target.checked }))} />Publish lesson</label>
        {error && <p role="alert" className="text-destructive sm:col-span-2">{error}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={busy}><Plus />{busy ? "Saving…" : editing ? "Save lesson" : "Add lesson"}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
      </form>
      <div className="divide-y divide-border">{videos.map(video => <article key={video.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h2 className="font-semibold">{video.title}</h2><p className="text-xs text-muted-foreground">{video.source_type === "youtube" ? "YouTube" : "Private upload"} · {video.is_active ? "Published" : "Draft"}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={async () => {
        if (video.source_type === "youtube") { setPreview({ url: toYouTubeEmbed(video.video_url), youtube: true }); return; }
        const result = await supabase.storage.from("course-videos").createSignedUrl(video.video_url, 3600);
        if (result.error) toast.error(result.error.message); else setPreview({ url: result.data.signedUrl, youtube: false });
      }}><Play />Preview</Button><Button variant="outline" size="sm" onClick={() => { setEditing(video.id); setFile(null); setForm({ title: video.title, description: video.description, source_type: video.source_type, video_url: video.video_url, is_active: video.is_active }); }}>Edit</Button><Button variant="ghost" size="icon" aria-label={`Delete ${video.title}`} title="Delete lesson" onClick={() => void remove(video)}><Trash2 /></Button></div></article>)}</div>
      {preview && <div className="mt-6">{preview.youtube ? <iframe src={preview.url} title="Lesson preview" allowFullScreen className="aspect-video w-full" /> : <video src={preview.url} controls className="aspect-video w-full" />}<Button variant="ghost" onClick={() => setPreview(null)}>Close preview</Button></div>}
    </>}
  </section>;
}