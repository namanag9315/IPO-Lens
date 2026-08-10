# IPO Lens

## Automatic Public Data Sync

IPO Lens supports Vercel Cron for automatic GMP and subscription updates. Cron routes use `GET` and require `CRON_SECRET` in the `Authorization` header. Both `Authorization: Bearer <CRON_SECRET>` and `Authorization: <CRON_SECRET>` are accepted.

Local tests:

```bash
curl http://localhost:3000/api/cron/sync-gmp \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl http://localhost:3000/api/cron/sync-subscription \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl http://localhost:3000/api/cron/sync-public-data \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected behavior:

- Wrong or missing secret returns `401`.
- Correct secret returns `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, or `SKIPPED`.
- Sync summaries are written to `ipo_data_sync_logs`.
- Snapshot tables update when providers return new matchable data.

Production checklist:

1. Add `CRON_SECRET` in Vercel environment variables.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
3. Deploy to production.
4. Check Vercel dashboard -> Cron Jobs.
5. Check `/admin/sync` for latest sync logs.
6. Verify `ipo_gmp_snapshots` and `ipo_subscription_snapshots` are updating.
7. Verify IPO detail pages show latest source, timestamp, and freshness.

Manual sync remains available from `/admin/sync`. Admin buttons call protected admin routes and never expose `CRON_SECRET` or the Supabase service-role key to the browser.
