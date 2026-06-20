# TGIF Endpoint Catalog

Research pass: 2026-06-20. Endpoints were discovered from public pages, JavaScript, and short network probes. Authentication is noted when observed or likely.

## Core Monitoring Endpoints

| URL | Purpose | Parameters | Auth | Response | Use for app | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `https://tgif.network/activetg.php` | Active talkgroups web page | optional `search` client-side only | No | HTML | Research reference, not runtime data source | Verified |
| `https://tgif.network/lastheard.php` | Last Heard web page | optional `search` UI param | No | HTML | Research reference for richer live logic | Verified |
| `https://tgif.network/socket.io/?EIO=3&transport=websocket` | Live Socket.IO feed | `EIO=3`, `transport=websocket` | Empty public handshake accepted | Engine.IO/Socket.IO | Primary live source | Verified |
| `https://tgif.network/socket.io/?EIO=3&transport=polling` | Polling transport | `EIO=3`, `transport=polling`, later `sid` | Empty public handshake accepted | Engine.IO polling | Diagnostics/fallback | Verified |

## Talkgroup Metadata Endpoints

| URL | Purpose | Parameters | Auth | Response | Use for app | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `https://api.tgif.network/dmr/talkgroups/json` | Public talkgroup directory | none observed | No | JSON array | Primary directory source | Verified |
| `https://api.tgif.network/dmr/talkgroups/csv` | Public talkgroup CSV | none observed | No | CSV | Optional export/debug | Verified |
| `https://tgif.network/talkgroups.php` | Talkgroup list web page | none observed | No | HTML plus Socket.IO list request | Research reference | Verified |
| `https://tgif.network/tgprofile.php?id=<tgid>` | Talkgroup profile page | `id` TG ID | No | HTML | On-demand profile enrichment | Verified |
| `https://tgif.network/avatars/talkgroups/<file>` | Talkgroup image | file path from profile HTML | No | image | Optional cached image | Verified |

## Callsign and User Endpoints

| URL | Purpose | Parameters | Auth | Response | Use for app | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>` | Radio/callsign lookup | `dmr_id` | No observed auth | JSON object or empty invalid response | On-demand callsign details | Verified |
| `https://api.tgif.network/dmr/userdb/<callsign>` | Callsign to radio ID list | path callsign | No observed auth | JSON array | Optional ID relationship enrichment | Verified |
| `https://www.qrz.com/db/<callsign>` | External callsign page | path callsign | External | HTML | Optional outbound link only | Verified |

## Statistics and Analytics

| URL | Purpose | Parameters | Auth | Response | Use for app | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `https://tgif.network/talkgroup_stats.php` | Top talkgroup stats | `days`, `topN`, `search`, `export` | No | HTML, JSON, CSV | Optional analytics with cache | Verified |

Observed parameter values:

- `days`: `1`, `7`, `30`
- `topN`: `10`, `20`, `30`, `50`
- `export`: `json`, `csv`
- `search`: free text

## Net Schedule

| URL | Purpose | Parameters | Auth | Response | Use for app | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `https://tgif.network/nets/calendar.php` | Net schedule | `tz` IANA timezone, auto-added by page | No | HTML with embedded `NET_DATA` | Optional scheduled net enrichment | Verified |
| `https://tgif.network/profile.php?tab=SelfCare` | SelfCare page used by Join TG flow | `tab=SelfCare` | Yes likely | HTML/app page | Do not use in public monitor | Observed |

## Status and Map Pages

| URL | Purpose | Parameters | Auth | Response | Use for app | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `https://tgif.network/status.php` | Server status page | none observed | Unauthenticated fetch returned sign-in content | HTML | Not useful without auth | Observed |
| `https://tgif.network/Lh-Map.php` | Last Heard beta map | none observed | Unauthenticated fetch returned sign-in content | HTML | Not useful without auth | Observed |

## Auth and Account Pages

| URL | Purpose | Auth | Response | Use for app |
| --- | --- | --- | --- | --- |
| `https://tgif.network/signin.php` | Sign in | No to view, credentials to post | HTML/JSON post | Not needed |
| `https://tgif.network/signin.php#signup` | Registration anchor | No | HTML | Not needed |
| `https://tgif.network/forgotpassword.php` | Password reset | No | HTML | Not needed |
| `https://tgif.network/tgcontrol.php?id=<tgid>` | Talkgroup control page | Likely yes | HTML | Not needed for public monitor |
| `https://tgif.network/tgcontrol.php` | ACL rule endpoint | Likely yes | JSON POST | Do not call |

## Help and Static Pages

Discovered from navigation:

- `/index.php`
- `/help.php`
- `/faq.php`
- `/helpvid.php`
- `/disclaimer.php`
- `/privacy-policy.php`
- `/terms-conditions.php`
- External forum: `https://tgifnetwork.createaforum.com/index.php`

These are not required for a monitoring client except as links.

## Static Assets

Observed assets:

- `/assets/js/socket.io.js`
- `/assets/js/datatables.min.js`
- `/assets/js/togglermenu.js`
- `/assets/js/session.js`
- `/assets/js/lastheard.js`
- `/assets/js/lh_session_cache.js`
- `/assets/js/ip_utils.js`
- `/assets/js/tgrequest_bridge_types.js`
- `/assets/css/...`
- `/assets/signal/0.png` through signal icons

## Reliability Concerns

- `robots.txt` and `sitemap.xml` returned TGIF 404 HTML in the sample set. Do not rely on sitemap discovery.
- `status.php` and `Lh-Map.php` fetched unauthenticated sign-in content, so public availability differs from nav visibility.
- `talkgroup_stats.php` can be slow. Cache aggressively.
- Profile pages are HTML and may shift structure. Parser tests should use the 100-profile sample.
- Callsign lookup can return non-JSON for invalid IDs.

## Usage Recommendations

- Runtime primary source: Socket.IO live feed.
- Runtime metadata source: cached directory JSON.
- On-demand only: profile HTML and callsign lookup.
- Optional analytics: stats endpoint with TTL no shorter than 5 minutes.
- Do not use `tgcontrol.php` or SelfCare endpoints in the public monitoring app.
