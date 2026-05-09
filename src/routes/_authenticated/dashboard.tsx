import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { getUpload, listUploads } from "@/lib/uploads.functions";
import { inr, pct, pnlColor } from "@/lib/format";
import { ArrowUpRight, Upload as UploadIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · TERMINAL" }] }),
  component: DashboardPage,
});

const chartTheme = {
  bg: "transparent",
  axis: "#8b8b8b",
  border: "#3a3a3a",
  amber: "#ffb000",
  cyan: "#22d3ee",
  profit: "#22c55e",
  loss: "#ef4444",
};

function DashboardPage() {
  const listFn = useServerFn(listUploads);
  const getFn = useServerFn(getUpload);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: list } = useQuery({ queryKey: ["uploads"], queryFn: () => listFn() });
  const id = selected ?? list?.uploads[0]?.id ?? null;
  const { data, isLoading } = useQuery({
    queryKey: ["upload", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: list !== undefined,
  });

  const upload = data?.upload;
  const trades = data?.trades ?? [];

  if (!isLoading && !upload) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="panel max-w-md p-10 text-center">
          <UploadIcon className="mx-auto h-8 w-8 text-amber" />
          <h2 className="mt-4 font-mono text-sm uppercase tracking-widest">No reports yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Import a Kotak gain/loss file to populate the terminal.</p>
          <Link to="/upload" className="mt-6 inline-flex items-center gap-2 border border-amber bg-amber px-4 py-2 font-mono text-xs uppercase tracking-widest text-background">
            Import file <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (!upload) return <div className="p-8 font-mono text-xs text-muted-foreground">LOADING…</div>;

  // KPIs
  const winners = trades.filter((t) => Number(t.net_pnl) > 0).length;
  const losers = trades.filter((t) => Number(t.net_pnl) < 0).length;
  const wlr = losers ? winners / losers : winners;
  const totalTurnover =
    Number(upload.turnover_equity_delivery) + Number(upload.turnover_equity_intraday) +
    Number(upload.turnover_futures) + Number(upload.turnover_options);
  const profitPct = totalTurnover ? (Number(upload.net_pnl) / totalTurnover) * 100 : 0;
  const avgTrade = trades.length ? totalTurnover / trades.length : 0;

  // Charts
  const turnoverOpt = {
    backgroundColor: chartTheme.bg, grid: { left: 110, right: 30, top: 10, bottom: 30 },
    xAxis: { type: "value", axisLine: { lineStyle: { color: chartTheme.axis } }, splitLine: { lineStyle: { color: chartTheme.border } } },
    yAxis: {
      type: "category", axisLine: { lineStyle: { color: chartTheme.axis } },
      data: ["Eq. Delivery", "Eq. Intraday", "Futures", "Options"],
    },
    tooltip: { trigger: "axis", backgroundColor: "#111", borderColor: chartTheme.border, textStyle: { color: "#eee" }, valueFormatter: (v: number) => inr(v) },
    series: [{
      type: "bar", barWidth: 18,
      itemStyle: { color: chartTheme.amber },
      data: [
        Number(upload.turnover_equity_delivery), Number(upload.turnover_equity_intraday),
        Number(upload.turnover_futures), Number(upload.turnover_options),
      ],
    }],
  };

  const chargesOpt = {
    backgroundColor: chartTheme.bg, tooltip: { backgroundColor: "#111", borderColor: chartTheme.border, textStyle: { color: "#eee" } },
    legend: { textStyle: { color: chartTheme.axis }, bottom: 0, type: "scroll" },
    series: [{
      type: "pie", radius: ["45%", "70%"], avoidLabelOverlap: true,
      label: { color: "#ddd", fontFamily: "JetBrains Mono", fontSize: 10 },
      itemStyle: { borderColor: "#0d0d0d", borderWidth: 2 },
      data: [
        { name: "Brokerage", value: Number(upload.charges_brokerage), itemStyle: { color: chartTheme.amber } },
        { name: "GST", value: Number(upload.charges_gst), itemStyle: { color: chartTheme.cyan } },
        { name: "Misc", value: Number(upload.charges_misc), itemStyle: { color: "#a78bfa" } },
        { name: "STT/CTT", value: Number(upload.charges_stt_ctt), itemStyle: { color: chartTheme.loss } },
      ],
    }],
  };

  // Cumulative net P&L by expiry date (proxy for time series)
  const tradeWithDate = trades.filter((t) => t.expiry).sort((a, b) => (a.expiry! < b.expiry! ? -1 : 1));
  const dateBuckets = new Map<string, number>();
  tradeWithDate.forEach((t) => dateBuckets.set(t.expiry!, (dateBuckets.get(t.expiry!) ?? 0) + Number(t.net_pnl)));
  let cum = 0;
  const series = [...dateBuckets.entries()].map(([d, v]) => { cum += v; return [d, cum]; });
  const lineOpt = {
    backgroundColor: chartTheme.bg, grid: { left: 60, right: 20, top: 20, bottom: 40 },
    tooltip: { trigger: "axis", backgroundColor: "#111", borderColor: chartTheme.border, textStyle: { color: "#eee" }, valueFormatter: (v: number) => inr(v) },
    xAxis: { type: "category", axisLine: { lineStyle: { color: chartTheme.axis } }, data: series.map((s) => s[0]) },
    yAxis: { type: "value", axisLine: { lineStyle: { color: chartTheme.axis } }, splitLine: { lineStyle: { color: chartTheme.border } } },
    series: [{
      type: "line", smooth: true, symbol: "none",
      lineStyle: { color: chartTheme.amber, width: 2 },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(255,176,0,0.35)" }, { offset: 1, color: "rgba(255,176,0,0)" }] } },
      data: series.map((s) => s[1]),
    }],
  };

  // Top gainers/losers by net pnl
  const sorted = [...trades].sort((a, b) => Number(b.net_pnl) - Number(a.net_pnl));
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">PORTFOLIO</div>
          <h1 className="font-mono text-lg">
            <span className="text-amber">{upload.client_name ?? "—"}</span>
            <span className="text-muted-foreground"> · {upload.client_code ?? "—"} · {upload.period_from} → {upload.period_to}</span>
          </h1>
        </div>
        <select value={id ?? ""} onChange={(e) => setSelected(e.target.value)}
          className="border border-border bg-surface px-3 py-2 font-mono text-xs">
          {list?.uploads.map((u) => (
            <option key={u.id} value={u.id}>{u.file_name} · {u.period_from} → {u.period_to}</option>
          ))}
        </select>
      </header>

      <div className="grid grid-cols-2 divide-x divide-border border-b border-border md:grid-cols-4 lg:grid-cols-8">
        <Kpi l="Realized P&L" v={inr(Number(upload.realized_pnl), { sign: true })} cls={pnlColor(Number(upload.realized_pnl))} />
        <Kpi l="Net P&L" v={inr(Number(upload.net_pnl), { sign: true })} cls={pnlColor(Number(upload.net_pnl))} />
        <Kpi l="Total Charges" v={inr(Number(upload.charges))} />
        <Kpi l="Turnover" v={inr(totalTurnover, { compact: true })} cls="text-amber" />
        <Kpi l="Profit %" v={pct(profitPct)} cls={pnlColor(profitPct)} />
        <Kpi l="Win/Loss" v={isFinite(wlr) ? wlr.toFixed(2) : "∞"} />
        <Kpi l="Avg Trade" v={inr(avgTrade, { compact: true })} />
        <Kpi l="Trades" v={String(trades.length)} cls="text-cyan" />
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <section className="panel lg:col-span-2">
          <div className="panel-header"><span><span className="label">CUMULATIVE</span> NET P&L</span><span>{series.length} pts</span></div>
          <div className="p-2"><ReactECharts option={lineOpt} style={{ height: 280 }} /></div>
        </section>
        <section className="panel">
          <div className="panel-header"><span className="label">CHARGES</span></div>
          <div className="p-2"><ReactECharts option={chargesOpt} style={{ height: 280 }} /></div>
        </section>

        <section className="panel lg:col-span-2">
          <div className="panel-header"><span className="label">TURNOVER · BY SEGMENT</span></div>
          <div className="p-2"><ReactECharts option={turnoverOpt} style={{ height: 240 }} /></div>
        </section>

        <section className="panel">
          <div className="panel-header"><span className="label">TOP GAINERS / LOSERS</span></div>
          <div className="grid grid-cols-1 divide-y divide-border">
            <div>
              {top.map((t) => (
                <Row key={"g"+t.id} name={t.script_name} v={Number(t.net_pnl)} />
              ))}
            </div>
            <div>
              {bottom.map((t) => (
                <Row key={"l"+t.id} name={t.script_name} v={Number(t.net_pnl)} />
              ))}
            </div>
          </div>
        </section>

        <section className="panel lg:col-span-3">
          <div className="panel-header"><span className="label">INSTRUMENT HEATMAP</span><span>by underlying / week</span></div>
          <Heatmap trades={trades} />
        </section>
      </div>
    </div>
  );
}

