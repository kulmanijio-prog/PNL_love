import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useServerFn } from "@tanstack/react-start";
import { saveUpload } from "@/lib/uploads.functions";
import { parseKotakFile, type ParseResult } from "@/lib/parse-kotak";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, CheckCircle2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Import · TERMINAL" }] }),
  component: UploadPage,
});

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const saveFn = useServerFn(saveUpload);

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0]; if (!f) return;
    setError(null); setFile(f); setParsed(null);
    try {
      const res = await parseKotakFile(f);
      if (!res.trades.length) throw new Error("No trades found. Is this a Kotak gain/loss file?");
      setParsed(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Parse failed");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  const confirm = async () => {
    if (!parsed || !file) return;
    setBusy(true);
    try {
      // Upload original file to storage
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      let storagePath: string | null = null;
      if (userId) {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("reports").upload(path, file, { upsert: false });
        if (!upErr) storagePath = path;
      }

      const result = await saveFn({
        data: {
          upload: {
            file_name: file.name,
            storage_path: storagePath,
            client_name: parsed.summary.client_name,
            client_code: parsed.summary.client_code,
            period_from: parsed.summary.period_from,
            period_to: parsed.summary.period_to,
            realized_pnl: parsed.summary.realized_pnl,
            net_pnl: parsed.summary.net_pnl,
            charges: parsed.summary.charges,
            turnover_equity_delivery: parsed.summary.turnover_equity_delivery,
            turnover_equity_intraday: parsed.summary.turnover_equity_intraday,
            turnover_futures: parsed.summary.turnover_futures,
            turnover_options: parsed.summary.turnover_options,
            charges_brokerage: parsed.summary.charges_brokerage,
            charges_gst: parsed.summary.charges_gst,
            charges_misc: parsed.summary.charges_misc,
            charges_stt_ctt: parsed.summary.charges_stt_ctt,
            raw_summary: parsed.summary.raw_summary,
          },
          trades: parsed.trades,
        },
      });
      toast.success(`Saved ${parsed.trades.length} trades`);
      navigate({ to: "/dashboard", search: { id: result.id } as never });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6">
      <header className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// IMPORT</div>
        <h1 className="font-mono text-lg text-amber">Drop a gain/loss report</h1>
      </header>

      {!parsed && (
        <div {...getRootProps()}
          className={`flex h-72 cursor-pointer flex-col items-center justify-center border border-dashed text-center transition ${
            isDragActive ? "border-amber bg-amber/5" : "border-border bg-surface hover:border-amber/60"
          }`}>
          <input {...getInputProps()} />
          <UploadCloud className={`h-10 w-10 ${isDragActive ? "text-amber" : "text-muted-foreground"}`} />
          <div className="mt-3 font-mono text-sm uppercase tracking-widest">{isDragActive ? "Release to parse" : "Drop .xlsx / .csv here"}</div>
          <div className="mt-1 text-xs text-muted-foreground">or click to browse · Kotak gain/loss reports supported</div>
          {error && <div className="mt-3 font-mono text-xs text-loss">{error}</div>}
        </div>
      )}

      {parsed && (
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-header">
              <span className="flex items-center gap-2"><FileSpreadsheet className="h-3 w-3 text-amber" /><span className="label">PARSED</span> {file?.name}</span>
              <button onClick={() => { setParsed(null); setFile(null); }} className="text-muted-foreground hover:text-loss"><X className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
              {[
                ["Client", parsed.summary.client_name ?? "—"],
                ["Code", parsed.summary.client_code ?? "—"],
                ["Period", `${parsed.summary.period_from ?? "?"} → ${parsed.summary.period_to ?? "?"}`],
                ["Trades", String(parsed.trades.length)],
                ["Realized P&L", inr(parsed.summary.realized_pnl, { sign: true })],
                ["Net P&L", inr(parsed.summary.net_pnl, { sign: true })],
                ["Charges", inr(parsed.summary.charges)],
                ["Turnover Total", inr(parsed.summary.turnover_equity_delivery + parsed.summary.turnover_equity_intraday + parsed.summary.turnover_futures + parsed.summary.turnover_options, { compact: true })],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="num mt-1 text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span className="label">PREVIEW · FIRST 20 TRADES</span></div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-2 font-mono uppercase text-[10px] tracking-wider text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Script</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Buy</th><th className="px-3 py-2 text-right">Sell</th><th className="px-3 py-2 text-right">Net P&L</th></tr>
                </thead>
                <tbody className="font-mono">
                  {parsed.trades.slice(0, 20).map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5">{t.script_name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{t.security_type ?? "—"}</td>
                      <td className="num px-3 py-1.5 text-right">{inr(t.buy_amt)}</td>
                      <td className="num px-3 py-1.5 text-right">{inr(t.sell_amt)}</td>
                      <td className={`num px-3 py-1.5 text-right ${t.net_pnl >= 0 ? "text-profit" : "text-loss"}`}>{inr(t.net_pnl, { sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={busy} onClick={confirm}
              className="inline-flex items-center gap-2 border border-amber bg-amber px-4 py-2 font-mono text-xs uppercase tracking-widest text-background hover:bg-amber/90 disabled:opacity-50">
              <CheckCircle2 className="h-3 w-3" /> {busy ? "Saving…" : "Confirm & save"}
            </button>
            <button onClick={() => { setParsed(null); setFile(null); }} className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest hover:border-amber/60">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
