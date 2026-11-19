# Agent status records

Settings > Agents > Agent status reads these records. Agents write one after every run, even a failed one.

| Agent | Record | Problem if older than |
|---|---|---|
| Wispr logger (key `nightly`) | newest `proposals` record with `auto:true` or an id starting with a date (YYYY-MM-DD), field `at`; summary "N saved, M need you" | 36 h |
| Daily backup | `meta/backup` `{at, file, records}` | 36 h |
| Calendar feed | `meta/calendar` `{at}` (written by the app) | never |
| Health check | `meta/agent-health` | 36 h |
| Sunday review prep | `meta/agent-sunday` | 10 days |
| Month-end report | `meta/agent-monthend` | 35 days |
| CFA coach | `meta/agent-cfa` | 10 days |
| Journal scout | `meta/agent-journal` | 35 days |
| Semester Scribe | `meta/agent-scribe` | 36 h |
| Morning paper | `meta/agent-paper` | 36 h |
| Outlook check (Mac) | `meta/agent-outlook` | 36 h |

Shape of every `meta/agent-<key>` record (collection `meta`, id `agent-<key>`):

    {"at": 1764500000000, "ok": true, "summary": "One line under the name", "detail": "Optional text shown on tap"}

- `at` is the finish time in milliseconds since 1970 (UTC).
- `ok:false` shows Problem; put the reason in `summary`.
- No record shows "Never run". A record older than the limit shows Problem and puts a red dot on the Settings gear.
- Overwrite the same record each run; no history is kept.
- Revise suggestions in `proposals` items: `{"kind":"topic","course":"<id or name>","t":"...","why":"..."}` and `{"kind":"case","course":"...","name":"...","point":"one-line holding","topic":"optional topic title","why":"..."}`.

Other agents name their proposals records `<agent>-<date>` (health-, sunday-, monthend-, cfa-, journal-, scribe-, outlook-) so they never count as the Wispr logger. The morning paper is not a proposal: it writes `meta` records with ids `paper-YYYY-MM-DD`, which the Wispr logger never reads. Item formats for the logger are in `docs/WISPR_ITEMS.md`.


## Health check (since 19 Nov 2026)

The health check no longer uses Claude. The database function `public.ld_health()` (app/cloud/7-health-check.sql) runs daily at 7:07 AM India time via pg_cron job `ld-health`, writes `meta/agent-health`, and writes `proposals/health-YYYY-MM-DD` only when something is wrong. The `remind` function sends one push notification ("Dashboard needs a look") the same morning when `agent-health.ok` is false. The old Claude scheduled task "life dashbaord: Health checkup" should be paused or deleted.
