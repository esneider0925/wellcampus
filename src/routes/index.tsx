import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, Apple, Award, BarChart3, Bell, BellRing, CalendarDays, Check,
  ChevronRight, Clock3, Droplets, Flame, HeartPulse, LoaderCircle, LogOut,
  Moon, Plus, ShieldCheck, Sparkles, Target, TrendingUp, UserRound, X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "WellCampus | Bienestar universitario" },
    { name: "description", content: "Registra tus hábitos, consulta tu progreso y alcanza metas saludables en la Universidad Simón Bolívar." },
    { property: "og:title", content: "WellCampus | Bienestar universitario" },
    { property: "og:description", content: "Hábitos saludables, metas personales y progreso para estudiantes de la Universidad Simón Bolívar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Index,
});

type Entry = { id: string; entry_date: string; activity_minutes: number; sleep_hours: number; water_glasses: number; nutrition_score: number; stress_level: number; note: string };
type Goal = { id?: string; user_id: string; habit_type: string; target_value: number; unit: string; active: boolean };
type Profile = { id: string; full_name: string; program: string; semester: number | null; study_shift: string | null };
type View = "today" | "progress" | "goals" | "profile";

const habits = [
  { key: "activity_minutes", type: "activity", label: "Actividad", unit: "min", icon: Activity, tone: "bg-coral/15 text-coral", max: 60, defaultGoal: 30 },
  { key: "sleep_hours", type: "sleep", label: "Sueño", unit: "horas", icon: Moon, tone: "bg-sky/15 text-sky", max: 10, defaultGoal: 8 },
  { key: "water_glasses", type: "water", label: "Hidratación", unit: "vasos", icon: Droplets, tone: "bg-sky/15 text-sky", max: 12, defaultGoal: 8 },
  { key: "nutrition_score", type: "nutrition", label: "Alimentación", unit: "de 5", icon: Apple, tone: "bg-success/15 text-success", max: 5, defaultGoal: 4 },
  { key: "stress_level", type: "stress", label: "Estrés", unit: "de 5", icon: HeartPulse, tone: "bg-wine-soft text-wine", max: 5, defaultGoal: 2 },
] as const;

