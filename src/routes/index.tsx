import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FileSpreadsheet, Shield, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TERMINAL // Portfolio P&L Analytics" },
      { name: "description", content: "Bloomberg-style trading dashboard. Upload broker reports, analyze realized/net P&L, turnover, charges, and trade-wise breakdowns." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-sm tracking-widest">
            <span className="text-amber">TERMINAL</span>
            <span className="text-muted-foreground">// PORTFOLIO</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/dashboard" className="inline-flex items-center gap-1 border border-amber bg-amber/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-amber hover:bg-amber/20">
              Launch <ArrowRight className="h-3 w-3" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border terminal-grid">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="font-mono text-xs uppercase tracking-widest text-amber">Security analysis · Portfolio manager</div>
            <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              The terminal for your <span className="text-amber">P&L</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Drop in a Kotak gain/loss report. Get instant realized vs net P&L, turnover by segment, charge composition, instrument heatmaps, and trade-wise drilldown — built for traders who think in tickers, not tabs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/dashboard" className="inline-flex items-center gap-2 border border-amber bg-amber px-5 py-3 font-mono text-sm uppercase tracking-wider text-background hover:bg-amber/90">
                Open terminal <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 border border-border px-5 py-3 font-mono text-sm uppercase tracking-wider text-foreground hover:border-amber/60">
                Features
              </a>
            </div>

            {/* mock terminal preview */}
            <div className="mt-14 panel overflow-hidden">
              <div className="panel-header">
                <span><span className="label">PORTFOLIO</span> · KSIY0 · Apr–Jun 2026</span>
                <span className="text-cyan">LIVE</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
                {[
                  { l: "Realized P&L", v: "+2,91,560", c: "text-profit" },
                  { l: "Net P&L", v: "+2,77,332", c: "text-profit" },
                  { l: "Charges", v: "29,048", c: "text-foreground" },
                  { l: "Turnover", v: "60.28 L", c: "text-amber" },
                ].map((k) => (
                  <div key={k.l} className="px-4 py-5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                    <div className={`mt-2 font-mono text-2xl font-semibold ${k.c}`}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <h2 className="font-mono text-xs uppercase tracking-widest text-amber">// MODULES</h2>
            <div className="mt-8 grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
              {[
                { i: FileSpreadsheet, t: "Import", d: "Drop CSV/Excel from Kotak. Auto-detected fields, instant preview, persisted to your account." },
                { i: BarChart3, t: "Visualize", d: "Time-series P&L, segment turnover bars, charge composition pies, instrument heatmaps." },
                { i: Activity, t: "Drilldown", d: "Filter trades by underlying, expiry, strike, option type. Inspect every charge component per trade." },
                { i: Shield, t: "Tax-ready", d: "Export filtered trades or download a tax-ready summary that excludes STT/CTT per disclaimer." },
              ].map((f) => (
                <div key={f.t} className="bg-background p-6">
                  <f.i className="h-5 w-5 text-amber" />
                  <div className="mt-4 font-mono text-sm uppercase tracking-wider">{f.t}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          TERMINAL · v1.0 · End-of-day data only · Tax summary excludes STT/CTT per disclaimer
        </div>
      </footer>
    </div>
  );
}
