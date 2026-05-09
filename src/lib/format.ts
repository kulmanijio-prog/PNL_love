export const inr = (n: number | null | undefined, opts: { sign?: boolean; compact?: boolean } = {}) => {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return "0";
  const abs = Math.abs(v);
  let body: string;
  if (opts.compact && abs >= 1e7) body = (v / 1e7).toFixed(2) + " Cr";
  else if (opts.compact && abs >= 1e5) body = (v / 1e5).toFixed(2) + " L";
  else if (opts.compact && abs >= 1e3) body = (v / 1e3).toFixed(2) + " K";
  else body = v.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  if (opts.sign && v > 0) return "+" + body;
  return body;
};

export const pct = (n: number | null | undefined, digits = 2) => {
  const v = Number(n ?? 0);
  return (v >= 0 ? "+" : "") + v.toFixed(digits) + "%";
};

export const pnlColor = (n: number) => (n > 0 ? "text-profit" : n < 0 ? "text-loss" : "text-muted-foreground");
