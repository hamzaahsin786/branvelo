# Branvelo keep-warm cron — install template

Install this with `cron.add` the moment Muhammad sends the live Render API URL.
He explicitly asked for it ([source:60] in the 2026-10-16 morning chat: "lets
make a cron job that would make it alive all the time"), and the assistant
committed to setting it up ([source:62]: "I'll set up the keep-warm cron myself").

## cron.add parameters

- `id`: `mezban-keepwarm`
- `mode`: `task`
- `owner`: `goal:goal_087f30e09390` (Branvelo tracked item)
- `schedule`: `{ "kind": "interval", "every": "10m" }`
- `predicted_connector_permissions`: `[]`
- `title`: `Branvelo API keep-warm ping`

## Body (replace {{API_URL}} with the URL he sends, no trailing slash)

Every 10 minutes, send an HTTP GET to {{API_URL}}/health.

- Expect HTTP 200 with a JSON body containing "ok": true.
- Stay completely silent on success — unchanged state is not worth a message.
- On any failure (non-200 status, timeout after 30 seconds, connection error,
  or unexpected body): send the user one brief alert with the time and the
  exact error, then stay quiet until the endpoint recovers or 6 hours pass
  (one alert per incident, no spam).
- Purpose, for context: the Render free tier sleeps after ~15 minutes idle and
  takes 30-60s to wake; this ping keeps it warm so Usama Burgers' orders never
  wait on a cold start. If the API later moves to a paid always-on host, this
  schedule should be removed.

## Pre-creation checklist (per standing rules)

1. `cron.list` first — confirm no `mezban-keepwarm` (or equivalent) already exists.
2. Verify the URL he sent actually responds (curl {{API_URL}}/health → 200)
   before creating the schedule.
3. After `cron.add`, verify with `cron.view` and record the change with
   `proactivity.record_change`.
