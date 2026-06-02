import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUploads, deleteUpload } from "@/lib/uploads.functions";
import { inr } from "@/lib/format";
import { Shield, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_USER = "adminpnl";
const ADMIN_PASS = "adminpnl@56";
const STORAGE_KEY = "terminal_admin_session";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · TERMINAL" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setAuthed(sessionStorage.getItem(STORAGE_KEY) === "1");
    setChecking(false);
  }, []);

  if (checking) return null;

  return (
    <div className="p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// ADMIN</div>
          <h1 className="font-mono text-lg text-amber">Admin Control</h1>
        </div>
        {authed && (
          <button
            onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setAuthed(false); }}
            className="inline-flex items-center gap-1 border border-border bg-surface px-3 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        )}
      </header>

      {authed ? <AdminPanel /> : <LoginForm onSuccess={() => setAuthed(true)} />}
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      onSuccess();
    } else {
      setErr("Invalid credentials");
    }
  };

  return (
    <div className="panel max-w-md">
      <div className="panel-header"><span className="label">AUTH REQUIRED</span></div>
      <form onSubmit={submit} className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-amber">
          <Shield className="h-4 w-4" />
          <span className="font-mono text-xs uppercase tracking-widest">Admin sign-in</span>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Username</label>
          <input
            value={u}
            onChange={(e) => setU(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-amber focus:outline-none"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</label>
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-amber focus:outline-none"
          />
        </div>
        {err && <div className="font-mono text-xs text-loss">{err}</div>}
        <button type="submit" className="w-full border border-amber bg-amber px-3 py-2 font-mono text-xs uppercase tracking-widest text-background">
          Sign in
        </button>
      </form>
    </div>
  );
}

function AdminPanel() {
  const listFn = useServerFn(listUploads);
  const delFn = useServerFn(deleteUpload);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["uploads"], queryFn: () => listFn() });

  const remove = async (id: string) => {
    if (!confirm("Delete this report and all its trades?")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["uploads"] });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  const purgeAll = async () => {
    if (!data?.uploads.length) return;
    if (!confirm(`Delete ALL ${data.uploads.length} reports and their trades? This cannot be undone.`)) return;
    try {
      for (const u of data.uploads) await delFn({ data: { id: u.id } });
      toast.success("All reports purged");
      qc.invalidateQueries({ queryKey: ["uploads"] });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Purge failed"); }
  };

  const totalNet = data?.uploads.reduce((s, u) => s + Number(u.net_pnl || 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Reports</div>
          <div className="mt-1 font-mono text-2xl text-foreground">{data?.uploads.length ?? 0}</div>
        </div>
        <div className="panel p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Aggregate Net P&L</div>
          <div className="mt-1 font-mono text-2xl text-foreground">{inr(totalNet, { sign: true })}</div>
        </div>
        <div className="panel flex items-center justify-center p-4">
          <button
            onClick={purgeAll}
            disabled={!data?.uploads.length}
            className="w-full border border-loss bg-loss/10 px-3 py-2 font-mono text-xs uppercase tracking-widest text-loss hover:bg-loss/20 disabled:opacity-50"
          >
            Purge all reports
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><span className="label">MANAGE REPORTS</span></div>
        {isLoading && <div className="p-6 font-mono text-xs text-muted-foreground">LOADING…</div>}
        {data && data.uploads.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No reports.</div>}
        <table className="w-full text-xs">
          <tbody className="font-mono">
            {data?.uploads.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{u.file_name}</td>
                <td className="px-2 py-3 text-muted-foreground">{u.client_name} <span className="text-cyan">{u.client_code}</span></td>
                <td className="px-2 py-3 text-muted-foreground">{u.period_from} → {u.period_to}</td>
                <td className="px-2 py-3 text-right">
                  <button onClick={() => remove(u.id)} className="text-muted-foreground hover:text-loss">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
