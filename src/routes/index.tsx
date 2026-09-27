import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, Apple, Award, Bell, ChevronRight, Droplets, Flame, HeartPulse,
  LoaderCircle, LogOut, Moon, Plus, ShieldCheck, Sparkles, Target, UserRound,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Simón Vital | Tu bienestar universitario" },
    { name: "description", content: "Registra actividad, sueño, hidratación, alimentación y estrés en un solo lugar." },
    { property: "og:title", content: "Simón Vital | Tu bienestar universitario" },
    { property: "og:description", content: "Hábitos saludables, metas personales y progreso para estudiantes de Unisimón." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Index,
});

type Entry = {
  id: string;
  entry_date: string;
  activity_minutes: number;
  sleep_hours: number;
  water_glasses: number;
  nutrition_score: number;
  stress_level: number;
  note: string;
};

const habits = [
  { key: "activity_minutes", label: "Actividad", unit: "min", icon: Activity, tone: "bg-coral/15 text-coral", max: 60 },
  { key: "sleep_hours", label: "Sueño", unit: "horas", icon: Moon, tone: "bg-sky/15 text-sky", max: 10 },
  { key: "water_glasses", label: "Hidratación", unit: "vasos", icon: Droplets, tone: "bg-sky/15 text-sky", max: 12 },
  { key: "nutrition_score", label: "Alimentación", unit: "de 5", icon: Apple, tone: "bg-success/15 text-success", max: 5 },
  { key: "stress_level", label: "Estrés", unit: "de 5", icon: HeartPulse, tone: "bg-wine-soft text-wine", max: 5 },
] as const;

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("habit_entries").select("*").order("entry_date", { ascending: false }).limit(14)
      .then(({ data }) => setEntries((data ?? []) as Entry[]));
  }, [session]);

  if (!authReady) return <div className="grid min-h-screen place-items-center bg-background"><LoaderCircle className="size-7 animate-spin text-primary" /></div>;
  if (!session) return <AuthScreen />;

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((entry) => entry.entry_date === today);
  const streak = calculateStreak(entries);
  const score = todayEntry ? Math.round((Math.min(todayEntry.activity_minutes / 30, 1) + Math.min(todayEntry.sleep_hours / 8, 1) + Math.min(todayEntry.water_glasses / 8, 1) + todayEntry.nutrition_score / 5 + (6 - todayEntry.stress_level) / 5) * 20) : 0;

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground md:pb-10">
      <header className="border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Brand />
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label="Notificaciones"><Bell /></Button>
            <Button size="icon" variant="ghost" aria-label="Cerrar sesión" onClick={() => supabase.auth.signOut()}><LogOut /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 md:px-8 md:py-10">
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary"><Sparkles className="size-4" /> Tu bienestar, hoy</p>
            <h1 className="text-3xl font-bold md:text-5xl">Hola, ¿cómo te sientes?</h1>
            <p className="mt-2 text-sm text-muted-foreground">Un registro breve puede transformar tu semana.</p>
          </div>
          <Button size="lg" onClick={() => setShowForm(true)} className="h-12 shadow-lg shadow-primary/15"><Plus /> Registrar mi día</Button>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-semibold opacity-75">Balance de hoy</p><h2 className="mt-1 text-3xl font-bold">{todayEntry ? `${score}% en equilibrio` : "Tu día está por comenzar"}</h2></div>
              <div className="animate-breathe grid size-16 shrink-0 place-items-center rounded-full border-4 border-primary-foreground/25 text-lg font-extrabold">{score}</div>
            </div>
            <p className="mt-8 max-w-lg text-sm leading-6 opacity-80">{todayEntry ? "Cada elección suma. Revisa tus cinco dimensiones y celebra el progreso, no la perfección." : "Registra tus hábitos para recibir una lectura clara de tu bienestar diario."}</p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: .8 }} className="h-full rounded-full bg-gold" /></div>
          </motion.article>

          <article className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Racha actual</p><h2 className="mt-1 text-3xl font-bold">{streak} {streak === 1 ? "día" : "días"}</h2></div><div className="grid size-14 place-items-center rounded-full bg-secondary text-primary"><Flame className="size-7" /></div></div>
            <div className="mt-7 flex gap-2">{Array.from({ length: 7 }).map((_, i) => <div key={i} className={cn("h-2 flex-1 rounded-full", i < Math.min(streak, 7) ? "bg-primary" : "bg-muted")} />)}</div>
            <p className="mt-3 text-xs text-muted-foreground">La constancia construye hábitos sostenibles.</p>
          </article>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-primary">Las cinco dimensiones</p><h2 className="mt-1 text-2xl font-bold">Tu panorama diario</h2></div><span className="text-xs text-muted-foreground">Meta recomendada</span></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {habits.map((habit, index) => {
              const value = todayEntry ? Number(todayEntry[habit.key]) : 0;
              const Icon = habit.icon;
              return <motion.article key={habit.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .07 * index }} whileHover={{ y: -4 }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className={cn("mb-5 grid size-10 place-items-center rounded-md", habit.tone)}><Icon className="size-5" /></div>
                <p className="text-xs font-semibold text-muted-foreground">{habit.label}</p><p className="mt-1 text-xl font-extrabold">{value} <span className="text-xs font-medium text-muted-foreground">{habit.unit}</span></p>
                <Progress value={Math.min((value / habit.max) * 100, 100)} className="mt-4" />
              </motion.article>;
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-border bg-card p-6"><div className="flex items-center gap-3"><Target className="text-primary" /><h2 className="text-xl font-bold">Meta de esta semana</h2></div><p className="mt-4 text-sm text-muted-foreground">Completa al menos cuatro registros para reconocer patrones en tu rutina académica.</p><div className="mt-5 flex items-center gap-3"><Progress value={Math.min(entries.filter(e => daysAgo(e.entry_date) < 7).length * 25, 100)} /><span className="text-sm font-bold">{Math.min(entries.filter(e => daysAgo(e.entry_date) < 7).length, 4)}/4</span></div></article>
          <article className="rounded-lg border border-border bg-secondary/55 p-6"><div className="flex items-center gap-3"><Award className="text-primary" /><h2 className="text-xl font-bold">Próximo logro</h2></div><p className="mt-4 text-sm text-muted-foreground">“Primera semana consciente” se desbloquea al mantener una racha de 7 días.</p><div className="mt-5 flex items-center justify-between text-sm"><span className="font-semibold text-primary">{streak} de 7 días</span><ChevronRight className="size-4 text-primary" /></div></article>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-5 py-3 backdrop-blur-lg md:hidden"><div className="mx-auto flex max-w-sm justify-around"><NavItem icon={HeartPulse} label="Hoy" active /><NavItem icon={Activity} label="Progreso" /><NavItem icon={Target} label="Metas" /><NavItem icon={UserRound} label="Perfil" /></div></nav>
      <AnimatePresence>{showForm && <DailyForm session={session} existing={todayEntry} onClose={() => setShowForm(false)} onSaved={(entry) => { setEntries((old) => [entry, ...old.filter(x => x.entry_date !== entry.entry_date)]); setShowForm(false); setNotice("Tu día quedó registrado. ¡Sigue así!"); setTimeout(() => setNotice(""), 3500); }} />}</AnimatePresence>
      <AnimatePresence>{notice && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-xl">{notice}</motion.div>}</AnimatePresence>
    </main>
  );
}

