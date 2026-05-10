import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const tradeSchema = z.object({
  script_name: z.string().min(1).max(500),
  security_type: z.string().nullable(),
  underlying: z.string().nullable(),
  expiry: z.string().nullable(),
  option_type: z.string().nullable(),
  strike: z.number().nullable(),
  isin: z.string().nullable(),
  qty: z.number(),
  buy_amt: z.number(),
  sell_amt: z.number(),
  total_pnl: z.number(),
  gst: z.number(),
  brokerage: z.number(),
  misc: z.number(),
  stt_ctt: z.number(),
  total_charges: z.number(),
  gross_realized_pnl: z.number(),
  net_pnl: z.number(),
  gross_pnl_excl_charges: z.number(),
  intraday_pnl: z.number(),
  short_term_pnl: z.number(),
  long_term_pnl: z.number(),
});

const inputSchema = z.object({
  upload: z.object({
    file_name: z.string().min(1).max(255),
    storage_path: z.string().nullable(),
    client_name: z.string().nullable(),
    client_code: z.string().nullable(),
    period_from: z.string().nullable(),
    period_to: z.string().nullable(),
    realized_pnl: z.number(),
    net_pnl: z.number(),
    charges: z.number(),
    turnover_equity_delivery: z.number(),
    turnover_equity_intraday: z.number(),
    turnover_futures: z.number(),
    turnover_options: z.number(),
    charges_brokerage: z.number(),
    charges_gst: z.number(),
    charges_misc: z.number(),
    charges_stt_ctt: z.number(),
    raw_summary: z.record(z.string(), z.string()).nullable(),
  }),
  trades: z.array(tradeSchema).max(20000),
});

export const saveUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: up, error } = await supabaseAdmin
      .from("uploads")
      .insert({ ...data.upload })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.trades.length) {
      const rows = data.trades.map((t) => ({ ...t, upload_id: up.id }));
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error: e2 } = await supabaseAdmin.from("trades").insert(chunk);
        if (e2) throw new Error(e2.message);
      }
    }
    return { id: up.id };
  });

export const listUploads = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("uploads")
      .select("id, file_name, client_name, client_code, period_from, period_to, realized_pnl, net_pnl, charges, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { uploads: data ?? [] };
  });

export const getUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string | null }) => ({ id: d.id ?? null }))
  .handler(async ({ data }) => {
    let id = data.id;
    if (!id) {
      const { data: latest } = await supabaseAdmin
        .from("uploads").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
      id = latest?.id ?? null;
    }
    if (!id) return { upload: null, trades: [] };

    const { data: upload, error } = await supabaseAdmin.from("uploads").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    const { data: trades, error: e2 } = await supabaseAdmin.from("trades").select("*").eq("upload_id", id);
    if (e2) throw new Error(e2.message);
    return { upload, trades: trades ?? [] };
  });

export const deleteUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("uploads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