function AnimatedIcon({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 14, delay }}
      whileHover={{ scale: 1.15, rotate: 8 }}
      whileTap={{ scale: 0.9 }}
      className={cn("inline-grid place-items-center", className)}
    >
      <motion.span
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
        className="grid place-items-center"
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeView, setActiveView] = useState<View>("today");
  const [showForm, setShowForm] = useState(false);
  const [pastMode, setPastMode] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("habit_entries").select("*").order("entry_date", { ascending: false }).limit(30),
      supabase.from("goals").select("*").eq("active", true),
      supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
    ]).then(([entryResult, goalResult, profileResult]) => {
      setEntries((entryResult.data ?? []) as Entry[]);
      setGoals((goalResult.data ?? []) as Goal[]);
      const fallback = { id: session.user.id, full_name: String(session.user.user_metadata?.["full_name"] ?? ""), program: "", semester: null, study_shift: null };
      setProfile((profileResult.data as Profile | null) ?? fallback);
    });
  }, [session]);

  useEffect(() => {
    const raw = localStorage.getItem("wellcampus-reminder");
    if (!raw) return undefined;
    try {
      const reminder = JSON.parse(raw) as { enabled?: boolean; time?: string };
      if (!reminder.enabled || !reminder.time) return undefined;
      const [hours, minutes] = reminder.time.split(":").map(Number);
      if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) return undefined;
      const next = new Date();
      next.setHours(hours, minutes, 0, 0);
      if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
      const timer = window.setTimeout(() => {
        const message = "Es momento de registrar tus hábitos de hoy.";
        setNotice(message);
        if ("Notification" in window && Notification.permission === "granted") new Notification("WellCampus", { body: message });
      }, next.getTime() - Date.now());
      return () => window.clearTimeout(timer);
    } catch {
      localStorage.removeItem("wellcampus-reminder");
      return undefined;
    }
  }, [showReminders]);

  if (!authReady) return <div className="grid min-h-screen place-items-center bg-background"><LoaderCircle className="size-7 animate-spin text-primary" /></div>;
  if (!session) return <AuthScreen />;

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((entry) => entry.entry_date === today);
  const streak = calculateStreak(entries);
  const score = scoreEntry(todayEntry);
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 3500); };

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground md:pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Secciones principales">
            <HeaderNav active={activeView} onChange={setActiveView} />
          </nav>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Configurar recordatorios" onClick={() => setShowReminders(true)}><Bell /></Button>
            <Button className="hidden md:inline-flex" size="icon" variant="ghost" aria-label="Cerrar sesión" onClick={() => supabase.auth.signOut()}><LogOut /></Button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .24 }} className="mx-auto max-w-6xl px-4 py-7 md:px-8 md:py-10">
          {activeView === "today" && <TodayScreen entries={entries} todayEntry={todayEntry} score={score} streak={streak} onRegister={() => { setPastMode(false); setShowForm(true); }} onRegisterPast={() => { setPastMode(true); setShowForm(true); }} onGoProgress={() => setActiveView("progress")} />}
          {activeView === "progress" && <ProgressScreen entries={entries} streak={streak} />}
          {activeView === "goals" && <GoalsScreen session={session} goals={goals} onSaved={(next) => { setGoals(next); notify("Tus metas quedaron actualizadas."); }} />}
          {activeView === "profile" && profile && <ProfileScreen session={session} profile={profile} onSaved={(next) => { setProfile(next); notify("Tu perfil quedó actualizado."); }} />}
        </motion.div>
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 py-2 backdrop-blur-lg md:hidden"><div className="mx-auto flex max-w-sm justify-around"><NavItem icon={HeartPulse} label="Hoy" active={activeView === "today"} onClick={() => setActiveView("today")} /><NavItem icon={BarChart3} label="Progreso" active={activeView === "progress"} onClick={() => setActiveView("progress")} /><NavItem icon={Target} label="Meta" active={activeView === "goals"} onClick={() => setActiveView("goals")} /><NavItem icon={UserRound} label="Perfil" active={activeView === "profile"} onClick={() => setActiveView("profile")} /></div></nav>
      <AnimatePresence>{showForm && <DailyForm session={session} existing={todayEntry} pastMode={pastMode} entries={entries} onClose={() => setShowForm(false)} onSaved={(entry) => { setEntries((old) => [entry, ...old.filter(x => x.entry_date !== entry.entry_date)].sort((a, b) => b.entry_date.localeCompare(a.entry_date))); setShowForm(false); notify("Tu día quedó registrado. ¡Sigue así!"); }} />}</AnimatePresence>
      <AnimatePresence>{showReminders && <ReminderPanel onClose={() => setShowReminders(false)} onSaved={notify} />}</AnimatePresence>
      <AnimatePresence>{notice && <motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md bg-foreground px-4 py-3 text-center text-sm font-semibold text-background shadow-xl">{notice}</motion.div>}</AnimatePresence>
    </main>
  );
}

