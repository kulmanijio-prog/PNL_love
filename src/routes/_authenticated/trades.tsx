import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getUpload, listUploads } from "@/lib/uploads.functions";
import { inr, pnlColor } from "@/lib/format";
import { Download, FileDown, Filter, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trades")({
  head: () => ({ meta: [{ title: "Trades · TERMINAL" }] }),
  component: TradesPage,
});

type Trade = {
  id: string; script_name: string; security_type: string | null; underlying: string | null;
  expiry: string | null; option_type: string | null; strike: number | null;
  qty: number | null; buy_amt: number | null; sell_amt: number | null;
  total_pnl: number | null; gst: number | null; brokerage: number | null;
  misc: number | null; stt_ctt: number | null; total_charges: number | null;
  gross_realized_pnl: number | null; net_pnl: number | null; gross_pnl_excl_charges: number | null;
  intraday_pnl: number | null; short_term_pnl: number | null; long_term_pnl: number | null;
};

function TradesPage() {
  const listFn = useServerFn(listUploads);
  const getFn = useServerFn(getUpload);
  const { data: list } = useQuery({ queryKey: ["uploads"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string | null>(null);
  const id = selected ?? list?.uploads[0]?.id ?? null;
  const { data } = useQuery({ queryKey: ["upload", id], queryFn: () => getFn({ data: { id } }), enabled: list !== undefined });

  const trades = (data?.trades ?? []) as Trade[];
  const upload = data?.upload;

  const [q, setQ] = useState("");
  const [secType, setSecType] = useState<string>("ALL");
  const [under, setUnder] = useState<string>("ALL");
  const [opt, setOpt] = useState<string>("ALL");
  const [pnlSide, setPnlSide] = useState<"ALL" | "POS" | "NEG">("ALL");
  const [drilldown, setDrilldown] = useState<Trade | null>(null);

  const undList = useMemo(() => Array.from(new Set(trades.map((t) => t.underlying).filter(Boolean))) as string[], [trades]);
  const secList = useMemo(() => Array.from(new Set(trades.map((t) => t.security_type).filter(Boolean))) as string[], [trades]);

  const filtered = useMemo(() => trades.filter((t) => {
    if (q && !t.script_name.toLowerCase().includes(q.toLowerCase())) return false;
    if (secType !== "ALL" && t.security_type !== secType) return false;
    if (under !== "ALL" && t.underlying !== under) return false;
    if (opt !== "ALL" && (t.option_type ?? "—") !== opt) return false;
    const n = Number(t.net_pnl);
    if (pnlSide === "POS" && n <= 0) return false;
    if (pnlSide === "NEG" && n >= 0) return false;
    return true;
  }), [trades, q, secType, under, opt, pnlSide]);

  const totals = useMemo(() => filtered.reduce((a, t) => ({
    qty: a.qty + Number(t.qty ?? 0),
    buy: a.buy + Number(t.buy_amt ?? 0),
    sell: a.sell + Number(t.sell_amt ?? 0),
    charges: a.charges + Number(t.total_charges ?? 0),
    net: a.net + Number(t.net_pnl ?? 0),
  }), { qty: 0, buy: 0, sell: 0, charges: 0, net: 0 }), [filtered]);

  const exportCSV = () => {
    const rows = filtered.map((t) => ({
      Script: t.script_name, Type: t.security_type, Underlying: t.underlying, Expiry: t.expiry,
      Strike: t.strike, OptionType: t.option_type, Qty: t.qty, Buy: t.buy_amt, Sell: t.sell_amt,
      Brokerage: t.brokerage, GST: t.gst, Misc: t.misc, "STT/CTT": t.stt_ctt, Charges: t.total_charges,
      Gross: t.gross_realized_pnl, Net: t.net_pnl,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Trades");
    XLSX.writeFile(wb, `trades-${upload?.client_code ?? "export"}.csv`, { bookType: "csv" });
  };
  const exportXLSX = () => {
    const rows = filtered.map((t) => ({
      Script: t.script_name, Type: t.security_type, Underlying: t.underlying, Expiry: t.expiry,
      Strike: t.strike, OptionType: t.option_type, Qty: t.qty, Buy: t.buy_amt, Sell: t.sell_amt,
      Brokerage: t.brokerage, GST: t.gst, Misc: t.misc, "STT/CTT": t.stt_ctt, Charges: t.total_charges,
      Gross: t.gross_realized_pnl, Net: t.net_pnl,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Trades");
    XLSX.writeFile(wb, `trades-${upload?.client_code ?? "export"}.xlsx`);
  };
  const exportTax = () => {
    if (!upload) return;
    const summary = [
      ["TAX-READY SUMMARY"], ["Disclaimer: STT/CTT excluded per Income Tax rules."], [],
      ["Client", upload.client_name], ["Code", upload.client_code], ["Period", `${upload.period_from} → ${upload.period_to}`], [],
      ["Realized P&L", upload.realized_pnl], ["Net P&L (incl charges)", upload.net_pnl],
      ["Total Charges (excl STT/CTT)", Number(upload.charges) - Number(upload.charges_stt_ctt)],
      ["Brokerage", upload.charges_brokerage], ["GST", upload.charges_gst], ["Misc", upload.charges_misc],
    ];
    const tradeRows = filtered.map((t) => ({
      Script: t.script_name, Type: t.security_type, Expiry: t.expiry, Qty: t.qty,
      Buy: t.buy_amt, Sell: t.sell_amt, Brokerage: t.brokerage, GST: t.gst, Misc: t.misc,
      ChargesExclSTT: Number(t.total_charges ?? 0) - Number(t.stt_ctt ?? 0),
      Intraday: t.intraday_pnl, ShortTerm: t.short_term_pnl, LongTerm: t.long_term_pnl,
      NetExclSTT: Number(t.net_pnl ?? 0) + Number(t.stt_ctt ?? 0),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tradeRows), "Trades");
    XLSX.writeFile(wb, `tax-summary-${upload.client_code ?? "export"}.xlsx`);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// TRADES</div>
          <h1 className="font-mono text-base text-amber">{filtered.length} of {trades.length} trades</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={id ?? ""} onChange={(e) => setSelected(e.target.value)} className="border border-border bg-surface px-2 py-1 font-mono text-xs">
            {list?.uploads.map((u) => <option key={u.id} value={u.id}>{u.file_name}</option>)}
          </select>
          <button onClick={exportCSV} className="inline-flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:border-amber/60"><Download className="h-3 w-3" /> CSV</button>
          <button onClick={exportXLSX} className="inline-flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:border-amber/60"><Download className="h-3 w-3" /> XLSX</button>
          <button onClick={exportTax} className="inline-flex items-center gap-1 border border-amber bg-amber/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber hover:bg-amber/20"><FileDown className="h-3 w-3" /> Tax summary</button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2 px-6 py-2 font-mono text-xs">
        <Filter className="h-3 w-3 text-amber" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search script…" className="w-48 border border-border bg-background px-2 py-1 focus:border-amber focus:outline-none" />
        <select value={secType} onChange={(e) => setSecType(e.target.value)} className="border border-border bg-background px-2 py-1">
          <option value="ALL">all types</option>
          {secList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={under} onChange={(e) => setUnder(e.target.value)} className="border border-border bg-background px-2 py-1">
          <option value="ALL">all underlyings</option>
          {undList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={opt} onChange={(e) => setOpt(e.target.value)} className="border border-border bg-background px-2 py-1">
          <option value="ALL">CE+PE+future</option>
          <option value="CE">CE</option><option value="PE">PE</option><option value="—">future/eq</option>
        </select>
        <select value={pnlSide} onChange={(e) => setPnlSide(e.target.value as "ALL" | "POS" | "NEG")} className="border border-border bg-background px-2 py-1">
          <option value="ALL">all P&L</option>
          <option value="POS">winners</option>
          <option value="NEG">losers</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-2 font-mono uppercase text-[10px] tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Script</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-left">Under</th>
              <th className="px-2 py-2 text-left">Expiry</th>
              <th className="px-2 py-2 text-right">Strike</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Buy</th>
              <th className="px-2 py-2 text-right">Sell</th>
              <th className="px-2 py-2 text-right">Charges</th>
              <th className="px-2 py-2 text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {filtered.map((t) => (
              <tr key={t.id} onClick={() => setDrilldown(t)} className="cursor-pointer border-b border-border hover:bg-surface-2/50">
                <td className="px-3 py-1.5">{t.script_name}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{t.security_type ?? "—"}</td>
                <td className="px-2 py-1.5 text-cyan">{t.underlying ?? "—"}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{t.expiry ?? "—"}</td>
                <td className="num px-2 py-1.5 text-right">{t.strike ?? "—"}</td>
                <td className="num px-2 py-1.5 text-right">{t.qty}</td>
                <td className="num px-2 py-1.5 text-right">{inr(Number(t.buy_amt))}</td>
                <td className="num px-2 py-1.5 text-right">{inr(Number(t.sell_amt))}</td>
                <td className="num px-2 py-1.5 text-right text-muted-foreground">{inr(Number(t.total_charges))}</td>
                <td className={`num px-2 py-1.5 text-right ${pnlColor(Number(t.net_pnl))}`}>{inr(Number(t.net_pnl), { sign: true })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface-2 font-mono text-xs">
            <tr className="border-t-2 border-amber/40">
              <td className="px-3 py-2 uppercase tracking-wider text-amber">TOTAL</td>
              <td colSpan={4}></td>
              <td className="num px-2 py-2 text-right">{totals.qty}</td>
              <td className="num px-2 py-2 text-right">{inr(totals.buy)}</td>
              <td className="num px-2 py-2 text-right">{inr(totals.sell)}</td>
              <td className="num px-2 py-2 text-right">{inr(totals.charges)}</td>
              <td className={`num px-2 py-2 text-right ${pnlColor(totals.net)}`}>{inr(totals.net, { sign: true })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {drilldown && <Drilldown trade={drilldown} onClose={() => setDrilldown(null)} />}
    </div>
  );
}

function Drilldown({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-md border-l border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span><span className="label">DRILLDOWN</span> · {trade.script_name}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-loss"><X className="h-3 w-3" /></button>
        </div>
        <div className="space-y-4 p-5 font-mono text-xs">
          <Section title="META" rows={[
            ["Underlying", trade.underlying ?? "—"], ["Type", trade.security_type ?? "—"],
            ["Expiry", trade.expiry ?? "—"], ["Option", trade.option_type ?? "—"],
            ["Strike", String(trade.strike ?? "—")], ["Qty", String(trade.qty ?? 0)],
          ]} />
          <Section title="TURNOVER" rows={[
            ["Buy", inr(Number(trade.buy_amt))], ["Sell", inr(Number(trade.sell_amt))],
          ]} />
          <Section title="CHARGES" rows={[
            ["Brokerage", inr(Number(trade.brokerage))], ["GST", inr(Number(trade.gst))],
            ["Misc", inr(Number(trade.misc))], ["STT/CTT", inr(Number(trade.stt_ctt))],
            ["Total", inr(Number(trade.total_charges))],
          ]} />
          <Section title="P&L SPLIT" rows={[
            ["Intraday", inr(Number(trade.intraday_pnl), { sign: true })],
            ["< 1 yr", inr(Number(trade.short_term_pnl), { sign: true })],
            ["> 1 yr", inr(Number(trade.long_term_pnl), { sign: true })],
            ["Gross excl charges", inr(Number(trade.gross_pnl_excl_charges), { sign: true })],
            ["Gross realized", inr(Number(trade.gross_realized_pnl), { sign: true })],
            ["Net P&L", inr(Number(trade.net_pnl), { sign: true })],
          ]} highlight />
        </div>
      </div>
    </div>
  );
}

function Section({ title, rows, highlight }: { title: string; rows: [string, string][]; highlight?: boolean }) {
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-widest text-amber">{title}</div>
      <div className="divide-y divide-border border border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-3 py-1.5">
            <span className="text-muted-foreground">{k}</span>
            <span className={`num ${highlight && (v.startsWith("+") ? "text-profit" : v.startsWith("-") ? "text-loss" : "")}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