function Brand() { return <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground">SV</div><div><p className="font-display text-lg font-bold leading-none">Simón Vital</p><p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">Unisimón · Barranquilla</p></div></div>; }

function AuthScreen() {
  const [signup, setSignup] = useState(false); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const result = signup ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }) : await supabase.auth.signInWithPassword({ email, password }); setBusy(false); if (result.error) setMessage(result.error.message); else if (signup) setMessage("Revisa tu correo para confirmar tu cuenta."); }
  async function google() { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) setMessage(result.error.message); }
  return <main className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_.85fr]">
    <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><Brand /><div className="max-w-xl"><p className="mb-5 text-sm font-bold uppercase text-gold">Bienestar universitario · ODS 3</p><h1 className="text-6xl font-bold leading-tight">Tus hábitos cuentan una historia.</h1><p className="mt-6 max-w-lg text-lg leading-8 opacity-80">Conócela día a día y construye una vida universitaria con más energía, equilibrio y propósito.</p></div><div className="flex gap-8 text-sm opacity-75"><span>5 dimensiones</span><span>Datos privados</span><span>Progreso real</span></div></section>
    <section className="flex items-center justify-center px-5 py-10"><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md"><div className="mb-10 lg:hidden"><Brand /></div><p className="text-xs font-bold uppercase text-primary">Comienza tu recorrido</p><h2 className="mt-2 text-3xl font-bold">{signup ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2><p className="mt-2 text-sm text-muted-foreground">{signup ? "Únete a la comunidad que cuida su bienestar." : "Continúa fortaleciendo tus hábitos."}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">{signup && <div><Label htmlFor="name">Nombre completo</Label><Input id="name" className="mt-2 h-11" value={name} onChange={e => setName(e.target.value)} required /></div>}<div><Label htmlFor="email">Correo electrónico</Label><Input id="email" type="email" className="mt-2 h-11" value={email} onChange={e => setEmail(e.target.value)} required /></div><div><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" minLength={6} className="mt-2 h-11" value={password} onChange={e => setPassword(e.target.value)} required /></div>{message && <p className="rounded-md bg-wine-soft p-3 text-sm text-primary">{message}</p>}<Button className="h-11 w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{signup ? "Crear cuenta" : "Ingresar"}</Button></form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o continúa con<span className="h-px flex-1 bg-border" /></div><Button variant="outline" className="h-11 w-full" onClick={google}><span className="font-bold text-primary">G</span> Google</Button><Button type="button" variant="link" className="mt-5 w-full text-muted-foreground" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "¿Ya tienes cuenta? Ingresa" : "¿Aún no tienes cuenta? Regístrate"}</Button><p className="mt-8 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />Tu información de bienestar es privada y se usa únicamente para tu seguimiento personal.</p>
    </motion.div></section>
  </main>;
}

