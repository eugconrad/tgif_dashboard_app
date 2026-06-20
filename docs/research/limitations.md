# Known Limitations

Every item is tagged as Verified, Observed, Hypothesis, or Unknown.

## Verified

- TGIF public live monitoring uses Socket.IO over Engine.IO 3.
- Public pages emit `handshake` with an empty token.
- A `status` payload of `200` indicates successful handshake in observed sessions.
- `cli-state` with `{"scope":"*","page":"lastheard","action":"lh-backlog"}` requests backlog.
- `lastheard` events carry live activity.
- `lastheard_backlog` events carry arrays of `lastheard`-shaped payloads.
- `repeater_id == 0` is handled by official JS as a stop/clear/non-new event.
- `activetg.php` uses a 600,000 ms removal timeout for active callsign entries.
- `talkgroups_list` is available through Socket.IO after `socket.emit('talkgroups','list')`.
- `https://api.tgif.network/dmr/talkgroups/json` returns a public directory.
- `tgprofile.php?id=<tgid>` returns parseable HTML for normal profiles.
- Callsign lookup by radio ID is performed through `dmr.g7lrr.com/new/getcall.php`.
- Statistics JSON is available with `export=json`.

## Observed

- Direct command-line WebSocket and polling probes succeeded without custom origin handling.
- Socket.IO `talkgroups_list` has richer metadata than public directory JSON.
- The profile structure was consistent across the 100-profile sample.
- Some profile fields are frequently missing or placeholders, especially image and website.
- `dmr_id=0` in callsign lookup returned a non-JSON/empty response.
- `topN=5` on stats returned 10 rows, matching the minimum UI option rather than the requested number.
- `status.php` and `Lh-Map.php` returned sign-in content when fetched unauthenticated.
- The home page emits `socket.emit('dmr','stats')`, but the response was not captured.

## Hypotheses

- `repeater_id == 0` represents stream stop or clear events.
- `lastheard_backlog` retention approximates current or recent activity, but the exact server window is not known.
- `server_status` is or was a Socket.IO event for server state.
- `admin` object payloads appear only for authenticated or privileged users.
- `bridge_data` is base64 encoded JSON describing bridge integrations.

## Unknown

- Complete list of server-supported Socket.IO events.
- Complete shape of authenticated admin payloads.
- Exact server-side definition of active talkgroup.
- Exact server-side retention duration for backlog.
- Official rate limits for profile, callsign, directory, and stats endpoints.
- CORS behavior in all future target runtimes.
- Whether a JSON endpoint exists for net calendar data.
- Whether profile pages have a hidden API equivalent.
- Whether timestamps are generated at key-up start, last update, or server receipt time for every event type.

## Consequences for Implementation

- Keep parser code tolerant and preserve raw payloads.
- Mark conversation detection as client-derived.
- Do not build production behavior that depends on undocumented admin features.
- Add telemetry/debug logging during early development, bounded locally.