function TodayScreen({ entries, todayEntry, score, streak, onRegister, onRegisterPast, onGoProgress }: { entries: Entry[]; todayEntry: Entry | undefined; score: number; streak: number; onRegister: () => void; onRegisterPast: () => void; onGoProgress: () => void }) {
  const weekCount = entries.filter(e => daysAgo(e.entry_date) < 7).length;
  return <>
    <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary"><Sparkles className="size-4" /> Tu bienestar, hoy</p><h1 className="text-3xl font-bold md:text-5xl">Hola, ¿cómo te sientes?</h1><p className="mt-2 text-sm text-muted-foreground">Un registro breve puede transformar tu semana.</p></div><div className="flex flex-col items-start gap-1 md:items-end"><Button size="lg" onClick={onRegister} className="h-12 shadow-lg shadow-primary/15"><Plus /> Registrar mi día</Button><Button variant="link" size="sm" onClick={onRegisterPast} className="h-8 px-1 text-xs text-muted-foreground hover:text-primary"><CalendarDays className="size-3.5" /> ¿Olvidaste un día? Complétalo aquí</Button></div></section>
    <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold opacity-75">Balance de hoy</p><h2 className="mt-1 text-3xl font-bold">{todayEntry ? `${score}% en equilibrio` : "Tu día está por comenzar"}</h2></div><div className="animate-breathe grid size-16 shrink-0 place-items-center rounded-full border-4 border-primary-foreground/25 text-lg font-extrabold">{score}</div></div><p className="mt-8 max-w-lg text-sm leading-6 opacity-80">{todayEntry ? "Cada elección suma. Celebra el progreso, no la perfección." : "Registra tus hábitos para recibir una lectura clara de tu bienestar diario."}</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: .8 }} className="h-full rounded-full bg-gold" /></div></motion.article>
      <article className="rounded-lg border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Racha actual</p><h2 className="mt-1 text-3xl font-bold">{streak} {streak === 1 ? "día" : "días"}</h2></div><div className="grid size-14 place-items-center rounded-full bg-secondary text-primary"><Flame className="size-7" /></div></div><div className="mt-7 flex gap-2">{Array.from({ length: 7 }).map((_, i) => <div key={i} className={cn("h-2 flex-1 rounded-full", i < Math.min(streak, 7) ? "bg-primary" : "bg-muted")} />)}</div><p className="mt-3 text-xs text-muted-foreground">La constancia construye hábitos sostenibles.</p></article></section>
    <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-primary">Las cinco dimensiones</p><h2 className="mt-1 text-2xl font-bold">Tu panorama diario</h2></div><span className="text-xs text-muted-foreground">Meta recomendada</span></div><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{habits.map((habit, index) => { const value = todayEntry ? Number(todayEntry[habit.key]) : 0; const Icon = habit.icon; return <motion.article key={habit.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .07 * index }} whileHover={{ y: -4 }} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className={cn("mb-5 grid size-10 place-items-center rounded-md", habit.tone)}><AnimatedIcon delay={index * 0.1}><Icon className="size-5" /></AnimatedIcon></div><p className="text-xs font-semibold text-muted-foreground">{habit.label}</p><p className="mt-1 text-xl font-extrabold">{value} <span className="text-xs font-medium text-muted-foreground">{habit.unit}</span></p><Progress value={Math.min((value / habit.max) * 100, 100)} className="mt-4" /></motion.article>; })}</div></section>
    <section className="mt-8 grid gap-4 md:grid-cols-2"><article className="rounded-lg border border-border bg-card p-6"><div className="flex items-center gap-3"><Target className="text-primary" /><h2 className="text-xl font-bold">Meta de esta semana</h2></div><p className="mt-4 text-sm text-muted-foreground">Completa al menos cuatro registros para reconocer patrones.</p><div className="mt-5 flex items-center gap-3"><Progress value={Math.min(weekCount * 25, 100)} /><span className="text-sm font-bold">{Math.min(weekCount, 4)}/4</span></div></article><Button type="button" variant="ghost" onClick={onGoProgress} className="h-auto items-stretch justify-start rounded-lg border border-border bg-secondary/55 p-6 text-left hover:bg-secondary"><div className="w-full"><div className="flex items-center gap-3"><Award className="text-primary" /><h2 className="text-xl font-bold">Próximo logro</h2></div><p className="mt-4 whitespace-normal text-sm font-normal text-muted-foreground">“Primera semana consciente” se desbloquea con una racha de 7 días.</p><div className="mt-5 flex items-center justify-between text-sm"><span className="font-semibold text-primary">{streak} de 7 días</span><ChevronRight className="size-4 text-primary" /></div></div></Button></section>
  </>;
}

