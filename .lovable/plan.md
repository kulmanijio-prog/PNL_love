
# Security Analysis & Portfolio P&L Dashboard

A dark, terminal-inspired web app for traders to upload Kotak-style gain/loss reports and analyze realized/net P&L, turnover, charges, and trade-wise breakdowns.

## Scope (v1)

Single-client dashboard: upload one Excel/CSV report, parse it, persist per user, and explore via KPIs, charts, and a filterable trade table. Multi-client compare is deferred to v2.

## Key user flows

1. Sign up / log in (email+password, Google).
2. Upload a Kotak gain/loss `.xlsx` or `.csv`. File is parsed in-browser, normalized rows saved to Cloud, file blob saved to Storage.
3. Land on Dashboard for the most recent upload (switchable from a sidebar list of past uploads).
4. View summary KPIs, charts, and trade table. Drill into an instrument. Export filtered trades to CSV/Excel. Download tax-ready summary (excludes STT/CTT).

## Pages / routes

```
/                       Marketing landing (hero, features, CTA → /login)
/login                  Email+password + Google
/_authenticated/
  dashboard             KPI cards + charts (default view of latest upload)
  trades                Full trade table with filters, drilldown drawer
  uploads               List of past uploads, set active, delete
  upload                Drag-drop importer with parse preview & confirm
  settings              Account / sign out
```

## Visual direction — Bloomberg-style dark terminal

- Background `#0a0a0a` / panels `#111` with 1px hairline borders `#1f1f1f`.
- Mono accents: amber `#ffb000` for headings/highlights, cyan `#22d3ee` for links, green `#22c55e` profit, red `#ef4444` loss.
- Type: `JetBrains Mono` for numbers/tables, `Inter` for UI labels.
- Dense data grids, right-aligned numerics with thousands separators, subtle gridlines, no rounded-2xl marketing fluff.
- Tokens defined in `src/styles.css` via `oklch` (background, surface, surface-2, border, profit, loss, accent-amber, accent-cyan, muted).

## Data model (Lovable Cloud)

```
profiles(id uuid pk → auth.users, display_name, created_at)

uploads(
  id uuid pk, user_id uuid, file_name, storage_path,
  client_name, client_code, period_from date, period_to date,
  realized_pnl numeric, net_pnl numeric, charges numeric,
  turnover_equity_delivery, turnover_equity_intraday,
  turnover_futures, turnover_options,
  charges_brokerage, charges_gst, charges_misc, charges_stt_ctt,
  raw_summary jsonb, created_at
)

trades(
  id uuid pk, upload_id uuid fk, user_id uuid,
  script_name, security_type,    -- FUTIDX / OPTIDX / OPTSTK / EQ
  underlying,                    -- NIFTY / SENSEX / BHEL ...
  expiry date, option_type text, -- CE/PE/null
  strike numeric, isin,
  qty numeric, buy_amt, sell_amt,
  total_pnl, gst, brokerage, misc, stt_ctt, total_charges,
  gross_realized_pnl, net_pnl, gross_pnl_excl_charges,
  intraday_pnl, short_term_pnl, long_term_pnl
)
```

RLS: `user_id = auth.uid()` on all rows. `user_roles` table + `has_role()` SECURITY DEFINER helper kept ready (no admin role used yet). Storage bucket `reports` (private) with owner-only RLS.

## Parsing strategy

The Kotak file has two sheets:
- Sheet 1: summary key/value grid (Client Name, Realized P&L, Charges, Turnovers, Period).
- Sheet 2: trade-wise table with header rows, then rows per script (`SENSEX 16Apr26 CE 77800`, security type `IO/FUTIDX/OPTIDX/OPTSTK`, ISIN, Qty, Buy, Sell, Intraday/<1yr/>1yr split, Total, GST, Brokerage, Misc, STT, Total charges, Gross realized, Net, Gross excl charges).

Parser (`src/lib/parse-kotak.ts`) uses `xlsx` (SheetJS) in-browser to:
1. Detect Kotak layout from known summary labels.
2. Extract summary fields into the `uploads` row.
3. Iterate rows of the trades sheet, regex script name → underlying / expiry / CE-PE / strike, coerce numerics.
4. Show a parse preview (counts, totals, first 20 trades). User clicks Confirm → server fn writes upload + trades.

CSV path uses the same normalizer if columns match.

## Dashboard composition

KPI strip (cards with mono numerics):
- Realized P&L, Net P&L, Total Charges, Total Turnover.
- Profit %, Win/Loss ratio, Avg trade size, Trade count.

Charts (ECharts via `echarts-for-react`):
- Time-series of cumulative & daily Net P&L across the period (uses trade-level dates if present, else summary period buckets).
- Horizontal bar — turnover by segment (Equity Delivery / Intraday / Futures / Options).
- Pie — charges composition (Brokerage / GST / Misc / STT-CTT).
- Heatmap — instruments × expiry weeks, color = net P&L (green→red diverging).
- Top gainers / losers list (top 10 each).

## Trades page

- Virtualized table (`@tanstack/react-table`) with columns: Script, Type, Underlying, Expiry, Strike, Qty, Buy, Sell, Gross, Charges, Net.
- Filters: underlying multi-select, security type, expiry range, strike range, P&L sign, full-text on script.
- Row click → drawer showing all charge components and per-period split (intraday / <1y / >1y).
- Buttons: Export filtered → CSV, Export → XLSX, Download tax-ready summary (excludes STT/CTT line, adds disclaimer).

## Server functions

Auth-protected `createServerFn` in `src/lib/`:
- `saveUpload.functions.ts` — insert upload + bulk insert trades (chunked).
- `listUploads.functions.ts`, `getUpload.functions.ts`, `deleteUpload.functions.ts`.
- `getTrades.functions.ts` — paginated, filtered query.
- `exportTaxSummary.functions.ts` — builds XLSX server-side via `xlsx` and returns base64.

Uploaded file blob stored in `reports` bucket for re-parse / audit.

## Tech details

- Stack: TanStack Start (existing), Tailwind v4, shadcn, Lovable Cloud (Supabase under the hood), ECharts, SheetJS (`xlsx`), `@tanstack/react-table`, `react-dropzone`, `zod` for input validation.
- All inputs (filters, file metadata) validated with zod client + server.
- Charts read from already-aggregated columns where possible to keep payloads small.
- ASCII layout sketch:

```text
+----------------------------------------------------------+
| TERMINAL // PORTFOLIO  Shubham K (KSIY0)   Apr–Jun 2026  |
+------------------+------------------+--------------------+
| Realized  +2.91L | Net  +2.77L      | Charges 29,048    |
| Profit %  4.66%  | Win/Loss 1.32    | Turnover 60.3L    |
+------------------+------------------+--------------------+
| [ Cum P&L line chart                                  ]  |
+------------------------+----------------+---------------+
| Turnover by segment    | Charges pie    | Top losers    |
+------------------------+----------------+---------------+
| Heatmap: instruments × expiry                            |
+----------------------------------------------------------+
```

## Out of scope (v2)

Multi-client compare (Shubham vs Kuldeep), scenario/what-if modeler, recurring imports, alerts.

## Build order

1. Enable Lovable Cloud, schema + RLS + storage bucket.
2. Auth (email/password + Google) and `_authenticated` guard.
3. Design tokens + shell layout (sidebar + header).
4. Upload page: dropzone, parser, preview, confirm → save.
5. Dashboard KPIs + ECharts visuals.
6. Trades page with filters, drilldown, exports.
7. Tax-ready summary export with disclaimer.
8. Polish: empty states, errors, loading skeletons, SEO meta.
