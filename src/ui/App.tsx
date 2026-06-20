import { Activity, AlertCircle, Filter, Heart, PlugZap, Radio, RefreshCw, Search, Star, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ActiveTalkgroupState, ActivityEvent } from '../domain/tgif/types';
import { useTgifMonitor } from './useTgifMonitor';

type FilterMode = 'all' | 'conversations' | 'favorites';
type SortMode = 'priority' | 'recent' | 'participants';

export function App() {
  const monitor = useTgifMonitor();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('priority');

  const selected = selectedId ? monitor.talkgroups.find((tg) => tg.talkgroupId === selectedId) ?? null : null;

  useEffect(() => {
    if (!selectedId && monitor.talkgroups.length) {
      setSelectedId(monitor.talkgroups[0].talkgroupId);
    }
  }, [monitor.talkgroups, selectedId]);

  useEffect(() => {
    if (selected && !monitor.profiles[selected.talkgroupId]) {
      monitor.loadProfile(selected.talkgroupId).catch(() => undefined);
    }
  }, [monitor, selected]);

  const visibleTalkgroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = monitor.talkgroups.filter((tg) => {
      const directory = monitor.directory.get(tg.talkgroupId);
      const name = tg.talkgroupName ?? directory?.name ?? '';
      const matchesQuery =
        !normalizedQuery ||
        String(tg.talkgroupId).includes(normalizedQuery) ||
        name.toLowerCase().includes(normalizedQuery) ||
        Object.values(tg.participants).some((participant) =>
          [participant.callsign, participant.shortName, participant.displayName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        );

      if (!matchesQuery) return false;
      if (filter === 'conversations') return tg.isConversation;
      if (filter === 'favorites') return monitor.favorites.has(tg.talkgroupId);
      return tg.lifecycle !== 'expired';
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'recent') return b.lastSeenAt - a.lastSeenAt;
      if (sort === 'participants') return b.participantCount - a.participantCount || b.metrics.score - a.metrics.score;
      const favoriteDelta = Number(monitor.favorites.has(b.talkgroupId)) - Number(monitor.favorites.has(a.talkgroupId));
      if (favoriteDelta) return favoriteDelta;
      if (a.isConversation !== b.isConversation) return a.isConversation ? -1 : 1;
      return b.metrics.score - a.metrics.score || b.lastSeenAt - a.lastSeenAt;
    });
  }, [filter, monitor.directory, monitor.favorites, monitor.talkgroups, query, sort]);

  const conversationCount = monitor.talkgroups.filter((tg) => tg.isConversation).length;
  const activeCount = monitor.talkgroups.filter((tg) => tg.isActive).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Radio size={28} aria-hidden />
          <div>
            <h1>TGIF Monitor</h1>
            <span>Live conversation dashboard</span>
          </div>
        </div>
        <div className="status-strip">
          <StatusPill label={monitor.connection.message} active={monitor.connection.connected} />
          <Metric label="Conversations" value={conversationCount} />
          <Metric label="Active TGs" value={activeCount} />
          <Metric label="Suppressed" value={monitor.suppressedEventCount} muted />
          <Metric label="Malformed" value={monitor.malformedCount} muted />
          <button className="icon-button" type="button" title="Reconnect" onClick={monitor.reconnect}>
            <RefreshCw size={18} aria-hidden />
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="panel talkgroup-panel">
          <div className="panel-header">
            <div>
              <h2>Live TGs</h2>
              <span>{monitor.directoryStatus === 'ready' ? 'Directory cached' : `Directory ${monitor.directoryStatus}`}</span>
            </div>
            <div className="compact-controls">
              <label className="search-box">
                <Search size={16} aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search TG or callsign"
                />
              </label>
            </div>
          </div>

          <div className="toolbar">
            <SegmentedControl
              value={filter}
              options={[
                ['all', 'All'],
                ['conversations', 'QSO'],
                ['favorites', 'Favs']
              ]}
              onChange={(value) => setFilter(value as FilterMode)}
            />
            <label className="select-control">
              <Filter size={15} aria-hidden />
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                <option value="priority">Priority</option>
                <option value="recent">Recent</option>
                <option value="participants">Participants</option>
              </select>
            </label>
          </div>

          <div className="talkgroup-list">
            {visibleTalkgroups.length ? (
              visibleTalkgroups.map((tg) => (
                <TalkgroupRow
                  key={tg.talkgroupId}
                  talkgroup={tg}
                  name={tg.talkgroupName ?? monitor.directory.get(tg.talkgroupId)?.name ?? null}
                  favorite={monitor.favorites.has(tg.talkgroupId)}
                  selected={tg.talkgroupId === selectedId}
                  onSelect={() => setSelectedId(tg.talkgroupId)}
                  onFavorite={() => monitor.toggleFavorite(tg.talkgroupId)}
                />
              ))
            ) : (
              <div className="empty-state">
                <PlugZap size={24} aria-hidden />
                <span>Waiting for matching live TGIF activity</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          {selected ? (
            <TalkgroupDetail
              talkgroup={selected}
              directoryName={monitor.directory.get(selected.talkgroupId)?.name ?? null}
              directoryDescription={monitor.directory.get(selected.talkgroupId)?.descriptionText ?? null}
              profile={monitor.profiles[selected.talkgroupId] ?? null}
              stats={monitor.statsByTalkgroup.get(selected.talkgroupId) ?? null}
              favorite={monitor.favorites.has(selected.talkgroupId)}
              callsigns={monitor.callsigns}
              onFavorite={() => monitor.toggleFavorite(selected.talkgroupId)}
              onLoadCallsign={(radioId) => monitor.loadCallsign(radioId)}
            />
          ) : (
            <div className="empty-state large">
              <Activity size={32} aria-hidden />
              <span>No active talkgroup selected</span>
            </div>
          )}
        </section>

        <aside className="panel log-panel">
          <div className="panel-header">
            <div>
              <h2>Activity Log</h2>
              <span>{monitor.recentEvents.length} recent events</span>
            </div>
          </div>
          <ActivityLog events={monitor.recentEvents} />
        </aside>
      </main>
    </div>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`status-pill ${active ? 'online' : 'offline'}`}>
      <span className="dot" />
      {label}
    </div>
  );
}

