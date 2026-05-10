WITH agg AS (
  SELECT
    upload_id,
    SUM(net_pnl) AS net_pnl,
    SUM(COALESCE(NULLIF(total_pnl,0), gross_realized_pnl, net_pnl + total_charges)) AS realized_pnl,
    SUM(COALESCE(NULLIF(total_charges,0), brokerage+gst+misc+stt_ctt)) AS charges,
    SUM(brokerage) AS brk, SUM(gst) AS gst_s, SUM(misc) AS misc_s, SUM(stt_ctt) AS stt_s,
    SUM(CASE WHEN UPPER(COALESCE(security_type,'')) LIKE 'FUT%' THEN buy_amt+sell_amt ELSE 0 END) AS tfut,
    SUM(CASE WHEN UPPER(COALESCE(security_type,'')) LIKE 'OPT%' OR UPPER(COALESCE(security_type,''))='IO' OR (UPPER(COALESCE(security_type,'')) NOT IN ('EQ','BE','EQUITY') AND option_type IS NOT NULL) THEN buy_amt+sell_amt ELSE 0 END) AS topt,
    SUM(CASE WHEN UPPER(COALESCE(security_type,'')) IN ('EQ','BE','EQUITY') AND COALESCE(intraday_pnl,0)<>0 THEN buy_amt+sell_amt ELSE 0 END) AS teqi,
    SUM(CASE WHEN (UPPER(COALESCE(security_type,'')) IN ('EQ','BE','EQUITY') AND COALESCE(intraday_pnl,0)=0) OR (UPPER(COALESCE(security_type,'')) NOT IN ('EQ','BE','EQUITY','IO') AND UPPER(COALESCE(security_type,'')) NOT LIKE 'FUT%' AND UPPER(COALESCE(security_type,'')) NOT LIKE 'OPT%' AND option_type IS NULL) THEN buy_amt+sell_amt ELSE 0 END) AS teqd
  FROM public.trades GROUP BY upload_id
)
UPDATE public.uploads u SET
  net_pnl = a.net_pnl,
  realized_pnl = a.realized_pnl,
  charges = a.charges,
  charges_brokerage = a.brk, charges_gst = a.gst_s, charges_misc = a.misc_s, charges_stt_ctt = a.stt_s,
  turnover_futures = a.tfut, turnover_options = a.topt,
  turnover_equity_intraday = a.teqi, turnover_equity_delivery = a.teqd
FROM agg a WHERE u.id = a.upload_id;