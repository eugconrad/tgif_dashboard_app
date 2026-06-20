export type ConnectionPhase =
  | 'idle'
  | 'connecting'
  | 'socket-connected'
  | 'handshaking'
  | 'authorized'
  | 'backlog-loading'
  | 'live'
  | 'reconnecting'
  | 'failed'
  | 'disconnected';

export interface ConnectionStatus {
  phase: ConnectionPhase;
  connected: boolean;
  message: string;
  lastConnectedAt: number | null;
  lastEventAt: number | null;
  error: string | null;
}

export interface LastheardPayload {
  latitude?: string;
  longitude?: string;
  timestamp?: number;
  talkgroup?: number;
  radio_id?: number;
  repeater_id?: number;
  streamid?: number;
  rssi?: number;
  ber?: number;
  security_level?: string;
  admin?: 'no' | string | Record<string, unknown>;
  callsign?: string | null;
  name?: string | null;
  shortname?: string | null;
  rptbaseid?: number;
  rptcallsign?: string;
  talkgroup_name?: string | null;
  [key: string]: unknown;
}

export type ActivityEventKind = 'tx' | 'tx-stop' | 'backlog-tx' | 'unknown';
export type ActivityEventSource = 'socket-lastheard' | 'socket-lastheard-backlog';

export interface ActivityEvent {
  id: string;
  kind: ActivityEventKind;
  source: ActivityEventSource;
  receivedAt: number;
  tgifTimestamp: number | null;
  talkgroupId: number | null;
  talkgroupName: string | null;
  callsign: string | null;
  participantKey: string | null;
  radioId: number | null;
  repeaterId: number | null;
  streamId: number | null;
  shortName: string | null;
  name: string | null;
  rssi: number | null;
  ber: number | null;
  securityLevel: string | null;
  latitude: number | null;
  longitude: number | null;
  raw: LastheardPayload;
}

export interface CallsignActivity {
  participantKey: string;
  callsign: string | null;
  radioId: number | null;
  repeaterId: number | null;
  displayName: string | null;
  shortName: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  lastTxTimestamp: number | null;
  activeStreamIds: number[];
  txCount: number;
}

export interface ConversationMetrics {
  talkgroupId: number;
  windowMs: number;
  activeWindowMs: number;
  staleTimeoutMs: number;
  participantCount: number;
  transmissionCount: number;
  speakerChangeCount: number;
  uniqueSpeakerOrder: string[];
  lastSpeaker: string | null;
  lastActivityAt: number | null;
  score: number;
  reasons: string[];
}

export type TalkgroupLifecycle = 'active' | 'conversation' | 'stale' | 'expired';

export interface ActiveTalkgroupState {
  talkgroupId: number;
  talkgroupName: string | null;
  lifecycle: TalkgroupLifecycle;
  isActive: boolean;
  isConversation: boolean;
  firstSeenAt: number;
  lastSeenAt: number;
  lastTxTimestamp: number | null;
  participantCount: number;
  participants: Record<string, CallsignActivity>;
  activeStreamIds: number[];
  recentEvents: ActivityEvent[];
  metrics: ConversationMetrics;
  staleAt: number | null;
}

export interface DirectoryTalkgroup {
  id: number;
  idRaw: string;
  name: string;
  websiteRaw: string | null;
  websiteUrl: string | null;
  descriptionRaw: string | null;
  descriptionText: string | null;
  descriptionHtml: string | null;
  source: 'directory-json';
  updatedAt: number;
}

export interface TalkgroupProfile {
  talkgroupId: number;
  title: string | null;
  trusteeCallsign: string | null;
  contact: string | null;
  countryCode: string | null;
  languageCode: string | null;
  websiteText: string | null;
  websiteHref: string | null;
  websiteUrl: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  descriptionHtml: string | null;
  descriptionText: string | null;
  fetchedAt: number;
  parseStatus: 'ok' | 'missing' | 'partial' | 'error';
  parseWarnings: string[];
}

export interface TalkgroupStatsRow {
  tgid: string;
  tgname: string;
  keyups: number;
}

export interface CallsignLookup {
  radioId: string;
  callsign: string;
  name: string;
  city: string;
  state: string;
  country: string;
  image: string | null;
  lat: string | null;
  lon: string | null;
  fetchedAt: number;
}

export interface MonitorSnapshot {
  connection: ConnectionStatus;
  talkgroups: ActiveTalkgroupState[];
  recentEvents: ActivityEvent[];
}