function Metric({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`metric ${muted ? 'muted' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          className={value === optionValue ? 'selected' : ''}
          type="button"
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TalkgroupRow({
  talkgroup,
  name,
  favorite,
  selected,
  onSelect,
  onFavorite
}: {
  talkgroup: ActiveTalkgroupState;
  name: string | null;
  favorite: boolean;
  selected: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  const participants = Object.values(talkgroup.participants);
  return (
    <button className={`tg-row ${selected ? 'selected' : ''}`} type="button" onClick={onSelect}>
      <div className="tg-row-main">
        <div className="tg-title-line">
          <span className="tg-id">TG {talkgroup.talkgroupId}</span>
          <span className={`badge ${talkgroup.lifecycle}`}>{talkgroup.isConversation ? 'Conversation' : talkgroup.lifecycle}</span>
        </div>
        <strong>{name ?? talkgroup.talkgroupName ?? 'Unknown talkgroup'}</strong>
        <span className="participants">{participants.map((participant) => participant.callsign ?? participant.participantKey).join(', ')}</span>
      </div>
      <div className="tg-row-side">
        <button
          className={`favorite-button ${favorite ? 'on' : ''}`}
          type="button"
          title={favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <Heart size={16} aria-hidden />
        </button>
        <span className="score">{talkgroup.metrics.score}</span>
        <span>{formatAge(Date.now() - talkgroup.lastSeenAt)}</span>
      </div>
    </button>
  );
}

function TalkgroupDetail({
  talkgroup,
  directoryName,
  directoryDescription,
  profile,
  stats,
  favorite,
  callsigns,
  onFavorite,
  onLoadCallsign
}: {
  talkgroup: ActiveTalkgroupState;
  directoryName: string | null;
  directoryDescription: string | null;
  profile: { title: string | null; trusteeCallsign: string | null; contact: string | null; imageUrl: string | null; websiteUrl: string | null; descriptionText: string | null; parseStatus: string; parseWarnings: string[] } | null;
  stats: { keyups: number; tgname: string } | null;
  favorite: boolean;
  callsigns: Record<number, { callsign: string; name: string; city: string; state: string; country: string; image: string | null } | null>;
  onFavorite: () => void;
  onLoadCallsign: (radioId: number) => Promise<unknown>;
}) {
  const participants = Object.values(talkgroup.participants).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  const displayName = profile?.title ?? talkgroup.talkgroupName ?? directoryName ?? `TG ${talkgroup.talkgroupId}`;

  return (
    <div className="detail-content">
      <div className="detail-hero">
        {profile?.imageUrl ? <img src={profile.imageUrl} alt="" /> : <div className="image-placeholder">TG</div>}
        <div>
          <div className="detail-title-line">
            <span className="tg-id">TG {talkgroup.talkgroupId}</span>
            <button className={`favorite-button ${favorite ? 'on' : ''}`} type="button" title="Favorite" onClick={onFavorite}>
              <Star size={17} aria-hidden />
            </button>
          </div>
          <h2>{displayName}</h2>
          <div className="detail-metrics">
            <Metric label="Participants" value={talkgroup.metrics.participantCount} />
            <Metric label="TX" value={talkgroup.metrics.transmissionCount} />
            <Metric label="Changes" value={talkgroup.metrics.speakerChangeCount} />
            <Metric label="Score" value={talkgroup.metrics.score} />
          </div>
        </div>
      </div>

      <section className="detail-section">
        <h3>Conversation</h3>
        <div className="reason-list">
          {talkgroup.metrics.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <h3>Participants</h3>
        <div className="participant-list">
          {participants.map((participant) => (
            <div key={participant.participantKey} className="participant-row">
              {participant.radioId && callsigns[participant.radioId]?.image ? (
                <img className="callsign-avatar" src={callsigns[participant.radioId]?.image ?? ''} alt="" />
              ) : null}
              <div>
                <strong>{participant.callsign ?? participant.participantKey}</strong>
                <span>
                  {formatParticipantSubtitle(
                    participant.shortName ?? participant.displayName,
                    participant.radioId ? callsigns[participant.radioId] : null
                  )}
                </span>
              </div>
              <div className="participant-actions">
                <span>{participant.txCount} TX</span>
                {participant.radioId ? (
                  <button type="button" title="Load callsign profile" onClick={() => onLoadCallsign(participant.radioId!)}>
                    <Users size={15} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-section profile-grid">
        <div>
          <h3>Profile</h3>
          <dl>
            <dt>Trustee</dt>
            <dd>{profile?.trusteeCallsign ?? 'Unknown'}</dd>
            <dt>Contact</dt>
            <dd>{profile?.contact ?? 'Unknown'}</dd>
            <dt>Website</dt>
            <dd>{profile?.websiteUrl ? <a href={profile.websiteUrl}>{profile.websiteUrl}</a> : 'None'}</dd>
            <dt>30 day keyups</dt>
            <dd>{stats?.keyups ?? 'Not loaded'}</dd>
          </dl>
          {profile?.parseStatus === 'partial' ? (
            <p className="warning-line">
              <AlertCircle size={15} aria-hidden />
              {profile.parseWarnings.join(', ')}
            </p>
          ) : null}
        </div>
        <div>
          <h3>Description</h3>
          <p>{profile?.descriptionText ?? directoryDescription ?? 'No description available.'}</p>
        </div>
      </section>
    </div>
  );
}

function ActivityLog({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return (
      <div className="empty-state">
        <Activity size={22} aria-hidden />
        <span>No activity received yet</span>
      </div>
    );
  }

  return (
    <div className="activity-log">
      {events.map((event) => (
        <div key={`${event.id}:${event.receivedAt}`} className={`log-row ${event.kind}`}>
          <span>{formatClock(event.receivedAt)}</span>
          <strong>TG {event.talkgroupId ?? '?'}</strong>
          <em>{event.callsign ?? event.participantKey ?? 'Unknown'}</em>
          <small>{event.kind}</small>
        </div>
      ))}
    </div>
  );
}

function formatAge(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatParticipantSubtitle(
  fallbackName: string | null,
  lookup: { name: string; city: string; state: string; country: string } | null | undefined
) {
  if (!lookup) return fallbackName ?? 'No display name';
  const location = [lookup.city, lookup.state || lookup.country].filter(Boolean).join(', ');
  return [lookup.name || fallbackName, location].filter(Boolean).join(' - ') || 'No display name';
}
