# Callsign Lookup APIs

Research pass: 2026-06-20.

## `getcall.php`

Endpoint:

```text
https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>
```

Used by:

- `activetg.php` callsign modal.
- `lastheard.php` callsign modal.

Samples:

- `docs/samples/json/callsign-api/getcall-3205803.json`
- `docs/samples/json/callsign-api/getcall-3112594.json`
- `docs/samples/json/callsign-api/getcall-0.json`

## Parameters

| Parameter | Type | Meaning | Required |
| --- | --- | --- | --- |
| `dmr_id` | string/number | DMR radio ID | Yes |

## Valid Response Shape

```ts
interface GetCallResponse {
  id: string;
  radio_id: string;
  callsign: string;
  name: string;
  city: string;
  state: string;
  country: string;
  remarks: string;
  image: string;
  lat: string;
  lon: string;
  license: string;
  license_short: string;
  talkgroup: string;
  duration: string;
  timestamp: string;
  time: string;
}
```

All observed values were strings in valid responses, including numeric-looking fields.

## Example

```json
{
  "radio_id": "3205803",
  "callsign": "K5AL",
  "name": "Bob",
  "city": "Fort Worth",
  "state": "Texas",
  "country": "United States",
  "image": "https://cdn-xml.qrz.com/l/k5al/FB_IMG_1735064162163.jpg",
  "lat": "32.7515",
  "lon": "-97.3456"
}
```

## Invalid/Missing Behavior

`dmr_id=0` returned a tiny non-JSON/empty response in the captured sample. Treat invalid IDs as cacheable misses and never assume JSON parsing succeeds.

## Rate Limits

No explicit rate-limit headers or limits were measured. The official page only calls this endpoint when a user clicks a callsign. A client should do the same or cache heavily.

Recommended policy:

- On-demand fetch only.
- Cache by `radio_id`.
- TTL: 7 to 30 days.
- Negative cache invalid IDs for 1 day.
- Limit concurrent lookups.

## `userdb/<callsign>`

Endpoint:

```text
https://api.tgif.network/dmr/userdb/<callsign>
```

Used by:

- `lastheard.js` admin ACL helpers.

Sample:

```json
["3205803"]
```

Purpose:

- Returns a list of radio IDs associated with a callsign.

Use in future app:

- Optional relationship enrichment.
- Not needed for basic monitoring.
- Do not call for every live event.

## Relationship to Live Events

Live `lastheard` events usually already include:

- `radio_id`
- `callsign`
- `name`
- `shortname`
- `latitude`
- `longitude`

The callsign API is enrichment, not required for active conversation detection.
