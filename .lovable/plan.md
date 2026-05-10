## Fix script_name length validation error

The Kotak parser is producing `script_name` values longer than 200 characters (likely a concatenated/header-like row), and the zod schema in `saveUpload` rejects them with `too_big` at `trades[205].script_name` and `[206]`.

### Fix
In `src/lib/uploads.functions.ts`, raise the `script_name` cap in `tradeSchema`:

```ts
script_name: z.string().min(1).max(500),
```

500 chars comfortably fits any real instrument name while still bounding input. No DB change needed (column is `text`, unbounded).

### Optional hardening (same file, parser side)
In `src/lib/parse-kotak.ts`, also skip rows whose `script_name` looks like a wrapped/merged header (e.g. contains newlines or is absurdly long) so junk rows don't get persisted:

```ts
if (name.length > 400 || /\n/.test(name)) continue;
```

This keeps the trade table clean even when Kotak's sheet has merged/note rows.

### Result
Re-uploading the same file will succeed; the dashboard and trades pages populate as expected.
