import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalCache } from '../domain/tgif/cache';
import { ConversationEngine } from '../domain/tgif/conversationEngine';
import { TgifMetadataClient } from '../domain/tgif/endpoints';
import { ActivityEventFilter } from '../domain/tgif/eventFilter';
import { TgifLiveClient } from '../domain/tgif/liveClient';
import type {
  ActiveTalkgroupState,
  ActivityEvent,
  CallsignLookup,
  ConnectionStatus,
  DirectoryTalkgroup,
  TalkgroupProfile,
  TalkgroupStatsRow
} from '../domain/tgif/types';

const initialConnection: ConnectionStatus = {
  phase: 'idle',
  connected: false,
  message: 'Idle',
  lastConnectedAt: null,
  lastEventAt: null,
  error: null
};

export function useTgifMonitor() {
  const engineRef = useRef(new ConversationEngine());
  const eventFilterRef = useRef(new ActivityEventFilter());
  const metadataRef = useRef(new TgifMetadataClient());
  const preferencesRef = useRef(new LocalCache('tgif-monitor-preferences'));
  const [connection, setConnection] = useState<ConnectionStatus>(initialConnection);
  const [talkgroups, setTalkgroups] = useState<ActiveTalkgroupState[]>([]);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [directory, setDirectory] = useState<Map<number, DirectoryTalkgroup>>(new Map());
  const [directoryStatus, setDirectoryStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [favorites, setFavorites] = useState<Set<number>>(
    () => new Set(preferencesRef.current.getEvenIfStale<number[]>('favorites') ?? [])
  );
  const [profiles, setProfiles] = useState<Record<number, TalkgroupProfile>>({});
  const [stats, setStats] = useState<TalkgroupStatsRow[]>([]);
  const [callsigns, setCallsigns] = useState<Record<number, CallsignLookup | null>>({});
  const [malformedCount, setMalformedCount] = useState(0);
  const [suppressedEventCount, setSuppressedEventCount] = useState(0);

  const liveClientRef = useRef<TgifLiveClient | null>(null);

  useEffect(() => {
    const client = new TgifLiveClient({
      onStatus: setConnection,
      onEvents: (events) => {
        if (!events.length) return;

        const { accepted, suppressed } = eventFilterRef.current.filter(events);
        if (suppressed) {
          setSuppressedEventCount((count) => count + suppressed);
        }
        if (!accepted.length) return;

        for (const event of accepted) {
          engineRef.current.ingest(event);
        }
        setRecentEvents((current) => [...accepted, ...current].slice(0, 150));
        setTalkgroups(engineRef.current.getStates());
      },
      onMalformed: () => setMalformedCount((count) => count + 1)
    });

    liveClientRef.current = client;
    client.connect();

    const interval = window.setInterval(() => {
      setTalkgroups(engineRef.current.getStates());
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      client.disconnect();
      liveClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDirectoryStatus('loading');
    metadataRef.current
      .getDirectory()
      .then((items) => {
        if (cancelled) return;
        setDirectory(new Map(items.map((item) => [item.id, item])));
        setDirectoryStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setDirectoryStatus('failed');
      });
    metadataRef.current
      .getStats(30, 10)
      .then(setStats)
      .catch(() => setStats([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback((talkgroupId: number) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(talkgroupId)) next.delete(talkgroupId);
      else next.add(talkgroupId);
      preferencesRef.current.set('favorites', Array.from(next));
      return next;
    });
  }, []);

  const loadProfile = useCallback(
    async (talkgroupId: number) => {
      if (profiles[talkgroupId]) return profiles[talkgroupId];
      const profile = await metadataRef.current.getProfile(talkgroupId);
      setProfiles((current) => ({ ...current, [talkgroupId]: profile }));
      return profile;
    },
    [profiles]
  );

  const loadCallsign = useCallback(
    async (radioId: number) => {
      if (Object.prototype.hasOwnProperty.call(callsigns, radioId)) return callsigns[radioId];
      const lookup = await metadataRef.current.getCallsign(radioId);
      setCallsigns((current) => ({ ...current, [radioId]: lookup }));
      return lookup;
    },
    [callsigns]
  );

  const reconnect = useCallback(() => {
    liveClientRef.current?.disconnect();
    liveClientRef.current?.connect();
  }, []);

  const statsByTalkgroup = useMemo(
    () => new Map(stats.map((row) => [Number(row.tgid), row])),
    [stats]
  );

  return {
    connection,
    talkgroups,
    recentEvents,
    directory,
    directoryStatus,
    favorites,
    profiles,
    statsByTalkgroup,
    callsigns,
    malformedCount,
    suppressedEventCount,
    reconnect,
    toggleFavorite,
    loadProfile,
    loadCallsign
  };
}
