import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Table2, Upload, FolderOpen, Terminal } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trades", label: "Trades", icon: Table2 },
  { to: "/upload", label: "Import", icon: Upload },
  { to: "/uploads", label: "Reports", icon: FolderOpen },
] as const;

function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-56 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Terminal className="h-4 w-4 text-amber" />
          <Link to="/" className="font-mono text-xs uppercase tracking-widest">
            <span className="text-amber">TERMINAL</span><span className="text-muted-foreground"> //P&L</span>
          </Link>
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
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
