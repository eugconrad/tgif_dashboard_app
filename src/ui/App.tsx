import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  Copy,
  ExternalLink,
  Heart,
  History,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings,
  SignalHigh,
  Star,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ActiveTalkgroupState, ActivityEvent, CallsignActivity } from '../domain/tgif/types';
import { useTgifMonitor } from './useTgifMonitor';

type FilterMode = 'all' | 'conversations' | 'favorites';
type SortMode = 'priority' | 'recent' | 'participants';
type NavSection = 'monitor' | 'favorites' | 'history' | 'statistics' | 'directory' | 'settings';

export function App() {
  const monitor = useTgifMonitor();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('priority');
  const [activeSection, setActiveSection] = useState<NavSection>('monitor');
  const [feedPaused, setFeedPaused] = useState(false);
  const [feedLimit, setFeedLimit] = useState(60);

  const selected = selectedId ? monitor.talkgroups.find((tg) => tg.talkgroupId === selectedId) ?? null : null;
  const selectedEvents = useMemo(
    () => (selected ? monitor.recentEvents.filter((event) => event.talkgroupId === selected.talkgroupId).slice(0, 40) : []),
    [monitor.recentEvents, selected]
  );

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
      const profile = monitor.profiles[tg.talkgroupId];
      const searchable = [
        tg.talkgroupId,
        tg.talkgroupName,
        directory?.name,
        profile?.countryCode,
        profile?.languageCode,
        ...Object.values(tg.participants).flatMap((participant) => [
          participant.callsign,
          participant.shortName,
          participant.displayName
        ])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
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
  }, [filter, monitor.directory, monitor.favorites, monitor.profiles, monitor.talkgroups, query, sort]);

  const conversationCount = monitor.talkgroups.filter((tg) => tg.isConversation).length;
  const activeCount = monitor.talkgroups.filter((tg) => tg.isActive).length;
  const totalCallsigns = useMemo(
    () =>
      new Set(
        monitor.talkgroups.flatMap((tg) =>
          Object.values(tg.participants)
            .map((participant) => participant.callsign ?? participant.participantKey)
            .filter(Boolean)
        )
      ).size,
    [monitor.talkgroups]
  );

  const feedEvents = feedPaused ? [] : monitor.recentEvents.slice(0, feedLimit);

  return (
    <div className="ops-shell">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="ops-workspace">
        <Header
          connected={monitor.connection.connected}
          phase={monitor.connection.phase}
          message={monitor.connection.message}
          lastEventAt={monitor.connection.lastEventAt}
          activeCount={activeCount}
          conversationCount={conversationCount}
          totalCallsigns={totalCallsigns}
          suppressed={monitor.suppressedEventCount}
          malformed={monitor.malformedCount}
          onReconnect={monitor.reconnect}
        />

        {activeSection !== 'monitor' ? (
          <Placeholder section={activeSection} />
        ) : (
          <main className="monitor-grid">
            <section className="panel live-list-panel">
              <PanelTitle
                label="Active Talkgroups"
                detail={monitor.directoryStatus === 'ready' ? 'Directory cached' : `Directory ${monitor.directoryStatus}`}
              />

              <FilterBar
                query={query}
                filter={filter}
                sort={sort}
                conversationCount={conversationCount}
                activeCount={activeCount}
                favoriteCount={monitor.favorites.size}
                onQuery={setQuery}
                onFilter={setFilter}
                onSort={setSort}
              />

              <div className="tg-list" aria-label="Active talkgroups">
                {visibleTalkgroups.length ? (
                  visibleTalkgroups.map((tg) => (
                    <TalkgroupCard
                      key={tg.talkgroupId}
                      talkgroup={tg}
                      name={tg.talkgroupName ?? monitor.directory.get(tg.talkgroupId)?.name ?? null}
                      events={monitor.recentEvents.filter((event) => event.talkgroupId === tg.talkgroupId).slice(0, 16)}
                      favorite={monitor.favorites.has(tg.talkgroupId)}
                      selected={tg.talkgroupId === selectedId}
                      onSelect={() => setSelectedId(tg.talkgroupId)}
                      onFavorite={() => monitor.toggleFavorite(tg.talkgroupId)}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={<SignalHigh size={26} />}
                    title="Listening for TGIF activity"
                    detail="Live talkgroups will appear here as transmissions arrive."
                  />
                )}
              </div>
            </section>

            <section className="panel cockpit-panel">
              {selected ? (
                <TalkgroupCockpit
                  talkgroup={selected}
                  directoryName={monitor.directory.get(selected.talkgroupId)?.name ?? null}
                  directoryDescription={monitor.directory.get(selected.talkgroupId)?.descriptionText ?? null}
                  profile={monitor.profiles[selected.talkgroupId] ?? null}
                  stats={monitor.statsByTalkgroup.get(selected.talkgroupId) ?? null}
                  events={selectedEvents}
                  favorite={monitor.favorites.has(selected.talkgroupId)}
                  callsigns={monitor.callsigns}
                  onFavorite={() => monitor.toggleFavorite(selected.talkgroupId)}
                  onLoadCallsign={(radioId) => monitor.loadCallsign(radioId)}
                />
              ) : (
                <EmptyState
                  icon={<Radio size={30} />}
                  title="No talkgroup selected"
                  detail="Select an active TG to open the live cockpit."
                  large
                />
              )}
            </section>

            <aside className="panel feed-panel">
              <PanelTitle
                label="Live Activity Feed"
                detail={feedPaused ? 'Paused' : `${monitor.recentEvents.length} events buffered`}
                action={
                  <button className="console-button compact" type="button" onClick={() => setFeedPaused((value) => !value)}>
                    {feedPaused ? <Play size={14} /> : <Pause size={14} />}
                    {feedPaused ? 'Resume' : 'Pause'}
                  </button>
                }
              />
              <ActivityFeed events={feedEvents} paused={feedPaused} onLoadMore={() => setFeedLimit((limit) => limit + 40)} />
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  activeSection,
  onSectionChange
}: {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
}) {
  const items: Array<[NavSection, string, JSX.Element]> = [
    ['monitor', 'Monitor', <Radio size={19} />],
    ['favorites', 'Favorites', <Star size={19} />],
    ['history', 'History', <History size={19} />],
    ['statistics', 'Statistics', <BarChart3 size={19} />],
    ['directory', 'Directory', <Activity size={19} />],
    ['settings', 'Settings', <Settings size={19} />]
  ];

  return (
    <nav className="side-rail" aria-label="Application navigation">
      <div className="rail-mark">
        <SignalHigh size={25} />
      </div>
      <div className="rail-items">
        {items.map(([section, label, icon]) => (
          <button
            key={section}
            className={activeSection === section ? 'active' : ''}
            type="button"
            title={label}
            onClick={() => onSectionChange(section)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="rail-version">v0.1</div>
    </nav>
  );
}

function Header({
  connected,
  phase,
  message,
  lastEventAt,
  activeCount,
  conversationCount,
  totalCallsigns,
  suppressed,
  malformed,
  onReconnect
}: {
  connected: boolean;
  phase: string;
  message: string;
  lastEventAt: number | null;
  activeCount: number;
  conversationCount: number;
  totalCallsigns: number;
  suppressed: number;
  malformed: number;
  onReconnect: () => void;
}) {
  return (
    <header className="ops-header">
      <div className="ops-title">
        <div className="brand-glyph">
          <Radio size={24} />
        </div>
        <div>
          <h1>TGIF Dashboard</h1>
          <span>Live radio operations console</span>
        </div>
      </div>

      <div className="header-status">
        <LiveBadge connected={connected} label={connected ? 'Live' : 'Offline'} />
        <div className="socket-state">
          <strong>{message}</strong>
          <span>Socket.IO / {phase}</span>
        </div>
        <HeaderMetric label="Last update" value={lastEventAt ? formatClock(lastEventAt) : '--:--:--'} />
        <HeaderMetric label="Active TGs" value={String(activeCount)} />
        <HeaderMetric label="Conversations" value={String(conversationCount)} accent />
        <HeaderMetric label="Callsigns" value={String(totalCallsigns)} />
        <HeaderMetric label="Filtered" value={String(suppressed)} muted />
        {malformed ? <HeaderMetric label="Malformed" value={String(malformed)} warning /> : null}
        <button className="console-button icon-only" type="button" title="Reconnect" onClick={onReconnect}>
          <RefreshCw size={17} />
        </button>
      </div>
    </header>
  );
}

function FilterBar({
  query,
  filter,
  sort,
  conversationCount,
  activeCount,
  favoriteCount,
  onQuery,
  onFilter,
  onSort
}: {
  query: string;
  filter: FilterMode;
  sort: SortMode;
  conversationCount: number;
  activeCount: number;
  favoriteCount: number;
  onQuery: (value: string) => void;
  onFilter: (value: FilterMode) => void;
  onSort: (value: SortMode) => void;
}) {
  return (
    <div className="filter-stack">
      <label className="console-search">
        <Search size={16} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search TG ID, name, callsign..." />
      </label>

      <div className="chip-row">
        <Chip selected={filter === 'conversations'} onClick={() => onFilter('conversations')}>
          Conversations <span>{conversationCount}</span>
        </Chip>
        <Chip selected={filter === 'all'} onClick={() => onFilter('all')}>
          All Active <span>{activeCount}</span>
        </Chip>
        <Chip selected={filter === 'favorites'} onClick={() => onFilter('favorites')}>
          Favorites <span>{favoriteCount}</span>
        </Chip>
      </div>

      <div className="chip-row compact">
        <span className="sort-label">Sort signal</span>
        <Chip selected={sort === 'priority'} onClick={() => onSort('priority')}>
          Score
        </Chip>
        <Chip selected={sort === 'recent'} onClick={() => onSort('recent')}>
          Recent
        </Chip>
        <Chip selected={sort === 'participants'} onClick={() => onSort('participants')}>
          People
        </Chip>
      </div>
    </div>
  );
}

function TalkgroupCard({
  talkgroup,
  name,
  events,
  favorite,
  selected,
  onSelect,
  onFavorite
}: {
  talkgroup: ActiveTalkgroupState;
  name: string | null;
  events: ActivityEvent[];
  favorite: boolean;
  selected: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  const participants = Object.values(talkgroup.participants);
  const stateLabel = talkgroup.isConversation ? '2+ Conversation' : talkgroup.participantCount > 1 ? 'Multi-user' : 'Active';

  return (
    <button className={`tg-card ${selected ? 'selected' : ''} ${talkgroup.isConversation ? 'conversation' : ''}`} type="button" onClick={onSelect}>
      <div className="tg-accent">
        <button
          className={`favorite-star ${favorite ? 'on' : ''}`}
          type="button"
          title={favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <Star size={17} />
        </button>
      </div>

      <div className="tg-card-body">
        <div className="tg-card-top">
          <div>
            <strong>TG {talkgroup.talkgroupId}</strong>
            <span>{name ?? talkgroup.talkgroupName ?? 'Unknown talkgroup'}</span>
          </div>
          <StatusBadge state={talkgroup.lifecycle} label={stateLabel} />
        </div>

        <div className="tg-card-bottom">
          <div className="participant-cluster">
            <Users size={14} />
            <span>{talkgroup.participantCount}</span>
            <em>{participants.map(formatParticipantName).slice(0, 3).join(', ') || 'No callsign'}</em>
          </div>
          <div className="activity-mini">
            <ScoreRing score={talkgroup.metrics.score} conversation={talkgroup.isConversation} />
            <Sparkline events={events} score={talkgroup.metrics.score} />
            <span>{formatAge(Date.now() - talkgroup.lastSeenAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TalkgroupCockpit({
  talkgroup,
  directoryName,
  directoryDescription,
  profile,
  stats,
  events,
  favorite,
  callsigns,
  onFavorite,
  onLoadCallsign
}: {
  talkgroup: ActiveTalkgroupState;
  directoryName: string | null;
  directoryDescription: string | null;
  profile: {
    title: string | null;
    trusteeCallsign: string | null;
    contact: string | null;
    imageUrl: string | null;
    websiteUrl: string | null;
    descriptionText: string | null;
    parseStatus: string;
    parseWarnings: string[];
  } | null;
  stats: { keyups: number; tgname: string } | null;
  events: ActivityEvent[];
  favorite: boolean;
  callsigns: Record<number, { callsign: string; name: string; city: string; state: string; country: string; image: string | null } | null>;
  onFavorite: () => void;
  onLoadCallsign: (radioId: number) => Promise<unknown>;
}) {
  const participants = Object.values(talkgroup.participants).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  const displayName = profile?.title ?? talkgroup.talkgroupName ?? directoryName ?? `TG ${talkgroup.talkgroupId}`;
  const description = profile?.descriptionText ?? directoryDescription ?? 'No profile description available yet.';

  return (
    <div className="cockpit">
      <div className="cockpit-hero">
        <div className="tg-tile">
          <span>TG</span>
          <strong>{talkgroup.talkgroupId}</strong>
        </div>

        <div className="cockpit-heading">
          <div className="cockpit-kicker">
            <StatusBadge state={talkgroup.lifecycle} label={talkgroup.isConversation ? 'Live conversation' : 'Live activity'} />
            <span>{formatAge(Date.now() - talkgroup.lastSeenAt)} since last TX</span>
          </div>
          <h2>{displayName}</h2>
          <div className="cockpit-actions">
            <button className={`console-button ${favorite ? 'favorite-on' : ''}`} type="button" onClick={onFavorite}>
              <Heart size={15} />
              {favorite ? 'Favorited' : 'Favorite'}
            </button>
            <button className="console-button" type="button" onClick={() => copyText(String(talkgroup.talkgroupId))}>
              <Copy size={15} />
              Copy TG
            </button>
            {profile?.websiteUrl ? (
              <a className="console-button link-button" href={profile.websiteUrl}>
                <ExternalLink size={15} />
                Profile
              </a>
            ) : null}
          </div>
        </div>

        <div className="signal-orb">
          <ScoreRing score={talkgroup.metrics.score} conversation={talkgroup.isConversation} large />
          <span>Signal</span>
        </div>
      </div>

      <div className="cockpit-metrics">
        <ConsoleMetric label="Participants" value={String(talkgroup.metrics.participantCount)} sub="recent callsigns" />
        <ConsoleMetric label="TX count" value={String(talkgroup.metrics.transmissionCount)} sub="conversation window" />
        <ConsoleMetric label="Speaker changes" value={String(talkgroup.metrics.speakerChangeCount)} sub="back-and-forth" />
        <ConsoleMetric label="30d keyups" value={stats ? String(stats.keyups) : '--'} sub={stats?.tgname ?? 'stats cache'} />
      </div>

      <div className="cockpit-grid">
        <section className="module participants-module">
          <ModuleHeader title="Active Participants" detail={`${participants.length} recent`} />
          <div className="participant-stack">
            {participants.length ? (
              participants.map((participant) => (
                <ParticipantRow
                  key={participant.participantKey}
                  participant={participant}
                  lookup={participant.radioId ? callsigns[participant.radioId] : null}
                  score={talkgroup.metrics.score}
                  onLoadCallsign={participant.radioId ? () => onLoadCallsign(participant.radioId!) : undefined}
                />
              ))
            ) : (
              <MiniEmpty text="No active participants in the current window." />
            )}
          </div>
        </section>

        <section className="module profile-module">
          <ModuleHeader title="Talkgroup Profile" detail={profile ? profile.parseStatus : 'loading'} />
          <div className="profile-block">
            {profile?.imageUrl ? <img src={profile.imageUrl} alt="" /> : <div className="profile-fallback">TG</div>}
            <div>
              <dl>
                <dt>Trustee</dt>
                <dd>{profile?.trusteeCallsign ?? 'Unknown'}</dd>
                <dt>Contact</dt>
                <dd>{profile?.contact ?? 'Unknown'}</dd>
                <dt>Website</dt>
                <dd>{profile?.websiteUrl ? <a href={profile.websiteUrl}>{profile.websiteUrl}</a> : 'None'}</dd>
              </dl>
            </div>
          </div>
          {profile?.parseStatus === 'partial' ? (
            <p className="warning-line">
              <AlertCircle size={15} />
              {profile.parseWarnings.join(', ')}
            </p>
          ) : null}
          <p className="profile-description">{description}</p>
        </section>

        <section className="module activity-module">
          <ModuleHeader title={`Recent Activity (TG ${talkgroup.talkgroupId})`} detail={`${events.length} events`} />
          <Timeline events={events} />
          <div className="activity-chart">
            <Sparkline events={events} score={talkgroup.metrics.score} large />
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityFeed({ events, paused, onLoadMore }: { events: ActivityEvent[]; paused: boolean; onLoadMore: () => void }) {
  if (paused) {
    return <EmptyState icon={<Pause size={24} />} title="Feed paused" detail="Live state continues updating. Resume to show new log entries." />;
  }

  if (!events.length) {
    return <EmptyState icon={<Activity size={24} />} title="Waiting for live events" detail="TGIF events will stream here as they arrive." />;
  }

  return (
    <div className="feed-stack">
      {events.map((event, index) => (
        <FeedRow key={`${event.id}:${event.receivedAt}:${index}`} event={event} hot={index < 3} />
      ))}
      <button className="load-more" type="button" onClick={onLoadMore}>
        Load more events
      </button>
    </div>
  );
}

function FeedRow({ event, hot }: { event: ActivityEvent; hot: boolean }) {
  const isStop = event.kind === 'tx-stop';
  return (
    <div className={`feed-row ${isStop ? 'stop' : 'tx'} ${hot ? 'hot' : ''}`}>
      <span className="feed-icon">{isStop ? 'v' : '^'}</span>
      <time>{formatClock(event.receivedAt)}</time>
      <strong>{event.callsign ?? event.participantKey ?? 'Unknown'}</strong>
      <span className="feed-tg">TG {event.talkgroupId ?? '?'}</span>
      <em>{isStop ? 'End TX' : event.source === 'socket-lastheard-backlog' ? 'Backlog' : 'Transmission'}</em>
    </div>
  );
}

function Timeline({ events }: { events: ActivityEvent[] }) {
  if (!events.length) return <MiniEmpty text="No recent activity for this TG yet." />;
  return (
    <div className="timeline">
      {events.slice(0, 8).map((event, index) => (
        <div className="timeline-row" key={`${event.id}:${index}`}>
          <time>{formatClock(event.receivedAt)}</time>
          <strong>{event.callsign ?? event.participantKey ?? 'Unknown'}</strong>
          <span>{event.kind === 'tx-stop' ? 'End transmission' : 'Transmission'}</span>
        </div>
      ))}
    </div>
  );
}

function ParticipantRow({
  participant,
  lookup,
  score,
  onLoadCallsign
}: {
  participant: CallsignActivity;
  lookup: { name: string; city: string; state: string; country: string; image: string | null } | null | undefined;
  score: number;
  onLoadCallsign?: () => void;
}) {
  const level = Math.min(100, Math.max(18, participant.txCount * 16 + score / 3));
  return (
    <div className="participant-row">
      {lookup?.image ? <img className="callsign-avatar" src={lookup.image} alt="" /> : <div className="callsign-avatar fallback" />}
      <div className="participant-main">
        <strong>{participant.callsign ?? participant.participantKey}</strong>
        <span>{formatParticipantSubtitle(participant.shortName ?? participant.displayName, lookup)}</span>
      </div>
      <div className="participant-meter">
        <div className="meter-track">
          <span style={{ width: `${level}%` }} />
        </div>
        <button type="button" disabled={!onLoadCallsign} onClick={onLoadCallsign} title="Load callsign details">
          {participant.txCount} TX
        </button>
      </div>
    </div>
  );
}

function Sparkline({ events, score, large = false }: { events: ActivityEvent[]; score: number; large?: boolean }) {
  const values = deriveSparkValues(events, score, large ? 34 : 18);
  return (
    <div className={`sparkline ${large ? 'large' : ''}`} aria-hidden>
      {values.map((value, index) => (
        <span key={index} style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}

function ScoreRing({ score, conversation, large = false }: { score: number; conversation: boolean; large?: boolean }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={`score-ring ${conversation ? 'conversation' : ''} ${large ? 'large' : ''}`} style={{ '--score': `${clamped * 3.6}deg` } as React.CSSProperties}>
      <span>{clamped}</span>
    </div>
  );
}

function LiveBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className={`live-badge ${connected ? 'connected' : 'offline'}`}>
      <span />
      {label}
    </div>
  );
}

function StatusBadge({ state, label }: { state: string; label: string }) {
  return <span className={`status-badge ${state}`}>{label}</span>;
}

function HeaderMetric({
  label,
  value,
  accent = false,
  warning = false,
  muted = false
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`header-metric ${accent ? 'accent' : ''} ${warning ? 'warning' : ''} ${muted ? 'muted' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConsoleMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="console-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{sub}</em>
    </div>
  );
}

function PanelTitle({ label, detail, action }: { label: string; detail: string; action?: JSX.Element }) {
  return (
    <div className="panel-title">
      <div>
        <h2>{label}</h2>
        <span>{detail}</span>
      </div>
      {action}
    </div>
  );
}

function ModuleHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="module-header">
      <h3>{title}</h3>
      <span>{detail}</span>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`chip ${selected ? 'selected' : ''}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function EmptyState({ icon, title, detail, large = false }: { icon: JSX.Element; title: string; detail: string; large?: boolean }) {
  return (
    <div className={`empty-state ${large ? 'large' : ''}`}>
      {icon}
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function MiniEmpty({ text }: { text: string }) {
  return <div className="mini-empty">{text}</div>;
}

function Placeholder({ section }: { section: NavSection }) {
  const label = section[0].toUpperCase() + section.slice(1);
  return (
    <main className="placeholder-screen">
      <div className="panel placeholder-panel">
        <Settings size={30} />
        <h2>{label}</h2>
        <p>This section is reserved for the next MVP iteration. The live Monitor view is fully wired.</p>
      </div>
    </main>
  );
}

function deriveSparkValues(events: ActivityEvent[], score: number, count: number) {
  if (!events.length) return Array.from({ length: count }, (_, index) => 18 + ((score + index * 7) % 18));
  const buckets = new Array(count).fill(8);
  const newest = events[0]?.receivedAt ?? Date.now();
  const windowMs = Math.max(60_000, newest - (events.at(-1)?.receivedAt ?? newest));
  for (const event of events) {
    const age = newest - event.receivedAt;
    const bucket = Math.max(0, count - 1 - Math.floor((age / windowMs) * count));
    buckets[bucket] = Math.min(100, buckets[bucket] + (event.kind === 'tx-stop' ? 14 : 26));
  }
  return buckets.map((value) => Math.max(10, Math.min(100, value + score / 5)));
}

function formatParticipantName(participant: CallsignActivity) {
  return participant.callsign ?? participant.shortName ?? participant.participantKey;
}

function formatParticipantSubtitle(
  fallbackName: string | null,
  lookup: { name: string; city: string; state: string; country: string } | null | undefined
) {
  if (!lookup) return fallbackName ?? 'No display name';
  const location = [lookup.city, lookup.state || lookup.country].filter(Boolean).join(', ');
  return [lookup.name || fallbackName, location].filter(Boolean).join(' - ') || 'No display name';
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value).catch(() => undefined);
}

function formatAge(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
