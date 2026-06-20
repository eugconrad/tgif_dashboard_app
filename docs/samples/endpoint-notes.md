# TGIF Endpoint Notes

Captured on 2026-06-20 with short, one-off requests. Avoid treating these as a public API contract unless noted.

## Active monitoring

- `https://tgif.network/activetg.php`
  - Active talkgroup page.
  - Response type: HTML.
  - Useful data: page shell, inline Socket.IO logic, empty `#lastheard` table.
  - Dynamic data source: Socket.IO on the same host.

- `https://tgif.network/socket.io/?EIO=3&transport=websocket`
  - Engine.IO/Socket.IO v2 WebSocket endpoint used by the active and last-heard pages.
  - Page code calls `io('https://' + window.location.host)`. Last Heard forces `transports: ['websocket']`; Active Talkgroups allows default Socket.IO transports.
  - Direct `wss` open returned Engine.IO open frame and `40` namespace connect frame.

- `https://tgif.network/socket.io/?EIO=3&transport=polling`
  - Engine.IO polling transport. Used for controlled capture without extra tooling.
  - Emits the same Socket.IO event frames after `handshake` and `cli-state`.

## Profiles and lists

- `https://tgif.network/tgprofile.php?id=<tgid>`
  - Talkgroup profile HTML.
  - Required parameter: numeric `id`.
  - Useful fields: title/name, trustee callsign, contact details, TG ID, country code, language code, website, description HTML, image path.
  - Missing behavior observed: `id=26223` returned an empty body.

- `https://tgif.network/talkgroups.php`
  - Talkgroup list page.
  - Response type: HTML plus Socket.IO list load.
  - Emits `talkgroups` with payload `"list"` and listens for `talkgroups_list`.
  - Also links to JSON/CSV exports on `api.tgif.network`.

- `https://api.tgif.network/dmr/talkgroups/json`
  - Public talkgroup list JSON.
  - Observed schema: array of `{ id, name, website, description }`.
  - `description` appears base64-encoded in sampled rows.
  - Saved as `docs/samples/talkgroups-api.json`.

- `https://api.tgif.network/dmr/talkgroups/csv`
  - Public talkgroup list CSV.
  - Not saved separately because JSON was enough for schema comparison.

- `https://tgif.network/talkgroup_stats.php`
  - 30-day stats page.
  - Query params observed in page JS/form: `days`, `topN`, `search`, `export`.
  - `export=json` returns JSON rows like `{ tgid, tgname, keyups }`.
  - Saved sample: `talkgroup_stats.php?days=30&topN=10&export=json`.

## Related monitoring/profile helpers

- `https://tgif.network/lastheard.php`
  - Last Heard page.
  - Uses Socket.IO with explicit websocket transport and the same `handshake` plus `cli-state` backlog request as Active Talkgroups.
  - Listens to both `lastheard_backlog` array snapshots and incremental `lastheard` events.

- `https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>`
  - External callsign/radio profile lookup used by modal popups.
  - Response type: JSON.
  - Fields referenced by page JS: `radio_id`, `callsign`, `name`, `city`, `state`, `country`, `image`.
  - Reliability: external host, should be optional and cached if used.

- `https://www.qrz.com/db/<callsign>`
  - External callsign lookup link only.

- `https://tgif.network/tgcontrol.php?id=<tgid>`
  - Referenced from Last Heard for some admin/self-care control paths.
  - Not needed for passive monitoring.

## Navigation-only or lower-priority pages

- `https://tgif.network/Lh-Map.php` - Last Heard map page, not sampled in detail.
- `https://tgif.network/nets/calendar.php` - net schedule/calendar page, appears in nav/header scripts.
- `https://tgif.network/status.php` - sampled response showed sign-in/registration-related content and is not needed for passive active-TG monitoring.
- `https://tgif.network/signin.php`, `/help.php`, `/faq.php`, `/helpvid.php`, legal pages - not needed for the app core.