function Kpi({ l, v, cls = "text-foreground" }: { l: string; v: string; cls?: string }) {
  return (
    <div className="px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
      <div className={`mt-1 num text-xl font-semibold ${cls}`}>{v}</div>
    </div>
  );
}

function Row({ name, v }: { name: string; v: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs">
      <span className="truncate font-mono text-foreground">{name}</span>
      <span className={`num ${pnlColor(v)}`}>{inr(v, { sign: true })}</span>
    </div>
  );
}

function Heatmap({ trades }: { trades: Array<{ underlying: string | null; expiry: string | null; net_pnl: number | null }> }) {
  // group by underlying x expiry-week
  const map = new Map<string, Map<string, number>>();
  const undSet = new Set<string>(); const wkSet = new Set<string>();
  for (const t of trades) {
    const u = t.underlying ?? "OTHER";
    const wk = t.expiry ? t.expiry.slice(0, 7) : "—";
    undSet.add(u); wkSet.add(wk);
    if (!map.has(u)) map.set(u, new Map());
    const m = map.get(u)!;
    m.set(wk, (m.get(wk) ?? 0) + Number(t.net_pnl ?? 0));
  }
  const unds = [...undSet].sort();
  const wks = [...wkSet].sort();
  const data: [number, number, number][] = [];
  unds.forEach((u, i) => wks.forEach((w, j) => {
    const v = map.get(u)?.get(w);
    if (v !== undefined) data.push([j, i, +v.toFixed(0)]);
  }));
  const max = Math.max(1, ...data.map((d) => Math.abs(d[2])));
  const opt = {
    backgroundColor: chartTheme.bg, grid: { left: 100, right: 30, top: 10, bottom: 80 },
    tooltip: { backgroundColor: "#111", borderColor: chartTheme.border, textStyle: { color: "#eee" },
      formatter: (p: { value: [number, number, number] }) => `${unds[p.value[1]]} · ${wks[p.value[0]]}<br/>${inr(p.value[2], { sign: true })}` },
    xAxis: { type: "category", data: wks, axisLine: { lineStyle: { color: chartTheme.axis } }, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: "category", data: unds, axisLine: { lineStyle: { color: chartTheme.axis } }, axisLabel: { fontSize: 10 } },
    visualMap: { min: -max, max, calculable: false, orient: "horizontal", left: "center", bottom: 10,
      inRange: { color: ["#ef4444", "#7f1d1d", "#1f1f1f", "#14532d", "#22c55e"] }, textStyle: { color: chartTheme.axis } },
    series: [{ type: "heatmap", data, itemStyle: { borderColor: "#0d0d0d", borderWidth: 1 } }],
  };
  return <div className="p-2"><ReactECharts option={opt} style={{ height: 360 }} /></div>;
}
