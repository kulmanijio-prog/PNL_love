import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUploads, deleteUpload } from "@/lib/uploads.functions";
import { inr, pnlColor } from "@/lib/format";
import { Trash2, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/uploads")({
  head: () => ({ meta: [{ title: "Reports · TERMINAL" }] }),
  component: UploadsPage,
});

function UploadsPage() {
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

  return (
    <div className="p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// REPORTS</div>
          <h1 className="font-mono text-lg text-amber">Imported reports</h1>
        </div>
        <Link to="/upload" className="inline-flex items-center gap-1 border border-amber bg-amber px-3 py-2 font-mono text-xs uppercase tracking-widest text-background">
          <Plus className="h-3 w-3" /> Import
        </Link>
      </header>

      <div className="panel">
        <div className="panel-header"><span className="label">{data?.uploads.length ?? 0} REPORTS</span></div>
        {isLoading && <div className="p-6 font-mono text-xs text-muted-foreground">LOADING…</div>}
        {data && data.uploads.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No reports yet.</div>}
        <table className="w-full text-xs">
          <tbody className="font-mono">
            {data?.uploads.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><FileSpreadsheet className="inline h-3 w-3 text-amber" /></td>
                <td className="px-2 py-3">{u.file_name}</td>
                <td className="px-2 py-3 text-muted-foreground">{u.client_name} <span className="text-cyan">{u.client_code}</span></td>
                <td className="px-2 py-3 text-muted-foreground">{u.period_from} → {u.period_to}</td>
                <td className={`num px-2 py-3 text-right ${pnlColor(Number(u.net_pnl))}`}>{inr(Number(u.net_pnl), { sign: true })}</td>
                <td className="px-2 py-3 text-right">
                  <button onClick={() => remove(u.id)} className="text-muted-foreground hover:text-loss"><Trash2 className="h-3 w-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
