# Caching Strategy

TGIF data sources have different volatility. The app should cache aggressively where data is static and avoid refetching on every live event.

## Cache Classes

| Source | Volatility | Recommended TTL | Offline Use |
| --- | --- | --- | --- |
| Socket.IO live activity | real-time | no long cache, keep bounded history | Recent history only |
| Talkgroup directory JSON | low | 24 hours | Yes |
| Socket.IO `talkgroups_list` | low/medium | 24 hours | Yes |
| Talkgroup profile HTML/parsed data | low | 7 days | Yes |
| Talkgroup images | low | 30 days | Yes |
| Callsign lookup | medium | 7 to 30 days | Yes |
| Callsign lookup miss | medium | 1 day | Yes |
| Userdb callsign to IDs | medium | 7 days | Optional |
| Statistics JSON | medium | 5 minutes to 1 hour | Yes, stale-labeled |
| Net calendar HTML/parsed data | medium | 1 to 6 hours | Yes, stale-labeled |

## Talkgroup Directory

Primary source:

```text
https://api.tgif.network/dmr/talkgroups/json
```

Rules:

- Fetch at startup only if stale or missing.
- Keep last successful cache if refresh fails.
- Decode base64 descriptions once and store parsed output.
- Merge Socket.IO `talkgroups_list` fields when available.

## Profiles

Endpoint:

```text
https://tgif.network/tgprofile.php?id=<tgid>
```

Rules:

- Fetch on demand when user opens a profile or when a live TG is important enough to enrich.
- Do not prefetch all profiles.
- Cache parsed profile and optionally raw HTML for debug builds.
- If profile is empty/missing, negative cache for 24 hours.
- Revalidate in background after TTL.

## Images

Image paths come from profile HTML JavaScript.

Rules:

- Cache by absolute image URL.
- Store with profile metadata hash if useful.
- If image fails, negative cache for 7 days.
- Do not block live monitoring on image fetch.

## Callsigns

Endpoint:

```text
https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>
```

Rules:

- Fetch only when details are needed.
- Live events already include basic callsign and short name, so do not enrich every event immediately.
- Cache valid responses by `radio_id`.
- Cache invalid/non-JSON responses briefly.

## Statistics

Endpoint:

```text
https://tgif.network/talkgroup_stats.php?days=30&topN=50&export=json
```

Rules:

- Cache by all query parameters.
- Follow the official page's 5-minute polling as a minimum interval.
- Prefer 1-hour TTL for passive context.
- Never refresh stats on Socket.IO reconnect.

## Calendar

Endpoint:

```text
https://tgif.network/nets/calendar.php?tz=<IANA timezone>
```

Rules:

- Cache parsed `NET_DATA` by timezone.
- TTL: 1 to 6 hours.
- The schedule is time-sensitive, so mark stale data visibly if offline.

## Storage Layout

Suggested logical stores:

- `metadata.directory`
- `metadata.talkgroupProfiles`
- `metadata.callsigns`
- `metadata.images`
- `analytics.stats`
- `schedule.nets`
- `activity.history`

## Cache Invalidation

- Manual "refresh metadata" action should refresh directory and currently visible profiles only.
- Profile cache can be invalidated when directory name/description changes.
- If a Socket.IO live event reports `talkgroup_name` different from cached name, keep both and mark profile/directory stale.

## Privacy and Size

Local history may contain callsigns, radio IDs, locations, and timestamps. Keep retention bounded and make clearing history easy.
