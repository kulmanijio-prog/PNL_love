import * as XLSX from "xlsx";

export interface ParsedSummary {
  client_name: string | null;
  client_code: string | null;
  period_from: string | null;
  period_to: string | null;
  realized_pnl: number;
  net_pnl: number;
  charges: number;
  turnover_equity_delivery: number;
  turnover_equity_intraday: number;
  turnover_futures: number;
  turnover_options: number;
  charges_brokerage: number;
  charges_gst: number;
  charges_misc: number;
  charges_stt_ctt: number;
  raw_summary: Record<string, string>;
}

export interface ParsedTrade {
  script_name: string;
  security_type: string | null;
  underlying: string | null;
  expiry: string | null;
  option_type: string | null;
  strike: number | null;
  isin: string | null;
  qty: number;
  buy_amt: number;
  sell_amt: number;
  total_pnl: number;
  gst: number;
  brokerage: number;
  misc: number;
  stt_ctt: number;
  total_charges: number;
  gross_realized_pnl: number;
  net_pnl: number;
  gross_pnl_excl_charges: number;
  intraday_pnl: number;
  short_term_pnl: number;
  long_term_pnl: number;
}

export interface ParseResult {
  summary: ParsedSummary;
  trades: ParsedTrade[];
}

const num = (v: unknown): number => {
  if (v == null || v === "" || v === "-") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

const monthMap: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

// e.g. "SENSEX 16Apr26 CE 77800", "NIFTY 26May26 XX 0", "BHEL 26May26 PE 350"
function parseScript(name: string) {
  const m = name.match(/^([A-Z0-9&]+)\s+(\d{1,2})([A-Za-z]{3})(\d{2,4})\s+(CE|PE|XX)\s+(\d+(?:\.\d+)?)$/);
  if (!m) return { underlying: null, expiry: null, option_type: null, strike: null };
  const [, under, dd, mon, yy, opt, strike] = m;
  const month = monthMap[mon as keyof typeof monthMap];
  if (!month) return { underlying: under, expiry: null, option_type: null, strike: num(strike) };
  const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
  const date = `${year}-${String(month).padStart(2, "0")}-${dd.padStart(2, "0")}`;
  return {
    underlying: under,
    expiry: date,
    option_type: opt === "XX" ? null : opt,
    strike: num(strike),
  };
}

function parsePeriod(s: string): { from: string | null; to: string | null } {
  const m = s.match(/From\s*:\s*(\d{4}-\d{2}-\d{2}).*To\s*:\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return { from: null, to: null };
  return { from: m[1], to: m[2] };
}

export async function parseKotakFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // Sheet 1: Summary key/value
  const s1 = wb.Sheets[wb.SheetNames[0]];
  const rows1 = XLSX.utils.sheet_to_json<unknown[]>(s1, { header: 1, defval: "" });
  const kv: Record<string, string> = {};
  for (const r of rows1) {
    for (let i = 0; i < r.length - 1; i += 2) {
      const k = String(r[i] ?? "").trim();
      const v = String(r[i + 1] ?? "").trim();
      if (k && v && !kv[k]) kv[k] = v;
    }
  }

  const period = parsePeriod(kv["Transaction Period"] ?? "");
  const summary: ParsedSummary = {
    client_name: kv["Client Name"] ?? null,
    client_code: kv["Client Code"] ?? null,
    period_from: period.from,
    period_to: period.to,
    realized_pnl: num(kv["Realised P&L"] ?? kv["Realized P&L"]),
    net_pnl: num(kv["Net P&L"]),
    charges: num(kv["Charges"]),
    turnover_equity_delivery: num(kv["Equity Delivery Turnover"]),
    turnover_equity_intraday: num(kv["Equity Intraday Turnover"]),
    turnover_futures: num(kv["Futures Turnover"]),
    turnover_options: num(kv["Options Turnover"]),
    charges_brokerage: 0,
    charges_gst: 0,
    charges_misc: 0,
    charges_stt_ctt: 0,
    raw_summary: kv,
  };

  // Sheet 2: Trade table. Find header row, then read columns
  const trades: ParsedTrade[] = [];
  for (let si = 1; si < wb.SheetNames.length; si++) {
    const ws = wb.Sheets[wb.SheetNames[si]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    // locate header row containing "Script Name"
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].map((c) => String(c ?? "").trim());
      if (cells.some((c) => c === "Script Name")) { headerIdx = i; break; }
    }
    if (headerIdx === -1) continue;

    // Column mapping. Kotak format has 2 header rows. Build by scanning combined headers.
    const h1 = rows[headerIdx].map((c) => String(c ?? "").replace(/\s+/g, " ").trim());
    const h2 = (rows[headerIdx + 1] || []).map((c) => String(c ?? "").replace(/\s+/g, " ").trim());
    const headers = h1.map((a, i) => (a + " " + (h2[i] || "")).trim());

    const colOf = (...needles: string[]) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase();
        if (needles.every((n) => h.includes(n.toLowerCase()))) return i;
      }
      return -1;
    };
    const C = {
      script: colOf("script", "name"),
      sec: colOf("security", "type"),
      isin: colOf("isin"),
      qty: colOf("qty"),
      buy: colOf("buy", "amt"),
      sell: colOf("sell", "amt"),
      intraday: colOf("intraday"),
      lt1: colOf("<1yr"),
      gt1: colOf(">1yr"),
      total: colOf("total"),
      gst: colOf("gst"),
      brk: colOf("brokerage"),
      misc: colOf("misc"),
      stt: colOf("stt"),
      totch: colOf("total", "c + d"),
      gross_real: colOf("gross", "realized"),
      net: colOf("net", "p&l"),
      gross_excl: colOf("gross", "excluding"),
    };

    let dataStart = headerIdx + 1;
    // skip rows that are subheaders (no script)
    while (dataStart < rows.length) {
      const v = String(rows[dataStart][C.script] ?? "").trim();
      if (v && v !== "Script Name" && !/^Total/i.test(v)) break;
      dataStart++;
    }

    let chargeBrk = 0, chargeGst = 0, chargeMisc = 0, chargeStt = 0;

    for (let i = dataStart; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r[C.script] ?? "").trim();
      if (!name) continue;
      if (/^Total/i.test(name) || name.toLowerCase().includes("grand total")) continue;
      const sec = String(r[C.sec] ?? "").trim() || null;
      if (!sec && !name.match(/\d/)) continue;
      const meta = parseScript(name);
      const t: ParsedTrade = {
        script_name: name,
        security_type: sec,
        underlying: meta.underlying,
        expiry: meta.expiry,
        option_type: meta.option_type,
        strike: meta.strike,
        isin: C.isin >= 0 ? (String(r[C.isin] ?? "").trim() || null) : null,
        qty: num(r[C.qty]),
        buy_amt: num(r[C.buy]),
        sell_amt: num(r[C.sell]),
        intraday_pnl: num(r[C.intraday]),
        short_term_pnl: num(r[C.lt1]),
        long_term_pnl: num(r[C.gt1]),
        total_pnl: num(r[C.total]),
        gst: num(r[C.gst]),
        brokerage: num(r[C.brk]),
        misc: num(r[C.misc]),
        stt_ctt: num(r[C.stt]),
        total_charges: num(r[C.totch]),
        gross_realized_pnl: num(r[C.gross_real]),
        net_pnl: num(r[C.net]),
        gross_pnl_excl_charges: num(r[C.gross_excl]),
      };
      trades.push(t);
      chargeBrk += t.brokerage;
      chargeGst += t.gst;
      chargeMisc += t.misc;
      chargeStt += t.stt_ctt;
    }

    summary.charges_brokerage = chargeBrk;
    summary.charges_gst = chargeGst;
    summary.charges_misc = chargeMisc;
    summary.charges_stt_ctt = chargeStt;
  }

  return { summary, trades };
}
