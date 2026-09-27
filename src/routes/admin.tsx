import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { LogOut, ShieldCheck, Users, CalendarCheck, Activity, Search } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Panel administrador | WellCampus" },
      { name: "description", content: "Panel de monitoreo agregado de hábitos saludables de WellCampus." },
      { property: "og:title", content: "Panel administrador | WellCampus" },
      { property: "og:description", content: "Monitoreo agregado de hábitos de estudiantes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type UserRow = {
  user_id: string; email: string; registered_at: string; entries_count: number; last_entry: string | null;
  avg_activity: number | null; avg_sleep: number | null; avg_water: number | null;
  avg_nutrition: number | null; avg_stress: number | null;
};
type DayRow = {
  day: string; active_users: number; avg_activity: number; avg_sleep: number; avg_water: number;
  avg_nutrition: number; avg_stress: number;
};

type Status = "loading" | "signedOut" | "forbidden" | "admin";

function AdminPage() {
  const [status, setStatus] = useState<Status>("loading");

  const check = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setStatus("signedOut");
    const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    setStatus(ok ? "admin" : "forbidden");
  }, []);

  useEffect(() => {
    void check();
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") void check();
    });
    return () => data.subscription.unsubscribe();
  }, [check]);

  const signOut = async () => { await supabase.auth.signOut(); setStatus("signedOut"); };

  if (status === "loading") return <Center><p className="text-muted-foreground">Cargando…</p></Center>;
  if (status === "signedOut") return <AdminLogin />;
  if (status === "forbidden")
    return (
      <Center>
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta cuenta no tiene permisos de administrador.</p>
          <Button className="mt-6 w-full" variant="outline" onClick={signOut}>Cerrar sesión</Button>
        </div>
      </Center>
    );
  return <Dashboard onSignOut={signOut} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6">{children}</div>;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Credenciales inválidas.");
    setBusy(false);
  };
  return (
    <Center>
      <motion.form
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-sm"
      >
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-2 h-9 w-9 text-primary" />
          <h1 className="text-2xl font-semibold">WellCampus Admin</h1>
          <p className="text-sm text-muted-foreground">Acceso exclusivo para administradores</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Contraseña</Label>
          <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</Button>
      </motion.form>
    </Center>
  );
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("es-CO"));

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const [u, d] = await Promise.all([
        supabase.rpc("admin_user_overview"),
        supabase.rpc("admin_daily_stats", { _days: 30 }),
      ]);
      if (u.error || d.error) setError("No se pudieron cargar los datos.");
      setUsers((u.data ?? []) as UserRow[]);
      setDays(((d.data ?? []) as DayRow[]).map((r) => ({ ...r, day: r.day.slice(5) })));
    })();
  }, []);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.entries_count > 0).length;
    const entries = users.reduce((s, u) => s + Number(u.entries_count), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = users.filter((u) => u.last_entry === today).length;
    return { total: users.length, active, entries, todayCount };
  }, [users]);

  const filtered = users.filter((u) => u.email?.toLowerCase().includes(query.toLowerCase()));

  const cards = [
    { label: "Usuarios registrados", value: stats.total, icon: Users },
    { label: "Usuarios con registros", value: stats.active, icon: Activity },
    { label: "Días registrados", value: stats.entries, icon: CalendarCheck },
    { label: "Registraron hoy", value: stats.todayCount, icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">WellCampus · Panel administrador</h1>
            <p className="text-xs text-muted-foreground">Solo se muestra el correo y datos agregados de hábitos.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" />Salir</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} className="rounded-2xl border bg-card p-5">
              <c.icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-3xl font-semibold">{fmt(c.value)}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Usuarios activos por día (30 días)">
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} />
              <Tooltip /><Bar dataKey="active_users" name="Usuarios" fill="var(--primary)" radius={4} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Sueño, hidratación y estrés promedio">
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line dataKey="avg_sleep" name="Sueño (h)" stroke="var(--primary)" dot={false} strokeWidth={2} />
              <Line dataKey="avg_water" name="Agua (vasos)" stroke="var(--sky)" dot={false} strokeWidth={2} />
              <Line dataKey="avg_stress" name="Estrés (1-5)" stroke="var(--coral)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartCard>
          <ChartCard title="Actividad física promedio (min)">
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line dataKey="avg_activity" name="Minutos" stroke="var(--primary)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartCard>
          <ChartCard title="Alimentación promedio (1-5)">
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} /><YAxis domain={[0, 5]} fontSize={11} /><Tooltip />
              <Line dataKey="avg_nutrition" name="Puntaje" stroke="var(--gold)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartCard>
        </div>

        <section className="rounded-2xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <h2 className="font-semibold">Usuarios</h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por correo" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  {["Correo", "Registro", "Días", "Último", "Actividad", "Sueño", "Agua", "Alimentación", "Estrés"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.user_id} className="border-t">
                    <td className="px-4 py-3 font-medium">{u.email}</td>
                    <td className="px-4 py-3">{new Date(u.registered_at).toLocaleDateString("es-CO")}</td>
                    <td className="px-4 py-3">{fmt(u.entries_count)}</td>
                    <td className="px-4 py-3">{u.last_entry ?? "—"}</td>
                    <td className="px-4 py-3">{fmt(u.avg_activity)}</td>
                    <td className="px-4 py-3">{fmt(u.avg_sleep)}</td>
                    <td className="px-4 py-3">{fmt(u.avg_water)}</td>
                    <td className="px-4 py-3">{fmt(u.avg_nutrition)}</td>
                    <td className="px-4 py-3">{fmt(u.avg_stress)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Sin usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-56"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
