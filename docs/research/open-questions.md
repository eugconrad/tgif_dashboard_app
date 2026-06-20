# Open Questions

Research pass: 2026-06-20.

## Protocol

- What is the complete Socket.IO event list supported by TGIF?
- Does `dmr` with payload `stats` return a useful payload for the client?
- Is `server_status` still emitted by the server?
- Are there other valid `cli-state` actions besides `lh-backlog`?
- What is the exact server retention window for `lastheard_backlog`?
- Is `repeater_id == 0` always a stop/clear event, or can it represent partial lookup data?

## Payloads

- Can `lastheard.timestamp` be missing in real traffic?
- Can `streamid` be reused after a long period?
- What exact values can `security_level` take?
- What exact shape can `admin` object payloads take for authenticated users?
- Are latitude and longitude station, repeater, or account coordinates?

## Endpoints

- Is there an official JSON endpoint for talkgroup profiles?
- Is there an official JSON endpoint for the net calendar?
- Does `talkgroup_stats.php` accept other `days` values server-side?
- Does `talkgroup_stats.php` have a hard maximum or minimum for `topN`?
- Are there ETag or Last-Modified headers worth using for directory/profile caches?

## Runtime

- Will a browser-based app be allowed to fetch `dmr.g7lrr.com` directly from the chosen origin?
- Will packaged desktop/mobile runtimes need custom TLS or origin handling for Socket.IO?
- Should the final app use a backend proxy for cache/rate-limit control?

## Product

- What should the default conversation window be for users?
- Should scheduled nets count as conversations before 2+ callsigns appear?
- Should favorites override score sorting?
- How much local history should be retained by default?
- Should location display be disabled by default for privacy?

## Research Follow-Up

Recommended next research actions before implementation:

1. Capture a longer Socket.IO session with event counts and deduplication analysis.
2. Probe `dmr`/`stats` response safely with one request.
3. Test CORS from the selected app runtime.
4. Run parser tests over the 100-profile sample and selected non-English profiles.
5. Check response headers for cache validators on directory, profile, stats, and callsign endpoints.
