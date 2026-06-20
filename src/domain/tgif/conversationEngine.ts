import { isTransmissionEvent } from './normalizer';
import type {
  ActiveTalkgroupState,
  ActivityEvent,
  CallsignActivity,
  ConversationMetrics,
  TalkgroupLifecycle
} from './types';

export interface ConversationEngineConfig {
  activeWindowMs: number;
  conversationWindowMs: number;
  staleTimeoutMs: number;
  retentionMs: number;
  maxEventsPerTalkgroup: number;
}

export const defaultConversationConfig: ConversationEngineConfig = {
  activeWindowMs: 10 * 60 * 1000,
  conversationWindowMs: 5 * 60 * 1000,
  staleTimeoutMs: 60 * 1000,
  retentionMs: 24 * 60 * 60 * 1000,
  maxEventsPerTalkgroup: 200
};

interface TalkgroupBucket {
  events: ActivityEvent[];
  firstSeenAt: number;
}

export class ConversationEngine {
  private readonly config: ConversationEngineConfig;
  private readonly buckets = new Map<number, TalkgroupBucket>();
  private readonly seenEventIds = new Set<string>();

  constructor(config: Partial<ConversationEngineConfig> = {}) {
    this.config = { ...defaultConversationConfig, ...config };
  }

  ingest(event: ActivityEvent): ActiveTalkgroupState | null {
    if (!event.talkgroupId) return null;
    if (this.seenEventIds.has(event.id)) {
      return this.getState(event.talkgroupId, event.receivedAt);
    }

    this.seenEventIds.add(event.id);
    const bucket = this.buckets.get(event.talkgroupId) ?? {
      events: [],
      firstSeenAt: event.receivedAt
    };

    bucket.events.push(event);
    bucket.events.sort((a, b) => getEventTime(a) - getEventTime(b));
    if (bucket.events.length > this.config.maxEventsPerTalkgroup) {
      bucket.events.splice(0, bucket.events.length - this.config.maxEventsPerTalkgroup);
    }

    this.buckets.set(event.talkgroupId, bucket);
    this.expire(event.receivedAt);
    return this.getState(event.talkgroupId, event.receivedAt);
  }

  getStates(now = Date.now()): ActiveTalkgroupState[] {
    this.expire(now);
    return Array.from(this.buckets.keys())
      .map((talkgroupId) => this.getState(talkgroupId, now))
      .filter((state): state is ActiveTalkgroupState => Boolean(state))
      .sort(sortTalkgroups);
  }

  getState(talkgroupId: number, now = Date.now()): ActiveTalkgroupState | null {
    const bucket = this.buckets.get(talkgroupId);
    if (!bucket || bucket.events.length === 0) return null;

    const retainedEvents = bucket.events.filter((event) => now - getEventTime(event) <= this.config.retentionMs);
    if (retainedEvents.length === 0) return null;

    const txEvents = retainedEvents.filter(isTransmissionEvent);
    const lastTx = txEvents.at(-1) ?? null;
    const lastActivity = lastTx ? getEventTime(lastTx) : getEventTime(retainedEvents.at(-1)!);
    const recentForActive = txEvents.filter((event) => now - getEventTime(event) <= this.config.activeWindowMs);
    const recentForConversation = txEvents.filter(
      (event) => now - getEventTime(event) <= this.config.conversationWindowMs
    );

    const participants = buildParticipants(recentForActive);
    const metrics = this.buildMetrics(talkgroupId, recentForConversation, now);
    const isActive = recentForActive.length > 0 && now - lastActivity <= this.config.activeWindowMs;
    const isConversation =
      metrics.participantCount >= 2 &&
      metrics.transmissionCount >= 2 &&
      now - lastActivity <= this.config.conversationWindowMs;
    const lifecycle = getLifecycle(isConversation, isActive, lastActivity, now, this.config.staleTimeoutMs);

    return {
      talkgroupId,
      talkgroupName: getLatestTalkgroupName(retainedEvents),
      lifecycle,
      isActive,
      isConversation,
      firstSeenAt: bucket.firstSeenAt,
      lastSeenAt: lastActivity,
      lastTxTimestamp: lastTx?.tgifTimestamp ?? null,
      participantCount: Object.keys(participants).length,
      participants,
      activeStreamIds: getActiveStreamIds(recentForActive),
      recentEvents: retainedEvents.slice(-25).reverse(),
      metrics,
      staleAt: isActive ? null : lastActivity + this.config.activeWindowMs
    };
  }

  expire(now = Date.now()) {
    for (const [talkgroupId, bucket] of this.buckets.entries()) {
      bucket.events = bucket.events.filter((event) => now - getEventTime(event) <= this.config.retentionMs);
      if (bucket.events.length === 0) {
        this.buckets.delete(talkgroupId);
      }
    }
  }