function ProgressScreen({ entries, streak }: { entries: Entry[]; streak: number }) {
  const recent = [...entries].slice(0, 7).reverse();
  const averages = habits.map(h => ({ ...h, value: recent.length ? recent.reduce((sum, e) => sum + Number(e[h.key]), 0) / recent.length : 0 }));
  return <><PageIntro eyebrow="Tu evolución" title="Progreso" description="Observa tus últimas jornadas y descubre qué hábitos necesitan más atención." />
    <section className="grid gap-4 md:grid-cols-3"><Metric icon={CalendarDays} label="Registros totales" value={String(entries.length)} detail="días documentados" /><Metric icon={Flame} label="Racha activa" value={String(streak)} detail="días consecutivos" /><Metric icon={TrendingUp} label="Balance promedio" value={`${recent.length ? Math.round(recent.reduce((s, e) => s + scoreEntry(e), 0) / recent.length) : 0}%`} detail="últimos 7 registros" /></section>
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]"><article className="rounded-lg border border-border bg-card p-5 md:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-primary">Últimos registros</p><h2 className="mt-1 text-xl font-bold">Balance diario</h2></div><BarChart3 className="text-primary" /></div>{recent.length ? <div className="mt-8 flex h-52 items-end gap-3">{recent.map((entry) => { const value = scoreEntry(entry); return <div key={entry.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-bold text-primary">{value}</span><motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(value, 6)}%` }} className="w-full max-w-10 rounded-t-md bg-primary" /><span className="text-[10px] text-muted-foreground">{formatDay(entry.entry_date)}</span></div>; })}</div> : <EmptyState icon={BarChart3} title="Aún no hay datos" text="Registra tu primer día para comenzar a ver tu evolución." />}</article>
      <article className="rounded-lg border border-border bg-card p-5 md:p-7"><p className="text-xs font-bold uppercase text-primary">Promedios recientes</p><h2 className="mt-1 text-xl font-bold">Por dimensión</h2><div className="mt-6 space-y-5">{averages.map(h => { const Icon = h.icon; return <div key={h.key}><div className="mb-2 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-primary" />{h.label}</span><span className="font-bold">{Number.isInteger(h.value) ? h.value : h.value.toFixed(1)} {h.unit}</span></div><Progress value={Math.min((h.value / h.max) * 100, 100)} /></div>; })}</div></article></section>
  </>;
}

function GoalsScreen({ session, goals, onSaved }: { session: Session; goals: Goal[]; onSaved: (goals: Goal[]) => void }) {
  const initial = Object.fromEntries(habits.map(h => [h.type, goals.find(g => g.habit_type === h.type)?.target_value ?? h.defaultGoal]));
  const [values, setValues] = useState<Record<string, number>>(initial);
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); const payload = habits.map(h => ({ user_id: session.user.id, habit_type: h.type, target_value: values[h.type] ?? h.defaultGoal, unit: h.unit, active: true })); const { data, error } = await supabase.from("goals").upsert(payload, { onConflict: "user_id,habit_type" }).select(); setBusy(false); if (!error) onSaved((data ?? []) as Goal[]); }
  return <><PageIntro eyebrow="Tu dirección" title="Metas personales" description="Define objetivos realistas para avanzar a tu ritmo y mantener hábitos sostenibles." />
    <form onSubmit={save}><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{habits.map((habit, index) => { const Icon = habit.icon; return <motion.article key={habit.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className="rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-3"><div className={cn("grid size-10 place-items-center rounded-md", habit.tone)}><AnimatedIcon delay={index * 0.1}><Icon className="size-5" /></AnimatedIcon></div><div><h2 className="font-bold">{habit.label}</h2><p className="text-xs text-muted-foreground">Objetivo diario</p></div></div><div className="mt-6 flex items-end gap-3"><Input aria-label={`Meta de ${habit.label}`} type="number" min={habit.type === "stress" || habit.type === "nutrition" ? 1 : 0} max={habit.max} step={habit.type === "sleep" ? .5 : 1} value={values[habit.type]} onChange={e => setValues({ ...values, [habit.type]: Number(e.target.value) })} className="h-12 text-lg font-bold" /><span className="pb-3 text-sm text-muted-foreground">{habit.unit}</span></div></motion.article>; })}</div><div className="mt-6 flex justify-end"><Button size="lg" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}Guardar metas</Button></div></form>
    <section className="mt-8 rounded-lg bg-secondary p-6"><div className="flex gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Target /></div><div><h2 className="font-bold">Metas que cuidan de ti</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Puedes ajustarlas en cualquier momento. Para el estrés, un valor menor representa una mejor meta.</p></div></div></section>
  </>;
}

function ProfileScreen({ session, profile, onSaved }: { session: Session; profile: Profile; onSaved: (profile: Profile) => void }) {
  const [form, setForm] = useState(profile); const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); const { data, error } = await supabase.from("profiles").upsert({ ...form, id: session.user.id }).select().single(); setBusy(false); if (!error) onSaved(data as Profile); }
  const initials = form.full_name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "WC";
  return <><PageIntro eyebrow="Tu cuenta" title="Perfil" description="Mantén actualizada tu información universitaria y controla tu experiencia." />
    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><aside className="rounded-lg bg-primary p-6 text-primary-foreground"><div className="grid size-20 place-items-center rounded-full bg-primary-foreground/15 text-2xl font-bold">{initials}</div><h2 className="mt-5 text-2xl font-bold">{form.full_name || "Estudiante"}</h2><p className="mt-1 text-sm opacity-75">{session.user.email}</p><div className="mt-8 flex items-center gap-2 border-t border-primary-foreground/20 pt-5 text-xs opacity-80"><ShieldCheck className="size-4" />Tus datos son privados y solo tú puedes consultarlos.</div></aside>
      <form onSubmit={save} className="rounded-lg border border-border bg-card p-5 md:p-7"><h2 className="text-xl font-bold">Información académica</h2><div className="mt-6 grid gap-5 md:grid-cols-2"><div className="md:col-span-2"><Label htmlFor="full-name">Nombre completo</Label><Input id="full-name" className="mt-2 h-11" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div><div><Label htmlFor="program">Programa académico</Label><Input id="program" className="mt-2 h-11" placeholder="Ej. Psicología" value={form.program} onChange={e => setForm({ ...form, program: e.target.value })} /></div><div><Label htmlFor="semester">Semestre</Label><Input id="semester" type="number" min={1} max={12} className="mt-2 h-11" value={form.semester ?? ""} onChange={e => setForm({ ...form, semester: e.target.value ? Number(e.target.value) : null })} /></div><div className="md:col-span-2"><Label>Jornada</Label><Select value={form.study_shift ?? ""} onValueChange={value => setForm({ ...form, study_shift: value })}><SelectTrigger className="mt-2 h-11 w-full"><SelectValue placeholder="Selecciona tu jornada" /></SelectTrigger><SelectContent><SelectItem value="Diurna">Diurna</SelectItem><SelectItem value="Nocturna">Nocturna</SelectItem><SelectItem value="Mixta">Mixta</SelectItem></SelectContent></Select></div></div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => supabase.auth.signOut()}><LogOut />Cerrar sesión</Button><Button disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}Guardar perfil</Button></div></form></div>
  </>;
}

function ReminderPanel({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const [enabled, setEnabled] = useState(false); const [time, setTime] = useState("20:00");
  useEffect(() => { const raw = localStorage.getItem("wellcampus-reminder"); if (raw) { const saved = JSON.parse(raw) as { enabled: boolean; time: string }; setEnabled(saved.enabled); setTime(saved.time); } }, []);
  async function save() { if (enabled && "Notification" in window && Notification.permission === "default") await Notification.requestPermission(); localStorage.setItem("wellcampus-reminder", JSON.stringify({ enabled, time })); onSaved(enabled ? `Recordatorio diario configurado a las ${time}.` : "Recordatorios desactivados."); onClose(); }
  return <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/45 backdrop-blur-sm md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.section onMouseDown={e => e.stopPropagation()} initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="w-full max-w-md rounded-t-lg bg-card p-6 md:rounded-lg"><div className="flex items-start justify-between"><div className="flex gap-3"><div className="grid size-11 place-items-center rounded-md bg-secondary text-primary"><BellRing /></div><div><p className="text-xs font-bold uppercase text-primary">Recordatorios</p><h2 className="mt-1 text-xl font-bold">Cuida tu constancia</h2></div></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><X /></Button></div><div className="mt-7 flex items-center justify-between rounded-lg border border-border p-4"><div><p className="font-semibold">Registro diario</p><p className="mt-1 text-xs text-muted-foreground">Recibe una alerta para completar tus hábitos.</p></div><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Activar recordatorio diario" /></div><div className="mt-5"><Label htmlFor="reminder-time">Hora del recordatorio</Label><div className="relative mt-2"><Clock3 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="reminder-time" type="time" value={time} onChange={e => setTime(e.target.value)} disabled={!enabled} className="h-11 pl-10" /></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Las alertas dependen de los permisos del navegador. Si no están disponibles, WellCampus te lo recordará mientras tengas la app abierta.</p><Button className="mt-6 h-11 w-full" onClick={save}>Guardar recordatorio</Button></motion.section></motion.div>;
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="mb-8"><p className="text-xs font-bold uppercase text-primary">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold md:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></section>; }
function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) { return <article className="rounded-lg border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-5 text-primary" /></div><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>; }
function EmptyState({ icon: Icon, title, text }: { icon: typeof Activity; title: string; text: string }) { return <div className="grid min-h-52 place-items-center text-center"><div><Icon className="mx-auto size-8 text-muted-foreground" /><h3 className="mt-3 font-bold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></div>; }
function HeaderNav({ active, onChange }: { active: View; onChange: (view: View) => void }) { const items: { id: View; label: string }[] = [{ id: "today", label: "Hoy" }, { id: "progress", label: "Progreso" }, { id: "goals", label: "Meta" }, { id: "profile", label: "Perfil" }]; return <>{items.map(item => <Button key={item.id} variant={active === item.id ? "secondary" : "ghost"} size="sm" onClick={() => onChange(item.id)}>{item.label}</Button>)}</>; }
function Brand() { return <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground">W</div><div><p className="font-display text-lg font-bold leading-none">WellCampus</p><p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">Unisimón · Barranquilla</p></div></div>; }

function AuthScreen() {
  const [signup, setSignup] = useState(false); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const result = signup ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }) : await supabase.auth.signInWithPassword({ email, password }); setBusy(false); if (result.error) setMessage(result.error.message); else if (signup) setMessage("Revisa tu correo para confirmar tu cuenta."); }
  async function google() { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) setMessage(result.error.message); }
  return <main className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_.85fr]"><section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><Brand /><div className="max-w-xl"><p className="mb-5 text-sm font-bold uppercase text-gold">Bienestar universitario · ODS 3</p><h1 className="text-6xl font-bold leading-tight">Tus hábitos cuentan una historia.</h1><p className="mt-6 max-w-lg text-lg leading-8 opacity-80">Conócela día a día y construye una vida universitaria con más energía, equilibrio y propósito.</p></div><div className="flex gap-8 text-sm opacity-75"><span>5 dimensiones</span><span>Datos privados</span><span>Progreso real</span></div></section><section className="flex items-center justify-center px-5 py-10"><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md"><div className="mb-10 lg:hidden"><Brand /></div><p className="text-xs font-bold uppercase text-primary">Comienza tu recorrido</p><h2 className="mt-2 text-3xl font-bold">{signup ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2><p className="mt-2 text-sm text-muted-foreground">{signup ? "Únete a la comunidad que cuida su bienestar." : "Continúa fortaleciendo tus hábitos."}</p><form onSubmit={submit} className="mt-8 space-y-4">{signup && <div><Label htmlFor="name">Nombre completo</Label><Input id="name" className="mt-2 h-11" value={name} onChange={e => setName(e.target.value)} required /></div>}<div><Label htmlFor="email">Correo electrónico</Label><Input id="email" type="email" className="mt-2 h-11" value={email} onChange={e => setEmail(e.target.value)} required /></div><div><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" minLength={6} className="mt-2 h-11" value={password} onChange={e => setPassword(e.target.value)} required /></div>{message && <p className="rounded-md bg-wine-soft p-3 text-sm text-primary">{message}</p>}<Button className="h-11 w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{signup ? "Crear cuenta" : "Ingresar"}</Button></form><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o continúa con<span className="h-px flex-1 bg-border" /></div><Button variant="outline" className="h-11 w-full" onClick={google}><span className="font-bold text-primary">G</span> Google</Button><Button type="button" variant="link" className="mt-5 w-full text-muted-foreground" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "¿Ya tienes cuenta? Ingresa" : "¿Aún no tienes cuenta? Regístrate"}</Button><p className="mt-8 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />Tu información de bienestar es privada y se usa únicamente para tu seguimiento personal.</p></motion.div></section></main>;
}

function DailyForm({ session, existing: todayExisting, pastMode, entries, onClose, onSaved }: { session: Session; existing: Entry | undefined; pastMode: boolean; entries: Entry[]; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const loggedDates = useMemo(() => entries.map(e => new Date(`${e.entry_date}T12:00:00`)), [entries]);
  const existing = pastMode ? entries.find(e => e.entry_date === pickedDate) : todayExisting;
  if (pastMode && !pickedDate) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(23, 59, 59);
    return <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/45 backdrop-blur-sm md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.div onMouseDown={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", damping: 28 }} className="w-full max-w-sm rounded-t-lg bg-card p-6 md:rounded-lg"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase text-primary">Días anteriores</p><h2 className="mt-1 text-xl font-bold">¿Qué día quieres completar?</h2></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><X /></Button></div><div className="mt-4 flex justify-center"><Calendar mode="single" locale={es} disabled={{ after: yesterday }} modifiers={{ logged: loggedDates }} modifiersClassNames={{ logged: "font-bold text-primary underline underline-offset-4" }} onSelect={(d) => d && setPickedDate(format(d, "yyyy-MM-dd"))} className="pointer-events-auto p-3" /></div><p className="mt-2 text-center text-xs text-muted-foreground">Los días subrayados ya tienen registro; puedes editarlos.</p></motion.div></motion.div>;
  }
  return <DailyFormBody key={pickedDate ?? "today"} session={session} existing={existing} date={pickedDate} onBack={pastMode ? () => setPickedDate(null) : undefined} onClose={onClose} onSaved={onSaved} />;
}

function DailyFormBody({ session, existing, date, onBack, onClose, onSaved }: { session: Session; existing: Entry | undefined; date: string | null; onBack?: () => void; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const initial = useMemo(() => ({ activity_minutes: existing?.activity_minutes ?? 30, sleep_hours: existing?.sleep_hours ?? 7, water_glasses: existing?.water_glasses ?? 6, nutrition_score: existing?.nutrition_score ?? 3, stress_level: existing?.stress_level ?? 3, note: existing?.note ?? "" }), [existing]); const [form, setForm] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); const payload = { ...form, user_id: session.user.id, entry_date: date ?? new Date().toISOString().slice(0, 10) }; const { data, error: saveError } = await supabase.from("habit_entries").upsert(payload, { onConflict: "user_id,entry_date" }).select().single(); setBusy(false); if (saveError) setError("No pudimos guardar el registro. Intenta de nuevo."); else onSaved(data as Entry); }
  return <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/45 backdrop-blur-sm md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.form onSubmit={save} onMouseDown={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", damping: 28 }} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-card p-6 md:rounded-lg md:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase text-primary">{date ? <button type="button" onClick={onBack} className="hover:underline">← {format(new Date(`${date}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })}</button> : "Registro diario"}</p><h2 className="mt-1 text-2xl font-bold">¿Cómo estuvo tu día?</h2></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><X /></Button></div><div className="mt-6 space-y-5">{habits.map(h => <div key={h.key}><div className="mb-2 flex justify-between text-sm"><Label htmlFor={h.key}>{h.label}</Label><span className="font-bold text-primary">{form[h.key]} {h.unit}</span></div><input id={h.key} type="range" min={h.key === "stress_level" || h.key === "nutrition_score" ? 1 : 0} max={h.max} step={h.key === "sleep_hours" ? .5 : 1} value={form[h.key]} onChange={e => setForm({ ...form, [h.key]: Number(e.target.value) })} className="w-full accent-primary" /></div>)}<div><Label htmlFor="note">Una nota para ti</Label><Textarea id="note" className="mt-2" placeholder="¿Qué influyó en tu bienestar hoy?" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} maxLength={500} /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="h-11 w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}Guardar mi día</Button></div></motion.form></motion.div>;
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: typeof Activity; label: string; active: boolean; onClick: () => void }) { return <Button variant="ghost" onClick={onClick} className={cn("h-14 min-w-16 flex-col gap-1 px-2 text-[10px] font-bold", active ? "bg-secondary text-primary" : "text-muted-foreground")} aria-current={active ? "page" : undefined}><AnimatedIcon><Icon className="size-5" /></AnimatedIcon><span>{label}</span></Button>; }
function daysAgo(date: string) { return Math.floor((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000); }
function calculateStreak(entries: Entry[]) { const dates = new Set(entries.map(e => e.entry_date)); let count = 0; const cursor = new Date(); while (dates.has(cursor.toISOString().slice(0, 10))) { count += 1; cursor.setDate(cursor.getDate() - 1); } return count; }
function scoreEntry(entry?: Entry) { return entry ? Math.round((Math.min(entry.activity_minutes / 30, 1) + Math.min(entry.sleep_hours / 8, 1) + Math.min(entry.water_glasses / 8, 1) + entry.nutrition_score / 5 + (6 - entry.stress_level) / 5) * 20) : 0; }
function formatDay(date: string) { return new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${date}T12:00:00`)).replace(".", ""); }
