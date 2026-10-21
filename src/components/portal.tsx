import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  CirclePlay,
  Clock3,
  CreditCard,
  ExternalLink,
  FileVideo2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { signInWithMobile } from "@/lib/portal.functions";
import { createCourseSlug, formatRupees, readPortalSession, type PortalSession } from "@/lib/portal-session";
import { createUpiPaymentUri, PORTAL_UPI_ID } from "@/lib/payment";
import studioImage from "@/assets/shree-learning-studio.jpg";
import { toYouTubeEmbed } from "@/lib/video";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  is_active: boolean;
  is_featured: boolean;
  thumbnail_path: string | null;
  created_at: string;
};

type PaymentRequest = {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  utr_number: string;
  screenshot_path: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 ${light ? "text-panel-foreground" : "text-foreground"}`} aria-label="SHREE ADS home">
      <span className="grid size-9 place-items-center bg-brand text-brand-foreground">
        <Play className="size-4 fill-current" aria-hidden="true" />
      </span>
      <span className="font-extrabold leading-none tracking-normal">SHREE <span className="font-medium">ADS</span></span>
    </Link>
  );
}

export function PortalHeader({ session }: { session?: PortalSession | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const destination = session?.role === "admin" ? "/admin/dashboard" : "/student/dashboard";
  const label = session ? "My learning" : "Sign in";
  return (
    <header className="relative z-10 border-b border-border bg-background">
      <div className="portal-container flex h-[4.4rem] items-center justify-between gap-4">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Main navigation">
          <a className="portal-nav-link" href="/#courses">Courses</a>
          <a className="portal-nav-link" href="/#about">About</a>
          <a className="portal-nav-link" href="/#contact">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden min-h-10 rounded-none px-4 sm:inline-flex">
            <Link to={session ? destination : "/auth"}>{label}<ArrowRight aria-hidden="true" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {menuOpen && <nav className="absolute left-0 right-0 top-full border-b border-border bg-background p-5 md:hidden" aria-label="Mobile navigation">
        <div className="portal-container flex flex-col gap-4">
          <a href="/#courses" onClick={() => setMenuOpen(false)}>Courses</a>
          <a href="/#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <Button asChild className="rounded-none"><Link to={session ? destination : "/auth"}>{label}<ArrowRight /></Link></Button>
        </div>
      </nav>}
    </header>
  );
}

function SiteFooter() {
  return <footer className="bg-panel text-panel-foreground">
    <div className="portal-container grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end">
      <div><Wordmark light /><p className="mt-4 max-w-md text-sm leading-6 text-panel-foreground/70">Practical skills. Real momentum. Learn at your own pace with SHREE ADS.</p></div>
      <div className="flex flex-col gap-2 text-sm text-panel-foreground/70 md:items-end"><span>Questions about a course?</span><a href="https://wa.me/919265106657" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-panel-foreground"><MessageCircle className="size-4" />Chat with us on WhatsApp</a></div>
    </div>
    <div className="portal-container border-t border-line py-4 text-xs text-panel-foreground/60">© {new Date().getFullYear()} SHREE ADS <span className="mx-2">·</span> Made for the next step.</div>
  </footer>;
}

function useSessionState() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void readPortalSession().then((value) => { if (active) { setSession(value); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void readPortalSession().then((value) => { if (active) setSession(value); });
      }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return { session, setSession, loading };
}

async function courseThumbnail(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("course-thumbnails").createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}

function CourseCard({ course, image }: { course: Course; image?: string | null }) {
  return <article className="group min-w-0 border border-border bg-card">
    <Link to="/course/$slug" params={{ slug: course.slug }} className="block overflow-hidden">
      <div className="relative aspect-[1.65] overflow-hidden bg-secondary">
        {image ? <img src={image} alt="" className="portal-course-image h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" /> : <div className="grid h-full place-items-center portal-grid"><BookOpen className="size-10 text-brand" /></div>}
        {course.is_featured && <span className="absolute left-3 top-3 bg-background px-2.5 py-1 text-[10px] font-bold uppercase">Featured</span>}
      </div>
    </Link>
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>SHREE ADS · COURSE</span><span className="flex items-center gap-1"><CirclePlay className="size-3.5" />Self-paced</span></div>
      <Link to="/course/$slug" params={{ slug: course.slug }} className="block"><h3 className="text-lg font-bold leading-snug">{course.title}</h3></Link>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{course.description || "A practical learning experience, built to help you move forward."}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="font-bold">{formatRupees(course.price)}</span>
        <Button asChild variant="ghost" size="sm" className="rounded-none px-2"><Link to="/course/$slug" params={{ slug: course.slug }}>Explore <ArrowRight /></Link></Button>
      </div>
    </div>
  </article>;
}

export function HomePage() {
  const { session } = useSessionState();
  const [courses, setCourses] = useState<Course[]>([]);
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    void supabase.from("courses").select("id,title,slug,description,price,is_active,is_featured,thumbnail_path,created_at").eq("is_active", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).then(async ({ data }) => {
      if (!live) return;
      const list = (data ?? []) as Course[];
      setCourses(list);
      const signed = await Promise.all(list.map(async (course) => [course.id, await courseThumbnail(course.thumbnail_path)] as const));
      if (live) { setImages(Object.fromEntries(signed)); setLoading(false); }
    });
    return () => { live = false; };
  }, []);
  const filtered = useMemo(() => courses.filter((course) => `${course.title} ${course.description}`.toLowerCase().includes(search.toLowerCase())), [courses, search]);
  const featured = courses.find((item) => item.is_featured) ?? courses[0];
  return <div className="portal-shell">
    <PortalHeader session={session} />
    <main>
      <section className="relative overflow-hidden bg-panel text-panel-foreground">
        <div className="portal-container grid min-h-[610px] items-center gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
          <div className="relative z-[1] max-w-[590px]">
            <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-panel-foreground/65"><span className="h-px w-8 bg-brand" />Skills that move you forward</div>
            <h1 className="portal-display max-w-xl">Make your next move <span className="text-brand">count.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-panel-foreground/75">Learn practical, creator-ready skills with focused video courses from SHREE ADS.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-none bg-brand px-6 text-brand-foreground hover:bg-brand/90"><a href="#courses">Explore courses <ArrowRight /></a></Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-none border-panel-foreground/30 bg-transparent text-panel-foreground hover:bg-panel-foreground/10"><Link to={session ? session.role === "admin" ? "/admin/dashboard" : "/student/dashboard" : "/auth"}>{session ? "Continue learning" : "Student sign in"}</Link></Button>
            </div>
            <div className="mt-12 flex items-center gap-6 border-t border-line pt-5 text-sm text-panel-foreground/65"><div className="flex items-center gap-2"><Play className="size-4 text-brand" />Learn at your pace</div><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand" />Access after approval</div></div>
          </div>
          <div className="relative min-h-[360px] overflow-hidden bg-muted lg:min-h-[440px]">
            <img src={studioImage} alt="A course creator editing a lesson in their studio" width={1504} height={1008} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-r from-panel/20 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 flex items-center gap-3 bg-background/95 p-3 text-foreground"><span className="grid size-10 place-items-center bg-brand text-brand-foreground"><CirclePlay className="size-5" /></span><span><span className="block text-xs text-muted-foreground">Watch. Practice. Grow.</span><span className="text-sm font-bold">Your skills, in motion.</span></span></div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 top-0 hidden w-[47%] portal-grid opacity-25 lg:block" />
      </section>
      <section id="courses" className="portal-section scroll-mt-10">
        <div className="portal-container">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">The course library</p><h2 className="text-3xl font-bold md:text-4xl">Build a skill. Build momentum.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Browse focused video courses designed for learning by doing.</p></div>
            <label className="relative block w-full max-w-xs"><span className="sr-only">Search courses</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" className="h-11 rounded-none pl-9" /></label>
          </div>
          {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="aspect-[1.5] animate-pulse bg-secondary" /><div className="aspect-[1.5] animate-pulse bg-secondary" /><div className="aspect-[1.5] animate-pulse bg-secondary" /></div> : filtered.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((course) => <CourseCard key={course.id} course={course} image={images[course.id]} />)}</div> : <div className="portal-grid border border-border px-6 py-16 text-center"><div className="mx-auto grid size-12 place-items-center bg-brand-soft text-brand"><BookOpen className="size-5" /></div><h3 className="mt-4 text-lg font-bold">{search ? "No courses match that search." : "A new chapter starts here."}</h3><p className="mt-2 text-sm text-muted-foreground">{search ? "Try another title or keyword." : "New courses will appear here as they are published."}</p></div>}
          {featured && <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-5 text-sm"><span className="text-muted-foreground">New to SHREE ADS? Start with {featured.title}.</span><Link to="/course/$slug" params={{ slug: featured.slug }} className="inline-flex items-center gap-2 font-semibold">Explore featured <ArrowRight className="size-4" /></Link></div>}
        </div>
      </section>
      <section id="about" className="portal-section bg-secondary/70">
        <div className="portal-container grid gap-12 md:grid-cols-2 md:items-center">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">A clearer way to learn</p><h2 className="max-w-lg text-3xl font-bold leading-tight md:text-4xl">Less noise. More learning that sticks.</h2><p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">One course at a time. Learn through video, revisit lessons whenever you need, and build confidence through practice.</p><a href="#courses" className="mt-6 inline-flex items-center gap-2 text-sm font-bold">Find your course <ArrowRight className="size-4" /></a></div>
          <div className="grid grid-cols-2 gap-px border border-border bg-border">
            {[{ icon: CirclePlay, title: "Learn visually", body: "Clear lessons in a flexible video format." }, { icon: Clock3, title: "Your own pace", body: "Pause, replay, and practice on your schedule." }, { icon: BadgeCheck, title: "Course by course", body: "Access opens only for the course you purchase." }, { icon: Sparkles, title: "Practical focus", body: "Built around skills you can put to work." }].map((item) => <div key={item.title} className="min-h-36 bg-background p-5"><item.icon className="size-5 text-brand" /><h3 className="mt-4 text-sm font-bold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p></div>)}
          </div>
        </div>
      </section>
      <section className="portal-section" id="contact"><div className="portal-container grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Need a hand?</p><h2 className="mt-2 text-2xl font-bold">We’re one message away.</h2><p className="mt-2 text-sm text-muted-foreground">Ask about a course or get help with a payment request.</p></div><Button asChild variant="outline" className="h-11 w-fit rounded-none"><a href="https://wa.me/919265106657" target="_blank" rel="noreferrer">Message us on WhatsApp <ExternalLink /></a></Button></div></section>
    </main>
    <SiteFooter />
  </div>;
}

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [signInMethod, setSignInMethod] = useState<"email" | "mobile">("email");
  const [form, setForm] = useState({ fullName: "", email: "", mobile: "", password: "" });
  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm((value) => ({ ...value, [key]: event.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: form.fullName.trim(), mobile: form.mobile.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Your student account is ready.");
          await navigate({ to: "/student/dashboard" });
        } else {
          setNotice("Your account is almost ready. Check your email to confirm your address, then sign in.");
        }
      } else if (signInMethod === "mobile") {
        const result = await signInWithMobile({ data: { mobile: form.mobile.trim(), password: form.password } });
        const { error } = await supabase.auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken });
        if (error) throw error;
        const user = await readPortalSession();
        await navigate({ to: user?.role === "admin" ? "/admin/dashboard" : "/student/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        const user = data.user ? await readPortalSession() : null;
        toast.success("Welcome back.");
        await navigate({ to: user?.role === "admin" ? "/admin/dashboard" : "/student/dashboard" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not complete that request.";
      setNotice(message);
    } finally { setBusy(false); }
  }

  return <div className="portal-shell grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
    <section className="relative hidden overflow-hidden bg-panel text-panel-foreground lg:block">
      <img src={studioImage} alt="" width={1504} height={1008} className="absolute inset-0 h-full w-full object-cover opacity-65" />
      <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/35 to-panel/30" />
      <div className="relative flex min-h-screen flex-col justify-between p-10 xl:p-14"><Wordmark light /><div className="max-w-md pb-7"><span className="text-xs font-bold uppercase tracking-[0.15em] text-brand">SHREE ADS learning</span><h1 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">Pick up where your next idea begins.</h1><p className="mt-4 text-sm leading-6 text-panel-foreground/75">One sign-in for your courses, payments, and learning journey.</p></div><p className="text-xs text-panel-foreground/65">Practical skills, at your pace.</p></div>
    </section>
    <section className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-24">
      <div className="absolute left-5 top-5 lg:hidden"><Wordmark /></div>
      <div className="mx-auto w-full max-w-[430px] pt-14 lg:pt-0">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Back to courses</Link>
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Your learning, together</p><h2 className="mt-2 text-3xl font-bold">{mode === "signin" ? "Welcome back." : "Start learning."}</h2><p className="mt-2 text-sm text-muted-foreground">{mode === "signin" ? "Sign in to continue to your courses." : "Create your student account to browse courses."}</p></div>
        <div className="mb-6 grid grid-cols-2 border border-border p-1"><button type="button" className={`min-h-9 text-sm font-semibold ${mode === "signin" ? "bg-panel text-panel-foreground" : "text-muted-foreground"}`} onClick={() => { setMode("signin"); setNotice(""); }}>Sign in</button><button type="button" className={`min-h-9 text-sm font-semibold ${mode === "signup" ? "bg-panel text-panel-foreground" : "text-muted-foreground"}`} onClick={() => { setMode("signup"); setNotice(""); }}>Create account</button></div>
        {mode === "signin" && <div className="mb-5 flex items-center gap-2 text-sm"><span className="text-muted-foreground">Sign in with</span><button type="button" onClick={() => setSignInMethod("email")} className={`px-2 py-1 font-semibold ${signInMethod === "email" ? "bg-brand-soft text-brand" : "text-muted-foreground"}`}>Email</button><button type="button" onClick={() => setSignInMethod("mobile")} className={`px-2 py-1 font-semibold ${signInMethod === "mobile" ? "bg-brand-soft text-brand" : "text-muted-foreground"}`}>Mobile</button></div>}
        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" && <><div><Label htmlFor="fullName" className="portal-label">Full name</Label><Input id="fullName" value={form.fullName} onChange={update("fullName")} autoComplete="name" required placeholder="Your name" className="h-11 rounded-none" /></div><div><Label htmlFor="mobile" className="portal-label">Mobile number</Label><Input id="mobile" type="tel" value={form.mobile} onChange={update("mobile")} autoComplete="tel" required placeholder="+91 98765 43210" className="h-11 rounded-none" /></div></>}
          {(mode === "signup" || signInMethod === "email") && <div><Label htmlFor="email" className="portal-label">Email address</Label><Input id="email" type="email" value={form.email} onChange={update("email")} autoComplete="email" required placeholder="you@example.com" className="h-11 rounded-none" /></div>}
          {mode === "signin" && signInMethod === "mobile" && <div><Label htmlFor="mobile" className="portal-label">Mobile number</Label><Input id="mobile" type="tel" value={form.mobile} onChange={update("mobile")} autoComplete="tel" required placeholder="+91 98765 43210" className="h-11 rounded-none" /></div>}
          <div><Label htmlFor="password" className="portal-label">Password</Label><Input id="password" type="password" value={form.password} onChange={update("password")} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} maxLength={128} required placeholder="At least 8 characters" className="h-11 rounded-none" /></div>
          {notice && <div role="status" className="border border-border bg-secondary p-3 text-sm leading-5">{notice}</div>}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-none bg-brand text-brand-foreground hover:bg-brand/90">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create student account"}<ArrowRight /></Button>
        </form>
        {mode === "signin" && <div className="mt-5 text-xs text-muted-foreground"><p>Need help with your password? <a className="font-semibold text-foreground underline underline-offset-4" href="https://wa.me/919265106657" target="_blank" rel="noreferrer">Contact SHREE ADS</a></p></div>}
        <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Signing in means you agree to use your account for your own learning. Course access is granted only after payment review.</p>
      </div>
    </section>
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }

function StatusBadge({ status }: { status: string }) {
  const label = status === "approved" ? "Approved" : status === "rejected" ? "Needs attention" : "Under review";
  const style = status === "approved" ? "bg-emerald-100 text-emerald-800" : status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-900";
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${style}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>;
}

function DashboardFrame({ session, active, onSelect, children, admin = false }: { session: PortalSession; active: string; onSelect: (tab: string) => void; children: ReactNode; admin?: boolean }) {
  const navigate = useNavigate();
  const items = admin
    ? [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "courses", label: "Courses", icon: BookOpen }, { id: "videos", label: "Manage videos", icon: FileVideo2 }, { id: "payments", label: "Payment requests", icon: WalletCards }, { id: "students", label: "Students", icon: Users }, { id: "settings", label: "Settings", icon: ShieldCheck }]
    : [{ id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "my-courses", label: "My courses", icon: BookOpen }, { id: "payments", label: "Payment history", icon: CreditCard }, { id: "profile", label: "My profile", icon: Users }];
  async function signOut() { await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  return <div className="portal-shell flex min-h-screen bg-background">
    <aside className="hidden w-[250px] shrink-0 flex-col bg-panel text-panel-foreground md:flex">
      <div className="p-6"><Wordmark light /></div>
      <div className="mx-5 mb-5 border-y border-line py-4"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-panel-foreground/55">{admin ? "Administrator" : "Student workspace"}</span><span className="mt-1 block truncate text-sm font-semibold">{session.fullName || session.email}</span></div>
      <nav className="flex-1 px-3" aria-label="Workspace navigation">{items.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => onSelect(id)} className={`mb-1 flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm transition-colors ${active === id ? "bg-panel-foreground/10 text-panel-foreground" : "text-panel-foreground/65 hover:bg-panel-foreground/5 hover:text-panel-foreground"}`}><Icon className="size-4" />{label}</button>)}</nav>
      <div className="p-4"><button type="button" onClick={() => void signOut()} className="flex min-h-10 w-full items-center gap-3 px-3 text-sm text-panel-foreground/65 hover:text-panel-foreground"><LogOut className="size-4" />Sign out</button></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-10 flex min-h-[4.1rem] items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3 md:hidden"><Wordmark /><span className="text-xs text-muted-foreground">/</span><span className="text-xs font-semibold">{admin ? "Admin" : "Student"}</span></div>
        <div className="hidden text-sm text-muted-foreground md:block">{admin ? "SHREE ADS / ADMIN" : "SHREE ADS / MY LEARNING"}</div>
        <div className="flex items-center gap-3"><span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline">{session.fullName || session.email}</span><div className="grid size-8 place-items-center bg-brand-soft text-xs font-bold text-brand">{(session.fullName || session.email).slice(0, 1).toUpperCase()}</div></div>
      </header>
      <div className="border-b border-border bg-background px-3 py-2 md:hidden"><div className="flex gap-1 overflow-x-auto">{items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onSelect(id)} className={`flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold ${active === id ? "bg-panel text-panel-foreground" : "text-muted-foreground"}`}><Icon className="size-3.5" />{label}</button>)}<button type="button" onClick={() => void signOut()} className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground"><LogOut className="size-3.5" />Sign out</button></div></div>
      <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-7 lg:p-10">{children}</div>
    </main>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof BookOpen }) {
  return <div className="border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="size-4 text-brand" /></div><span className="mt-4 block text-3xl font-bold">{value}</span></div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="border border-dashed border-border px-5 py-14 text-center"><div className="mx-auto grid size-11 place-items-center bg-brand-soft text-brand"><BookOpen className="size-5" /></div><h3 className="mt-4 font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">{body}</p>{action && <div className="mt-5 flex justify-center">{action}</div>}</div>;
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSessionState();
  const [tab, setTab] = useState("overview");
  const [courses, setCourses] = useState<Course[]>([]);
  const [accessIds, setAccessIds] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [profile, setProfile] = useState({ full_name: "", email: "", mobile: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) { void navigate({ to: "/auth", replace: true }); return; }
    if (session.role === "admin") { void navigate({ to: "/admin/dashboard", replace: true }); return; }
    let live = true;
    void Promise.all([
      supabase.from("courses").select("id,title,slug,description,price,is_active,is_featured,thumbnail_path,created_at").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("course_access").select("course_id").eq("user_id", session.id),
      supabase.from("payment_requests").select("id,user_id,course_id,amount,utr_number,screenshot_path,status,admin_note,created_at").eq("user_id", session.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name,email,mobile").eq("id", session.id).maybeSingle(),
    ]).then(([courseResult, accessResult, paymentResult, profileResult]) => {
      if (!live) return;
      setCourses((courseResult.data ?? []) as Course[]); setAccessIds((accessResult.data ?? []).map((item) => item.course_id)); setPayments((paymentResult.data ?? []) as PaymentRequest[]);
      if (profileResult.data) setProfile({ full_name: profileResult.data.full_name, email: profileResult.data.email, mobile: profileResult.data.mobile ?? "" });
    });
    return () => { live = false; };
  }, [session?.id, session?.role, sessionLoading, navigate]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session) return; setBusy(true); setError("");
    const { error: updateError } = await supabase.from("profiles").update({ full_name: profile.full_name.trim(), mobile: profile.mobile.trim() || null }).eq("id", session.id);
    setBusy(false);
    if (updateError) setError(updateError.message); else toast.success("Profile saved.");
  }
  if (sessionLoading || !session || session.role === "admin") return <div className="min-h-screen bg-background" />;

  return <DashboardFrame session={session} active={tab} onSelect={setTab}>
    {tab === "overview" && <><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Student workspace</p><h1 className="mt-2 text-3xl font-bold">Good to see you, {session.fullName.split(" ")[0] || "there"}.</h1><p className="mt-2 text-sm text-muted-foreground">Your next lesson is a few clicks away.</p></div>
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="My courses" value={accessIds.length} icon={BookOpen} /><Metric label="Payments to review" value={payments.filter((item) => item.status === "pending").length} icon={Clock3} /><Metric label="Completed purchases" value={payments.filter((item) => item.status === "approved").length} icon={BadgeCheck} /></div>
      <div className="mb-5 mt-10 flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Pick up your learning</h2><p className="mt-1 text-sm text-muted-foreground">Courses available in your account</p></div><button type="button" onClick={() => setTab("my-courses")} className="inline-flex items-center gap-2 text-sm font-semibold">View all <ArrowRight className="size-4" /></button></div>
      {accessIds.length ? <div className="grid gap-4 sm:grid-cols-2">{courses.filter((course) => accessIds.includes(course.id)).map((course) => <Link key={course.id} to="/course/$slug" params={{ slug: course.slug }} className="flex items-center gap-4 border border-border bg-card p-4"><div className="grid size-12 shrink-0 place-items-center bg-brand-soft text-brand"><Play className="size-4 fill-current" /></div><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{course.title}</h3><span className="text-xs text-muted-foreground">Course access approved</span></div><ArrowRight className="size-4" /></Link>)}</div> : <EmptyState title="Your course shelf is ready" body="Once your payment is approved, your course will appear here." action={<Button asChild variant="outline" className="rounded-none"><Link to="/">Explore courses <ArrowRight /></Link></Button>} />}
    </>}
    {tab === "my-courses" && <><div className="mb-7"><h1 className="text-3xl font-bold">My courses</h1><p className="mt-2 text-sm text-muted-foreground">Your approved learning, all in one place.</p></div>{accessIds.length ? <div className="grid gap-4 sm:grid-cols-2">{courses.filter((course) => accessIds.includes(course.id)).map((course) => <CourseCard key={course.id} course={course} />)}</div> : <EmptyState title="Nothing here just yet" body="Browse the course library and submit payment proof to get started." action={<Button asChild className="rounded-none"><Link to="/">Browse courses <ArrowRight /></Link></Button>} />}</>}
    {tab === "payments" && <><div className="mb-7"><h1 className="text-3xl font-bold">Payment history</h1><p className="mt-2 text-sm text-muted-foreground">Track your requests and see when access is granted.</p></div>{payments.length ? <div className="overflow-x-auto border border-border"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-secondary text-xs uppercase text-muted-foreground"><tr><th className="p-4">Course</th><th className="p-4">Amount</th><th className="p-4">Submitted</th><th className="p-4">Status</th></tr></thead><tbody>{payments.map((payment) => <tr className="border-t border-border" key={payment.id}><td className="p-4 font-semibold">{courses.find((course) => course.id === payment.course_id)?.title ?? "Course"}<span className="block text-xs font-normal text-muted-foreground">UTR {payment.utr_number}</span>{payment.admin_note && <span className="mt-1 block max-w-xs text-xs text-destructive">{payment.admin_note}</span>}</td><td className="p-4">{formatRupees(payment.amount)}</td><td className="p-4 text-muted-foreground">{formatDate(payment.created_at)}</td><td className="p-4"><StatusBadge status={payment.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="No payments yet" body="When you submit payment details for a course, they will appear here." />}</>}
    {tab === "profile" && <><div className="mb-7"><h1 className="text-3xl font-bold">My profile</h1><p className="mt-2 text-sm text-muted-foreground">Keep your student details up to date.</p></div><form onSubmit={saveProfile} className="max-w-xl space-y-5 border border-border bg-card p-5 sm:p-7"><div><Label className="portal-label" htmlFor="profile-name">Full name</Label><Input id="profile-name" value={profile.full_name} onChange={(event) => setProfile((value) => ({ ...value, full_name: event.target.value }))} required className="h-11 rounded-none" /></div><div><Label className="portal-label" htmlFor="profile-email">Email</Label><Input id="profile-email" value={profile.email} readOnly className="h-11 rounded-none bg-secondary" /></div><div><Label className="portal-label" htmlFor="profile-mobile">Mobile number</Label><Input id="profile-mobile" type="tel" value={profile.mobile} onChange={(event) => setProfile((value) => ({ ...value, mobile: event.target.value }))} className="h-11 rounded-none" /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} type="submit" className="rounded-none">{busy ? "Saving…" : "Save changes"}</Button></form></>}
  </DashboardFrame>;
}

export function CoursePage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSessionState();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Array<{ id: string; title: string; description: string; video_url: string; source_type: string }>>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void supabase.from("courses").select("id,title,slug,description,price,is_active,is_featured,thumbnail_path,created_at").eq("slug", slug).eq("is_active", true).maybeSingle().then(async ({ data, error }) => {
      if (!live) return;
      if (error || !data) { setCourse(null); setLoading(false); return; }
      const item = data as Course; setCourse(item);
      const thumb = await courseThumbnail(item.thumbnail_path); if (live) setImage(thumb);
      if (session?.id) {
        const [{ data: access }, { data: lessonRows }] = await Promise.all([
          supabase.from("course_access").select("id").eq("course_id", item.id).eq("user_id", session.id).maybeSingle(),
          supabase.from("videos").select("id,title,description,video_url,source_type").eq("course_id", item.id).eq("is_active", true).order("created_at"),
        ]);
        if (live) { setHasAccess(Boolean(access)); setVideos((lessonRows ?? []) as typeof videos); }
      }
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [slug, session?.id]);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!course) return;
    if (!session) { await navigate({ to: "/auth" }); return; }
    if (!proof) { toast.error("Choose a payment screenshot first."); return; }
    setPaying(true);
    const ext = proof.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${session.id}/${course.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(filePath, proof, { contentType: proof.type, upsert: false });
    if (uploadError) { setPaying(false); toast.error(uploadError.message); return; }
    const { error } = await supabase.from("payment_requests").insert({ user_id: session.id, course_id: course.id, amount: course.price, utr_number: utr.trim(), screenshot_path: filePath });
    setPaying(false);
    if (error) { await supabase.storage.from("payment-proofs").remove([filePath]); toast.error(error.message.includes("one_pending") ? "A request for this course is already under review." : error.message); return; }
    setSubmitted(true); toast.success("Payment request submitted for review.");
  }

  if (loading || sessionLoading) return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading course…</div>;
  if (!course) return <div className="grid min-h-screen place-items-center px-5 text-center"><div><h1 className="text-3xl font-bold">Course not found</h1><Link className="mt-4 inline-block underline" to="/">Return to the course library</Link></div></div>;
  const paymentUri = createUpiPaymentUri(course.title, course.price, course.id);
  return <div className="portal-shell"><PortalHeader session={session} /><main>
    <div className="portal-container py-5"><Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Course library</Link></div>
    <section className="bg-panel text-panel-foreground"><div className="portal-container grid items-center gap-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-14">
      <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand">SHREE ADS course</p><h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-5xl">{course.title}</h1><p className="mt-5 max-w-xl leading-7 text-panel-foreground/75">{course.description || "A practical video course, ready to learn at your own pace."}</p><div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-panel-foreground/70"><span className="flex items-center gap-2"><CirclePlay className="size-4 text-brand" />On-demand lessons</span><span className="flex items-center gap-2"><BadgeCheck className="size-4 text-brand" />Individual course access</span></div><div className="mt-8 flex flex-wrap items-center gap-5"><strong className="text-3xl">{formatRupees(course.price)}</strong>{!hasAccess && <a href="#enroll" className="inline-flex h-11 items-center gap-2 bg-brand px-5 text-sm font-semibold text-brand-foreground">Get course <ArrowRight className="size-4" /></a>}{hasAccess && <span className="inline-flex items-center gap-2 bg-panel-foreground/10 px-3 py-2 text-sm"><Check className="size-4 text-brand" />You have access</span>}</div></div>
      <div className="relative aspect-[1.55] overflow-hidden bg-secondary">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <img src={studioImage} alt="" className="h-full w-full object-cover" />}<div className="absolute bottom-4 left-4 bg-background px-3 py-2 text-xs font-semibold text-foreground">A SHREE ADS learning experience</div></div>
    </div></section>
    <section className="portal-container grid gap-12 py-12 lg:grid-cols-[1fr_360px] lg:py-16">
      <div>{hasAccess ? <><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Your lessons</p><h2 className="mt-2 text-2xl font-bold">Start watching</h2></div>{videos.length ? <div className="space-y-3">{videos.map((video, index) => <div key={video.id} className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center bg-brand-soft text-brand">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h3 className="truncate font-semibold">{video.title}</h3><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{video.description}</p></div></div><Button size="sm" variant="outline" className="rounded-none" onClick={async () => {
          if (video.source_type === "youtube") { setActiveVideo(video.video_url); return; }
          const { data } = await supabase.storage.from("course-videos").createSignedUrl(video.video_url, 60 * 60);
          if (!data?.signedUrl) toast.error("This video is temporarily unavailable."); else setActiveVideo(data.signedUrl);
        }}>Play lesson <Play /></Button></div>
      </div>)}</div> : <EmptyState title="Lessons are on the way" body="Your course access is active. Lesson videos will appear here when they are available." />}
        {activeVideo && <div className="mt-5">{videos.find((item) => item.video_url === activeVideo)?.source_type === "youtube" ? <iframe key={activeVideo} src={toYouTubeEmbed(activeVideo)} title="Course video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full bg-panel" /> : <video key={activeVideo} controls autoPlay className="aspect-video w-full bg-panel" src={activeVideo} onLoadedMetadata={(event) => { event.currentTarget.currentTime = 0; }} />}<Button type="button" variant="ghost" className="mt-2 rounded-none" onClick={() => setActiveVideo(null)}>Close player</Button></div>}
      </> : <><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Inside the course</p><h2 className="mt-2 text-2xl font-bold">Learn one lesson at a time.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Lessons are streamed to students with approved access. Submit your payment details to start learning.</p></div><div className="grid gap-px border border-border bg-border sm:grid-cols-2">{[{ icon: CirclePlay, title: "Focused video lessons", body: "Watch a lesson, pause, and return when you need." }, { icon: BadgeCheck, title: "Private course access", body: "Only this approved course unlocks in your account." }, { icon: Clock3, title: "Learn on your schedule", body: "Access lessons when it suits you." }, { icon: ShieldCheck, title: "Review before access", body: "Your payment request is reviewed by SHREE ADS." }].map((item) => <div key={item.title} className="bg-background p-5"><item.icon className="size-5 text-brand" /><h3 className="mt-3 text-sm font-bold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p></div>)}</div></>}</div>
      {!hasAccess && <aside id="enroll" className="h-fit scroll-mt-6 border border-border bg-card p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Course enrollment</p><h2 className="mt-2 text-xl font-bold">Get started</h2>{submitted ? <div className="mt-5 space-y-4"><div className="flex gap-3 border border-border bg-secondary p-4"><Clock3 className="mt-0.5 size-5 shrink-0 text-brand" /><div><p className="font-semibold">Your payment request has been submitted.</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Course access will be granted after Admin Approval.</p></div></div><div className="border border-border p-4 text-sm"><p className="font-semibold">Send your screenshot in WhatsApp</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Attach your payment screenshot manually in WhatsApp so the team can review it.</p><Button asChild className="mt-4 w-full rounded-none bg-[#25D366] text-white hover:bg-[#1fb85a]"><a target="_blank" rel="noreferrer" href={`https://wa.me/919265106657?text=${encodeURIComponent(`Hi SHREE ADS, I submitted payment proof. Name: ${session?.fullName ?? ""}; Course: ${course.title}; Amount: ${formatRupees(course.price)}; UTR: ${utr.trim()}. I will attach my payment screenshot here.`)}`}>Continue to WhatsApp <MessageCircle /></a></Button></div><Link to="/student/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Check payment status <ArrowRight className="size-4" /></Link></div> : <><div className="mt-4 flex items-end justify-between border-y border-border py-4"><div><span className="block text-xs text-muted-foreground">Course price</span><strong className="mt-1 block text-2xl">{formatRupees(course.price)}</strong></div><span className="text-xs text-muted-foreground">One-time</span></div><div className="my-5 flex items-center gap-4"><div className="border border-border bg-background p-2"><QRCodeSVG value={paymentUri} size={100} /></div><div className="min-w-0"><p className="text-sm font-bold">Pay by UPI</p><p className="mt-1 text-xs text-muted-foreground">Scan the QR or use a UPI app.</p><a href={paymentUri} className="mt-2 inline-flex text-xs font-bold text-brand">Open UPI app <ArrowRight className="ml-1 size-3.5" /></a><p className="mt-1 break-all text-[11px] text-muted-foreground">{PORTAL_UPI_ID}</p></div></div><form onSubmit={submitPayment} className="space-y-4 border-t border-border pt-4"><p className="text-sm font-bold">Submit payment proof</p>{!session && <div className="border border-border bg-secondary p-3 text-xs leading-5 text-muted-foreground">Sign in or create a student account before submitting payment proof.</div>}<div><Label className="portal-label" htmlFor="utr">UTR / transaction ID</Label><Input id="utr" required minLength={6} maxLength={80} value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Enter your transaction ID" className="h-10 rounded-none" /></div><div><Label className="portal-label" htmlFor="proof">Payment screenshot</Label><Input id="proof" required type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setProof(event.target.files?.[0] ?? null)} className="h-auto min-h-10 rounded-none px-2 py-2 text-xs" /><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Private upload · image or PDF, up to 10 MB.</p></div><Button type="submit" disabled={paying} className="h-11 w-full rounded-none bg-brand text-brand-foreground hover:bg-brand/90">{paying ? "Submitting…" : session ? "Submit for review" : "Sign in to continue"}<ArrowRight /></Button><p className="text-[11px] leading-4 text-muted-foreground">Opening a UPI app or uploading a screenshot does not confirm payment. Access starts after review.</p></form></>}</aside>}
    </section>
  </main><SiteFooter /></div>;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSessionState();
  const [tab, setTab] = useState("overview");
  const [courses, setCourses] = useState<Course[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; email: string; mobile: string | null }>>([]);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({ title: "", slug: "", description: "", price: "", is_active: false, is_featured: false });
  const [thumb, setThumb] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    const [courseResult, paymentResult, profileResult] = await Promise.all([
      supabase.from("courses").select("id,title,slug,description,price,is_active,is_featured,thumbnail_path,created_at").order("created_at", { ascending: false }),
      supabase.from("payment_requests").select("id,user_id,course_id,amount,utr_number,screenshot_path,status,admin_note,created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email,mobile").order("created_at", { ascending: false }),
    ]);
    setCourses((courseResult.data ?? []) as Course[]); setPayments((paymentResult.data ?? []) as PaymentRequest[]); setProfiles(profileResult.data ?? []);
    const privateUrls = await Promise.all((paymentResult.data ?? []).map(async (item) => {
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(item.screenshot_path, 60 * 60);
      return [item.id, data?.signedUrl ?? ""] as const;
    }));
    setProofUrls(Object.fromEntries(privateUrls));
    if (courseResult.error || paymentResult.error || profileResult.error) setError("Some information could not be loaded. Check admin permissions and retry.");
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) { void navigate({ to: "/auth", replace: true }); return; }
    if (session.role !== "admin") { void navigate({ to: "/student/dashboard", replace: true }); return; }
    void refresh();
  }, [session?.id, session?.role, sessionLoading, navigate]);

  function resetCourseForm() { setCourseForm({ title: "", slug: "", description: "", price: "", is_active: false, is_featured: false }); setThumb(null); setEditing(null); }
  function editCourse(course: Course) { setEditing(course.id); setCourseForm({ title: course.title, slug: course.slug, description: course.description, price: String(course.price), is_active: course.is_active, is_featured: course.is_featured }); setTab("courses"); }
  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    let thumbnail_path = courses.find((item) => item.id === editing)?.thumbnail_path ?? null;
    const slug = createCourseSlug(courseForm.slug || courseForm.title);
    if (!slug) { setBusy(false); setError("Add a title or custom URL."); return; }
    if (thumb) {
      const fileExt = thumb.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${slug}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("course-thumbnails").upload(path, thumb, { contentType: thumb.type, upsert: true });
      if (uploadError) { setBusy(false); setError(uploadError.message); return; }
      thumbnail_path = path;
    }
    const input = { title: courseForm.title.trim(), slug, description: courseForm.description.trim(), price: Number(courseForm.price), is_active: courseForm.is_active, is_featured: courseForm.is_featured, thumbnail_path };
    const result = editing ? await supabase.from("courses").update(input).eq("id", editing) : await supabase.from("courses").insert(input);
    setBusy(false);
    if (result.error) { setError(result.error.message.includes("courses_slug_key") ? "That course URL is already in use." : result.error.message); return; }
    toast.success(editing ? "Course updated." : "Course created."); resetCourseForm(); await refresh();
  }
  async function toggleCourse(course: Course) {
    const { error: updateError } = await supabase.from("courses").update({ is_active: !course.is_active }).eq("id", course.id);
    if (updateError) toast.error(updateError.message); else { toast.success(course.is_active ? "Course unpublished." : "Course published."); await refresh(); }
  }
  async function reviewPayment(payment: PaymentRequest, status: "approved" | "rejected") {
    if (status === "rejected" && !noteById[payment.id]?.trim()) { toast.error("Add a note so the student knows what to correct."); return; }
    setBusy(true);
    const { error: reviewError } = await supabase.from("payment_requests").update({ status, admin_note: status === "rejected" ? noteById[payment.id]?.trim() ?? null : null, reviewed_at: new Date().toISOString() }).eq("id", payment.id);
    setBusy(false);
    if (reviewError) toast.error(reviewError.message); else { toast.success(status === "approved" ? "Payment approved; course access granted." : "Payment rejected with a student note."); await refresh(); }
  }
  async function deleteCourse(course: Course) {
    if (!window.confirm(`Delete “${course.title}”? Associated lessons and payment records are also removed.`)) return;
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", course.id);
    if (deleteError) toast.error(deleteError.message); else { toast.success("Course deleted."); await refresh(); }
  }

  if (sessionLoading || !session || session.role !== "admin") return <div className="min-h-screen bg-background" />;
  const pending = payments.filter((item) => item.status === "pending");
  const shownPayments = filter === "all" ? payments : payments.filter((item) => item.status === filter);

  return <DashboardFrame session={session} active={tab} onSelect={setTab} admin>
    {error && <div role="alert" className="mb-5 border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {tab === "overview" && <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Admin workspace</p><h1 className="mt-2 text-3xl font-bold">Overview</h1><p className="mt-2 text-sm text-muted-foreground">Manage your course library and student access.</p></div><Button onClick={() => { resetCourseForm(); setTab("courses"); }} className="rounded-none bg-brand text-brand-foreground"><Plus />Add course</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Published courses" value={courses.filter((item) => item.is_active).length} icon={BookOpen} /><Metric label="Payment requests" value={payments.length} icon={WalletCards} /><Metric label="Awaiting review" value={pending.length} icon={Clock3} /><Metric label="Students" value={profiles.length} icon={Users} /></div><div className="mt-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]"><div><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Recent payment requests</h2><button onClick={() => setTab("payments")} className="text-sm font-semibold">View all <ArrowRight className="ml-1 inline size-4" /></button></div>{pending.length ? <div className="divide-y divide-border border-y border-border">{pending.slice(0, 4).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{profiles.find((person) => person.id === item.user_id)?.full_name || "Student"}</p><p className="mt-1 text-xs text-muted-foreground">{courses.find((course) => course.id === item.course_id)?.title} · {formatRupees(item.amount)}</p></div><StatusBadge status={item.status} /></div>)}</div> : <p className="border-y border-border py-7 text-sm text-muted-foreground">No payments are waiting for review.</p>}</div><div><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Course library</h2><button onClick={() => setTab("courses")} className="text-sm font-semibold">Manage <ArrowRight className="ml-1 inline size-4" /></button></div>{courses.slice(0, 4).map((course) => <div key={course.id} className="flex items-center justify-between gap-3 border-b border-border py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{course.title}</p><p className="text-xs text-muted-foreground">{formatRupees(course.price)}</p></div><span className={`shrink-0 text-xs ${course.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>{course.is_active ? "Published" : "Draft"}</span></div>)}</div></div></>}

    {tab === "courses" && <><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Course library</p><h1 className="mt-2 text-3xl font-bold">{editing ? "Edit course" : "Add a course"}</h1><p className="mt-2 text-sm text-muted-foreground">Set a course-specific page, price, image, and publishing status.</p></div><form onSubmit={saveCourse} className="mb-8 grid gap-4 border border-border bg-card p-5 sm:grid-cols-2 sm:p-6"><div><Label htmlFor="course-title" className="portal-label">Course title</Label><Input required id="course-title" value={courseForm.title} onChange={(event) => setCourseForm((value) => ({ ...value, title: event.target.value, slug: editing ? value.slug : createCourseSlug(event.target.value) }))} className="h-11 rounded-none" /></div><div><Label htmlFor="course-price" className="portal-label">Price (INR)</Label><Input required id="course-price" type="number" min="1" step="1" value={courseForm.price} onChange={(event) => setCourseForm((value) => ({ ...value, price: event.target.value }))} className="h-11 rounded-none" /></div><div className="sm:col-span-2"><Label htmlFor="course-slug" className="portal-label">Course page URL</Label><div className="flex"><span className="flex h-11 items-center border border-r-0 border-input bg-secondary px-3 text-xs text-muted-foreground">/course/</span><Input id="course-slug" required value={courseForm.slug} onChange={(event) => setCourseForm((value) => ({ ...value, slug: createCourseSlug(event.target.value) }))} className="h-11 rounded-none" /></div></div><div className="sm:col-span-2"><Label htmlFor="course-description" className="portal-label">Description</Label><Textarea id="course-description" rows={4} value={courseForm.description} onChange={(event) => setCourseForm((value) => ({ ...value, description: event.target.value }))} className="rounded-none" /></div><div><Label htmlFor="course-thumb" className="portal-label">Thumbnail</Label><Input id="course-thumb" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setThumb(event.target.files?.[0] ?? null)} className="h-auto min-h-11 rounded-none px-2 py-2 text-xs" /><p className="mt-1 text-[11px] text-muted-foreground">Stored privately and displayed to visitors through a temporary image link.</p></div><div className="flex flex-col justify-center gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={courseForm.is_active} onChange={(event) => setCourseForm((value) => ({ ...value, is_active: event.target.checked }))} />Publish course</label><label className="flex items-center gap-2"><input type="checkbox" checked={courseForm.is_featured} onChange={(event) => setCourseForm((value) => ({ ...value, is_featured: event.target.checked }))} />Feature on homepage</label></div>{error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}<div className="flex gap-2 sm:col-span-2"><Button disabled={busy} type="submit" className="rounded-none bg-brand text-brand-foreground">{busy ? "Saving…" : editing ? "Save course" : "Create course"}</Button>{editing && <Button type="button" variant="outline" className="rounded-none" onClick={resetCourseForm}>Cancel</Button>}</div></form>
      <h2 className="mb-3 text-lg font-bold">All courses <span className="text-sm font-normal text-muted-foreground">({courses.length})</span></h2><div className="divide-y divide-border border-y border-border">{courses.map((course) => <div key={course.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-[200px] flex-1"><p className="font-semibold">{course.title}</p><p className="mt-1 text-xs text-muted-foreground">/course/{course.slug} · {formatRupees(course.price)}</p></div><span className={`text-xs font-semibold ${course.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>{course.is_active ? "Published" : "Draft"}</span><div className="flex gap-1"><Button size="sm" variant="outline" className="rounded-none" onClick={() => editCourse(course)}>Edit</Button><Button size="sm" variant="outline" className="rounded-none" onClick={() => void toggleCourse(course)}>{course.is_active ? "Unpublish" : "Publish"}</Button><Button size="sm" variant="ghost" className="rounded-none text-destructive" onClick={() => void deleteCourse(course)}>Delete</Button></div></div>)}</div></>}

    {tab === "payments" && <><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Payment review</p><h1 className="mt-2 text-3xl font-bold">Payment requests</h1><p className="mt-2 text-sm text-muted-foreground">Review the private proof and transaction ID before granting access.</p></div><label className="flex items-center gap-2 text-sm"><span className="sr-only">Filter payment requests</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="portal-input h-10 w-auto min-w-40 rounded-none"><option value="all">All requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><ChevronDown className="-ml-8 size-4 pointer-events-none" /></label></div>{shownPayments.length ? <div className="space-y-4">{shownPayments.map((payment) => {
        const student = profiles.find((item) => item.id === payment.user_id);
        const course = courses.find((item) => item.id === payment.course_id);
        return <article key={payment.id} className="border border-border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{course?.title ?? "Unavailable course"}</h2><StatusBadge status={payment.status} /></div><p className="mt-2 text-sm text-muted-foreground">{student?.full_name || "Student"} · {student?.email}</p><p className="mt-1 text-xs text-muted-foreground">{student?.mobile || "No mobile"} · submitted {formatDate(payment.created_at)}</p></div><span className="text-xl font-bold">{formatRupees(payment.amount)}</span></div><div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs text-muted-foreground">UTR / transaction ID</p><p className="mt-1 break-all font-mono text-sm">{payment.utr_number}</p><div className="mt-3 flex flex-wrap items-center gap-3"><a className="text-sm font-semibold underline underline-offset-4" href={proofUrls[payment.id]} target="_blank" rel="noreferrer">View private screenshot <ExternalLink className="ml-1 inline size-3.5" /></a>{payment.admin_note && <span className="text-xs text-destructive">Note: {payment.admin_note}</span>}</div></div>{payment.status === "pending" && <div className="flex flex-col gap-2 sm:min-w-56"><Textarea value={noteById[payment.id] ?? ""} onChange={(event) => setNoteById((value) => ({ ...value, [payment.id]: event.target.value }))} placeholder="Rejection note (required to reject)" rows={2} className="rounded-none text-xs" /><div className="flex gap-2"><Button disabled={busy} variant="outline" className="flex-1 rounded-none" onClick={() => void reviewPayment(payment, "rejected")}>Reject</Button><Button disabled={busy} className="flex-1 rounded-none bg-brand text-brand-foreground" onClick={() => void reviewPayment(payment, "approved")}>Approve <Check /></Button></div></div>}</div></article>;
      })}</div> : <EmptyState title="No matching payment requests" body="Payment submissions will appear here for review." />}</>}

    {tab === "students" && <><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Student accounts</p><h1 className="mt-2 text-3xl font-bold">Students</h1><p className="mt-2 text-sm text-muted-foreground">Student details and the courses they have access to.</p></div>{profiles.length ? <div className="overflow-x-auto border border-border"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-secondary text-xs uppercase text-muted-foreground"><tr><th className="p-4">Student</th><th className="p-4">Mobile</th><th className="p-4">Approved courses</th><th className="p-4">Payments</th></tr></thead><tbody>{profiles.map((person) => <tr key={person.id} className="border-t border-border"><td className="p-4"><span className="font-semibold">{person.full_name || "Student"}</span><span className="block text-xs text-muted-foreground">{person.email}</span></td><td className="p-4">{person.mobile || "—"}</td><td className="p-4">{payments.filter((item) => item.user_id === person.id && item.status === "approved").length}</td><td className="p-4">{payments.filter((item) => item.user_id === person.id).length}</td></tr>)}</tbody></table></div> : <EmptyState title="No student accounts yet" body="Student accounts appear here after they sign up." />}</>}

    {tab === "settings" && <><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Portal settings</p><h1 className="mt-2 text-3xl font-bold">Settings</h1><p className="mt-2 text-sm text-muted-foreground">Payment instructions and student contact details.</p></div><div className="max-w-2xl divide-y divide-border border-y border-border">{[{ label: "UPI payment ID", value: PORTAL_UPI_ID }, { label: "Student support WhatsApp", value: "+91 9265106657" }, { label: "Sign in and registration", value: "Email and mobile sign-in; email address required at registration." }, { label: "Payment review", value: "Course access starts only after admin approval." }].map((item) => <div key={item.label} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr]"><span className="text-xs font-semibold text-muted-foreground">{item.label}</span><span className="text-sm font-medium">{item.value}</span></div>)}</div><div className="mt-7 max-w-2xl border border-border bg-brand-soft p-4"><p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-brand" />Your private storage</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Payment proofs and uploaded videos are kept in restricted storage. The public course catalog currently uses a generated studio image until public thumbnail delivery is enabled.</p></div></>}
  </DashboardFrame>;
}