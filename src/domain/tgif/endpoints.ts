import { LocalCache } from './cache';
import { parseDirectoryTalkgroups, parseProfileHtml, parseStatsRows } from './parsers';
import type { CallsignLookup, DirectoryTalkgroup, TalkgroupProfile, TalkgroupStatsRow } from './types';

const DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000;
const PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CALLSIGN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const STATS_TTL_MS = 60 * 60 * 1000;

export class TgifMetadataClient {
  private readonly cache = new LocalCache('tgif-monitor-metadata');

  async getDirectory(force = false): Promise<DirectoryTalkgroup[]> {
    const cacheKey = 'directory-json';
    if (!force) {
      const cached = this.cache.get<DirectoryTalkgroup[]>(cacheKey, DIRECTORY_TTL_MS);
      if (cached) return cached;
    }

    try {
      const response = await fetch('https://api.tgif.network/dmr/talkgroups/json');
      if (!response.ok) throw new Error(`Directory request failed: ${response.status}`);
      const data = parseDirectoryTalkgroups(await response.json());
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      const stale = this.cache.getEvenIfStale<DirectoryTalkgroup[]>(cacheKey);
      if (stale) return stale;
      throw error;
    }
  }

  async getProfile(talkgroupId: number, force = false): Promise<TalkgroupProfile> {
    const cacheKey = `profile:${talkgroupId}`;
    if (!force) {
      const cached = this.cache.get<TalkgroupProfile>(cacheKey, PROFILE_TTL_MS);
      if (cached) return cached;
    }

    try {
      const response = await fetch(`https://tgif.network/tgprofile.php?id=${encodeURIComponent(talkgroupId)}`);
      if (!response.ok) throw new Error(`Profile request failed: ${response.status}`);
      const profile = parseProfileHtml(talkgroupId, await response.text());
      this.cache.set(cacheKey, profile);
      return profile;
    } catch (error) {
      const stale = this.cache.getEvenIfStale<TalkgroupProfile>(cacheKey);
      if (stale) return stale;
      throw error;
    }
  }

  async getStats(days = 30, topN = 10, search = ''): Promise<TalkgroupStatsRow[]> {
    const params = new URLSearchParams({
      days: String(days),
      topN: String(topN),
      search,
      export: 'json'
    });
    const cacheKey = `stats:${params.toString()}`;
    const cached = this.cache.get<TalkgroupStatsRow[]>(cacheKey, STATS_TTL_MS);
    if (cached) return cached;

    try {
      const response = await fetch(`https://tgif.network/talkgroup_stats.php?${params.toString()}`);
      if (!response.ok) throw new Error(`Stats request failed: ${response.status}`);
      const stats = parseStatsRows(await response.json());
      this.cache.set(cacheKey, stats);
      return stats;
    } catch (error) {
      const stale = this.cache.getEvenIfStale<TalkgroupStatsRow[]>(cacheKey);
      if (stale) return stale;
      throw error;
    }
  }

  async getCallsign(radioId: number): Promise<CallsignLookup | null> {
    const cacheKey = `callsign:${radioId}`;
    const cached = this.cache.get<CallsignLookup | null>(cacheKey, CALLSIGN_TTL_MS);
    if (cached !== null) return cached;

    try {
      const response = await fetch(`https://dmr.g7lrr.com/new/getcall.php?dmr_id=${encodeURIComponent(radioId)}`);
      if (!response.ok) throw new Error(`Callsign request failed: ${response.status}`);
      const text = await response.text();
      if (!text.trim()) {
        this.cache.set(cacheKey, null);
        return null;
      }
      const raw = JSON.parse(text) as Record<string, unknown>;
      const lookup: CallsignLookup = {
        radioId: String(raw.radio_id ?? radioId),
        callsign: String(raw.callsign ?? ''),
        name: String(raw.name ?? ''),
        city: String(raw.city ?? ''),
        state: String(raw.state ?? ''),
        country: String(raw.country ?? ''),
        image: typeof raw.image === 'string' && raw.image.trim() ? raw.image : null,
        lat: typeof raw.lat === 'string' && raw.lat.trim() ? raw.lat : null,
        lon: typeof raw.lon === 'string' && raw.lon.trim() ? raw.lon : null,
        fetchedAt: Date.now()
      };
      this.cache.set(cacheKey, lookup);
      return lookup;
    } catch {
      this.cache.set(cacheKey, null);
      return null;
    }
  }
}
