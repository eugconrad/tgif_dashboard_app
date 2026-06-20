# Talkgroup Profile Pages

Endpoint pattern: `https://tgif.network/tgprofile.php?id=<tgid>`

Samples:

- Single reference profile: `docs/samples/html/tgprofile-296.html`
- 100 deterministic directory profiles: `docs/samples/html/tgprofiles-100/`
- Summary: `docs/samples/json/profile-sample-summary.json`
- Earlier live examples: `docs/samples/html/tgprofile-examples/`

## Sampling Method

100 talkgroup IDs were selected from the public directory using deterministic hashing of IDs, then fetched sequentially with a short delay. This avoids hammering the site and makes the sample repeatable.

## Sample Results

From the 100-profile sample:

- Pages fetched: 100
- Empty pages: 0
- Pages with expected profile structure: 100
- Pages with title: 100
- Pages with trustee callsign: 100
- Pages with contact: 98
- Pages with country code: 100
- Pages with language code: 100
- Pages with image: 48
- Blank image: 52
- Pages with website href: 28
- Website `N/A`: 72
- Placeholder website: 3
- Pages with description: 91
- Pages with no description: 9

Earlier targeted sampling found at least one zero-byte profile sample for a live TG ID with unknown profile behavior (`tgprofile-26223.html`). Treat missing/empty profiles as possible.

## HTML Structure

Observed profile structure:

- Inline script defines:

```js
var country = "98";
var language = "ja";
```

- Profile name in a top-level `h2`.
- Left column card contains:
  - `img#tgimage`
  - "Talkgroup Trustee"
  - "Callsign: <callsign>"
  - "Contact Details: <contact>"
  - `h4#tgid` containing "Talkgroup ID: <id>"
  - `h4#lang`, filled client-side by `getLanguage(language).name`
  - `h4#country`, filled client-side by `getCountry(parseInt(country))`
  - "Website: <a href=...>...</a>"
- Right column card contains:
  - "Talkgroup Description"
  - HTML description content.

Image is assigned by script:

```js
function setTalkgroupImage(){
  var image = document.getElementById("tgimage");
  image.src = "";
  image.src = "avatars/talkgroups/6811cd52823a94.33945658_nqflpmigjehko.jpeg";
}
```

## Fields

| Field | Source | Type | Missing Behavior |
| --- | --- | --- | --- |
| TG ID | `h4#tgid` text | string/number | Expected in normal profiles |
| Name/title | `h2` text | string | Expected in normal profiles |
| Trustee callsign | text after `Callsign:` | string | Expected in normal profiles |
| Contact | text after `Contact Details:` | string | Missing in 2 of 100 |
| Country | inline `var country` | numeric string | Expected in normal profiles |
| Language | inline `var language` | string code | Expected in normal profiles |
| Website | Website anchor text/href | string | Often `N/A` or placeholder |
| Image | `setTalkgroupImage()` relative path | string | Blank in 52 of 100 |
| Description | card after heading | HTML/text | Empty in 9 of 100 |

## Encoding and Non-English Text

Profile pages are UTF-8. TG 296 includes Japanese text in the description and rendered correctly in the captured HTML. The parser must preserve UTF-8.

Do not assume English descriptions. The 100-profile sample included language codes:

- `en`: 77
- `it`: 5
- `es`: 4
- `ja`: 3
- `de`: 2
- `tr`: 2
- `fr`, `ks`, `nl`, `pt`, `ro`, `ru`, `tl`: 1 each

## Website Edge Cases

Observed:

- `N/A` with empty href.
- Placeholder `https://`.
- Malformed normalized href such as `https://Https://cec-corps.us` where the page added `https://` to already scheme-like text.

Parser should store:

- `websiteRawText`
- `websiteHrefRaw`
- `websiteUrlNormalized` only when URL parsing succeeds.

## Image URL Extraction

The image path is not present as the initial `src`; it is assigned in JavaScript. Extract by parsing `setTalkgroupImage()` assignment.

Normalize relative path:

```text
https://tgif.network/avatars/talkgroups/<filename>
```

If assignment is empty, store `imageUrl = null`.

## Parsing Strategy

Recommended parser order:

1. If response is empty or lacks profile markers, return `missing`.
2. Parse as HTML with a tolerant parser.
3. Extract inline `country` and `language` from script text.
4. Extract image from `setTalkgroupImage` script assignment.
5. Extract title from the profile `h2`.
6. Extract `Talkgroup ID`, `Callsign`, and `Contact Details` from text nodes.
7. Extract website anchor near the `Website:` label.
8. Extract description block following the `Talkgroup Description` heading.
9. Store raw HTML fragment plus sanitized text.

## Reliability

Profile HTML is parseable but not an API. Structure is consistent in the 100-profile sample, but profile pages should be cached and parser tests should pin expected behavior using the captured samples.