  private buildMetrics(talkgroupId: number, events: ActivityEvent[], now: number): ConversationMetrics {
    const participantKeys = events.map((event) => event.participantKey).filter((key): key is string => Boolean(key));
    const uniqueParticipants = Array.from(new Set(participantKeys));
    const collapsedSpeakers: string[] = [];

    for (const key of participantKeys) {
      if (collapsedSpeakers.at(-1) !== key) collapsedSpeakers.push(key);
    }

    const speakerChangeCount = Math.max(0, collapsedSpeakers.length - 1);
    const lastActivityAt = events.length ? getEventTime(events.at(-1)!) : null;
    const recencyAge = lastActivityAt ? now - lastActivityAt : Infinity;
    const recencyBonus = recencyAge <= 60_000 ? 20 : recencyAge <= 180_000 ? 10 : 0;
    const activeStreamBonus = getActiveStreamIds(events).length > 0 ? 5 : 0;
    const stalePenalty = recencyAge > this.config.conversationWindowMs ? 30 : 0;
    const score =
      uniqueParticipants.length * 10 +
      Math.min(events.length, 10) * 2 +
      speakerChangeCount * 6 +
      recencyBonus +
      activeStreamBonus -
      stalePenalty;

    const reasons: string[] = [];
    if (uniqueParticipants.length) reasons.push(`${uniqueParticipants.length} participant${uniqueParticipants.length === 1 ? '' : 's'}`);
    if (events.length) reasons.push(`${events.length} transmission${events.length === 1 ? '' : 's'}`);
    if (speakerChangeCount) reasons.push(`${speakerChangeCount} speaker change${speakerChangeCount === 1 ? '' : 's'}`);
    if (lastActivityAt) reasons.push(`last activity ${formatAge(recencyAge)} ago`);

    return {
      talkgroupId,
      windowMs: this.config.conversationWindowMs,
      activeWindowMs: this.config.activeWindowMs,
      staleTimeoutMs: this.config.staleTimeoutMs,
      participantCount: uniqueParticipants.length,
      transmissionCount: events.length,
      speakerChangeCount,
      uniqueSpeakerOrder: collapsedSpeakers,
      lastSpeaker: collapsedSpeakers.at(-1) ?? null,
      lastActivityAt,
      score,
      reasons
    };
  }
}

export function sortTalkgroups(a: ActiveTalkgroupState, b: ActiveTalkgroupState) {
  if (a.isConversation !== b.isConversation) return a.isConversation ? -1 : 1;
  if (a.metrics.score !== b.metrics.score) return b.metrics.score - a.metrics.score;
  return b.lastSeenAt - a.lastSeenAt;
}

function buildParticipants(events: ActivityEvent[]) {
  const participants: Record<string, CallsignActivity> = {};
  for (const event of events) {
    if (!event.participantKey) continue;
    const existing = participants[event.participantKey];
    const eventTime = getEventTime(event);
    participants[event.participantKey] = {
      participantKey: event.participantKey,
      callsign: event.callsign ?? existing?.callsign ?? null,
      radioId: event.radioId ?? existing?.radioId ?? null,
      repeaterId: event.repeaterId ?? existing?.repeaterId ?? null,
      displayName: event.name ?? existing?.displayName ?? null,
      shortName: event.shortName ?? existing?.shortName ?? null,
      firstSeenAt: existing ? Math.min(existing.firstSeenAt, eventTime) : eventTime,
      lastSeenAt: existing ? Math.max(existing.lastSeenAt, eventTime) : eventTime,
      lastTxTimestamp: event.tgifTimestamp ?? existing?.lastTxTimestamp ?? null,
      activeStreamIds: mergeStreamIds(existing?.activeStreamIds ?? [], event.streamId),
      txCount: (existing?.txCount ?? 0) + (isTransmissionEvent(event) ? 1 : 0)
    };
  }
  return participants;
}

function getLifecycle(
  isConversation: boolean,
  isActive: boolean,
  lastActivity: number,
  now: number,
  staleTimeoutMs: number
): TalkgroupLifecycle {
  if (isConversation) return 'conversation';
  if (isActive) return 'active';
  if (now - lastActivity <= staleTimeoutMs) return 'stale';
  return 'expired';
}

function getEventTime(event: ActivityEvent) {
  return event.tgifTimestamp ? event.tgifTimestamp * 1000 : event.receivedAt;
}

function getLatestTalkgroupName(events: ActivityEvent[]) {
  for (const event of [...events].reverse()) {
    if (event.talkgroupName) return event.talkgroupName;
  }
  return null;
}

function getActiveStreamIds(events: ActivityEvent[]) {
  return Array.from(new Set(events.map((event) => event.streamId).filter((id): id is number => Boolean(id && id > 0))));
}

function mergeStreamIds(existing: number[], streamId: number | null) {
  if (!streamId || streamId <= 0) return existing;
  return Array.from(new Set([...existing, streamId]));
}

function formatAge(ageMs: number) {
  if (!Number.isFinite(ageMs)) return 'unknown';
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}
