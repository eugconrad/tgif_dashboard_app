import type { DirectoryTalkgroup, TalkgroupProfile, TalkgroupStatsRow } from './types';

export function parseDirectoryTalkgroups(input: unknown, updatedAt = Date.now()): DirectoryTalkgroup[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => parseDirectoryItem(item, updatedAt))
    .filter((item): item is DirectoryTalkgroup => Boolean(item));
}

export function parseProfileHtml(talkgroupId: number, html: string, fetchedAt = Date.now()): TalkgroupProfile {
  if (!html.trim()) {
    return missingProfile(talkgroupId, fetchedAt, 'empty response');
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const bodyText = document.body.textContent ?? '';
  if (!bodyText.includes('Talkgroup')) {
    return missingProfile(talkgroupId, fetchedAt, 'missing profile markers');
  }

  const scripts = Array.from(document.querySelectorAll('script')).map((script) => script.textContent ?? '');
  const scriptText = scripts.join('\n');
  const countryCode = matchScriptVar(scriptText, 'country');
  const languageCode = matchScriptVar(scriptText, 'language');
  const imagePath = matchImagePath(scriptText);
  const websiteAnchor = findWebsiteAnchor(document);
  const title = clean(document.querySelector('.container h2')?.textContent) ?? clean(document.querySelector('h2')?.textContent);
  const descriptionHtml = extractDescriptionHtml(document);
  const descriptionText = htmlToText(descriptionHtml);

  const profile: TalkgroupProfile = {
    talkgroupId,
    title,
    trusteeCallsign: matchText(bodyText, /Callsign:\s*([A-Z0-9/ -]+)/i),
    contact: matchText(bodyText, /Contact Details:\s*([^\n\r]+)/i),
    countryCode,
    languageCode,
    websiteText: clean(websiteAnchor?.textContent),
    websiteHref: clean(websiteAnchor?.getAttribute('href')),
    websiteUrl: normalizeUrl(clean(websiteAnchor?.getAttribute('href')) ?? clean(websiteAnchor?.textContent)),
    imagePath,
    imageUrl: imagePath ? new URL(imagePath, 'https://tgif.network/').toString() : null,
    descriptionHtml,
    descriptionText,
    fetchedAt,
    parseStatus: 'ok',
    parseWarnings: []
  };

  if (!profile.title) profile.parseWarnings.push('missing title');
  if (!profile.trusteeCallsign) profile.parseWarnings.push('missing trustee callsign');
  if (!profile.contact) profile.parseWarnings.push('missing contact');
  if (!profile.descriptionText) profile.parseWarnings.push('missing description');
  if (profile.parseWarnings.length) profile.parseStatus = 'partial';
  return profile;
}

export function parseStatsRows(input: unknown): TalkgroupStatsRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => {
      if (!isRecord(row)) return null;
      const tgid = clean(row.tgid);
      const tgname = clean(row.tgname);
      const keyups = toNumber(row.keyups);
      if (!tgid || !tgname || keyups === null) return null;
      return { tgid, tgname, keyups };
    })
    .filter((row): row is TalkgroupStatsRow => Boolean(row));
}

function parseDirectoryItem(item: unknown, updatedAt: number): DirectoryTalkgroup | null {
  if (!isRecord(item)) return null;
  const idRaw = clean(item.id);
  const id = toNumber(idRaw);
  const name = clean(item.name);
  if (!id || !idRaw || !name) return null;
  const descriptionRaw = clean(item.description);
  const decodedDescription = descriptionRaw ? decodeBase64Utf8(descriptionRaw) : null;
  const websiteRaw = clean(item.website);

  return {
    id,
    idRaw,
    name,
    websiteRaw,
    websiteUrl: normalizeUrl(websiteRaw),
    descriptionRaw,
    descriptionText: decodedDescription ? htmlToText(decodedDescription) : null,
    descriptionHtml: decodedDescription && looksLikeHtml(decodedDescription) ? decodedDescription : null,
    source: 'directory-json',
    updatedAt
  };
}

function missingProfile(talkgroupId: number, fetchedAt: number, warning: string): TalkgroupProfile {
  return {
    talkgroupId,
    title: null,
    trusteeCallsign: null,
    contact: null,
    countryCode: null,
    languageCode: null,
    websiteText: null,
    websiteHref: null,
    websiteUrl: null,
    imagePath: null,
    imageUrl: null,
    descriptionHtml: null,
    descriptionText: null,
    fetchedAt,
    parseStatus: 'missing',
    parseWarnings: [warning]
  };
}

function findWebsiteAnchor(document: Document) {
  return Array.from(document.querySelectorAll('h4 a')).find((anchor) => {
    const parentText = anchor.parentElement?.textContent ?? '';
    return parentText.includes('Website:');
  }) as HTMLAnchorElement | undefined;
}

function extractDescriptionHtml(document: Document) {
  const heading = Array.from(document.querySelectorAll('h3')).find((node) =>
    (node.textContent ?? '').includes('Talkgroup')
  );
  const cardBody = heading?.closest('.card-body');
  if (!cardBody) return null;

  const clone = cardBody.cloneNode(true) as HTMLElement;
  clone.querySelector('h3')?.remove();
  const html = clone.innerHTML.trim();
  return html || null;
}

function matchScriptVar(scriptText: string, name: string) {
  const match = scriptText.match(new RegExp(`var\\s+${name}\\s*=\\s*["']([^"']*)["']`));
  return clean(match?.[1]);
}

function matchImagePath(scriptText: string) {
  const matches = Array.from(scriptText.matchAll(/image\.src\s*=\s*"([^"]*)"/g)).map((match) => match[1]);
  return clean([...matches].reverse().find((value: string) => value.includes('avatars/talkgroups')) ?? null);
}

function matchText(text: string, pattern: RegExp) {
  return clean(text.match(pattern)?.[1]);
}

function normalizeUrl(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^N\/A$/i.test(trimmed) || trimmed === 'https://' || trimmed === 'http://') return null;
  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return null;
    }
  }
}

function decodeBase64Utf8(value: string) {
  try {
    if (typeof atob === 'function') {
      const binary = atob(value);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function htmlToText(html: string | null) {
  if (!html) return null;
  if (typeof DOMParser === 'undefined') {
    return clean(html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  return clean(document.body.textContent?.replace(/\s+/g, ' '));
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value) || value.includes('&nbsp;');
}

function clean(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length ? trimmed : null;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
