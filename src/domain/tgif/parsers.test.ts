import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDirectoryTalkgroups, parseProfileHtml, parseStatsRows } from './parsers';

describe('TGIF metadata parsers', () => {
  it('parses directory JSON and base64 descriptions', () => {
    const raw = JSON.parse(readFileSync(resolve('docs/samples/json/talkgroups-api.json'), 'utf8'));
    const directory = parseDirectoryTalkgroups(raw);

    expect(directory.length).toBeGreaterThan(3000);
    expect(directory[0].id).toEqual(expect.any(Number));
    expect(directory.find((tg) => tg.id === 103)?.descriptionText).toContain('Ragchew');
  });

  it('parses talkgroup profile HTML', () => {
    const html = readFileSync(resolve('docs/samples/html/tgprofile-296.html'), 'utf8');
    const profile = parseProfileHtml(296, html);

    expect(profile.talkgroupId).toBe(296);
    expect(profile.title).toContain('Hitachi');
    expect(profile.languageCode).toBe('ja');
    expect(profile.countryCode).toBe('98');
    expect(profile.imageUrl).toContain('avatars/talkgroups');
    expect(profile.descriptionText).toContain('Japan');
  });

  it('parses statistics rows', () => {
    const raw = JSON.parse(readFileSync(resolve('docs/samples/json/talkgroup-stats-30d-top10.json'), 'utf8'));
    const stats = parseStatsRows(raw);

    expect(stats[0]).toMatchObject({
      tgid: expect.any(String),
      tgname: expect.any(String),
      keyups: expect.any(Number)
    });
  });
});
