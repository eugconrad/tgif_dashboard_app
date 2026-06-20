# Talkgroup Statistics Endpoint

Endpoint: `https://tgif.network/talkgroup_stats.php`

Sample HTML: `docs/samples/html/talkgroup_stats.html`

Sample exports:

- `docs/samples/json/talkgroup-stats-1d-top5.json`
- `docs/samples/json/talkgroup-stats-7d-top5.json`
- `docs/samples/json/talkgroup-stats-30d-top10.json`
- `docs/samples/json/talkgroup-stats-30d-search-texas.json`
- `docs/samples/json/talkgroup-stats-30d-top5.csv`

## Purpose

Shows top-used talkgroups by key-up count over a selected time range.

## Parameters

| Parameter | Type | Observed Values | Meaning |
| --- | --- | --- | --- |
| `days` | number | `1`, `7`, `30` | Time range |
| `topN` | number | `10`, `20`, `30`, `50` | Number of rows requested by UI |
| `search` | string | free text | Filters talkgroups by text |
| `export` | string | `json`, `csv` | Export format |

If `export` is omitted, response is HTML.

## JSON Schema

```ts
interface TalkgroupStatsRow {
  tgid: string;
  tgname: string;
  keyups: number;
}
```

Example:

```json
{"tgid":"31665","tgname":"TGIF The Mothership","keyups":417}
```

## CSV Schema

Observed header:

```csv
Rank,Talkgroup Name,Talkgroup ID,Keyups
```

## Important Observations

- Requesting `topN=5` returned 10 rows in samples.
- The HTML UI only exposes `topN` values `10`, `20`, `30`, and `50`.
- The page uses Chart.js for a bar chart.
- The page caches 30-day top-50 stats in localStorage.
- The page polls `fetchAndUpdateStats` every 300,000 ms.
- Some stats responses were slow during research.

## Client Usage

Recommended:

- Use only official UI parameter values.
- Cache by `(days, topN, search)`.
- TTL: at least 5 minutes, preferably 1 hour for non-search dashboards.
- Fetch stats in background, never on every live event.
- Treat stats as analytics, not live state.

## Historical Usefulness

Stats can help:

- Rank talkgroups by historical activity.
- Provide context for profile pages.
- Seed popular/favorite suggestions.
- Distinguish a rare live TG from a frequently used TG.

Stats cannot:

- Detect current active conversations.
- Identify active callsigns.
- Determine last TX time.

## Unknowns

- Exact database aggregation window boundaries.
- Whether `days` values other than `1`, `7`, `30` are accepted server-side.
- Whether there is pagination beyond `topN=50`.
