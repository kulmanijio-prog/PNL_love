import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Table2, Upload, FolderOpen, LogOut, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: Table2 },
  { to: "/upload", label: "Import", icon: Upload },
  { to: "/uploads", label: "Reports", icon: FolderOpen },
] as const;

function AuthLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-56 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Terminal className="h-4 w-4 text-amber" />
          <span className="font-mono text-xs uppercase tracking-widest">
            <span className="text-amber">TERMINAL</span><span className="text-muted-foreground"> //P&L</span>
          </span>
        </div>
        <nav className="flex-1 space-y-px p-2">
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-3 py-2 font-mono text-xs uppercase tracking-wider transition ${
                  active ? "bg-amber/10 text-amber border-l-2 border-amber" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground border-l-2 border-transparent"
                }`}>
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{email}</div>
          <button onClick={signOut} className="mt-2 flex w-full items-center gap-2 px-1 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-loss">
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