function DailyForm({ session, existing, onClose, onSaved }: { session: Session; existing: Entry | undefined; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const initial = useMemo(() => ({ activity_minutes: existing?.activity_minutes ?? 30, sleep_hours: existing?.sleep_hours ?? 7, water_glasses: existing?.water_glasses ?? 6, nutrition_score: existing?.nutrition_score ?? 3, stress_level: existing?.stress_level ?? 3, note: existing?.note ?? "" }), [existing]);
  const [form, setForm] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); const payload = { ...form, user_id: session.user.id, entry_date: new Date().toISOString().slice(0, 10) }; const { data, error: saveError } = await supabase.from("habit_entries").upsert(payload, { onConflict: "user_id,entry_date" }).select().single(); setBusy(false); if (saveError) setError("No pudimos guardar el registro. Intenta de nuevo."); else onSaved(data as Entry); }
  return <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/45 p-0 backdrop-blur-sm md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.form onSubmit={save} onMouseDown={e => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", damping: 28 }} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-card p-6 md:rounded-lg md:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase text-primary">Registro diario</p><h2 className="mt-1 text-2xl font-bold">¿Cómo estuvo tu día?</h2></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">×</Button></div><div className="mt-6 space-y-5">{habits.map(h => <div key={h.key}><div className="mb-2 flex justify-between text-sm"><Label htmlFor={h.key}>{h.label}</Label><span className="font-bold text-primary">{form[h.key]} {h.unit}</span></div><input id={h.key} type="range" min={h.key === "stress_level" || h.key === "nutrition_score" ? 1 : 0} max={h.max} step={h.key === "sleep_hours" ? .5 : 1} value={form[h.key]} onChange={e => setForm({ ...form, [h.key]: Number(e.target.value) })} className="w-full accent-primary" /></div>)}<div><Label htmlFor="note">Una nota para ti</Label><Textarea id="note" className="mt-2" placeholder="¿Qué influyó en tu bienestar hoy?" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} maxLength={500} /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="h-11 w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}Guardar mi día</Button></div></motion.form></motion.div>;
}

function NavItem({ icon: Icon, label, active = false }: { icon: typeof Activity; label: string; active?: boolean }) { return <div className={cn("flex min-w-14 flex-col items-center gap-1 text-[10px] font-bold", active ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" /><span>{label}</span></div>; }
function daysAgo(date: string) { return Math.floor((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000); }
function calculateStreak(entries: Entry[]) { const dates = new Set(entries.map(e => e.entry_date)); let count = 0; const cursor = new Date(); while (dates.has(cursor.toISOString().slice(0, 10))) { count += 1; cursor.setDate(cursor.getDate() - 1); } return count; }
