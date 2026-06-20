import io from 'socket.io-client';
import { normalizeBacklog, normalizeLastheardPayload } from './normalizer';
import type { ActivityEvent, ConnectionStatus } from './types';

type Socket = ReturnType<typeof io>;

export interface TgifLiveClientHandlers {
  onStatus: (status: ConnectionStatus) => void;
  onEvents: (events: ActivityEvent[]) => void;
  onMalformed: (payload: unknown, reason: string) => void;
}

const initialStatus: ConnectionStatus = {
  phase: 'idle',
  connected: false,
  message: 'Idle',
  lastConnectedAt: null,
  lastEventAt: null,
  error: null
};

export class TgifLiveClient {
  private socket: Socket | null = null;
  private status: ConnectionStatus = initialStatus;

  constructor(private readonly handlers: TgifLiveClientHandlers) {}

  connect() {
    if (this.socket) return;
    this.setStatus({
      phase: 'connecting',
      connected: false,
      message: 'Connecting to TGIF',
      error: null
    });

    this.socket = io('https://tgif.network', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.bindSocket(this.socket);
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.setStatus({
      phase: 'disconnected',
      connected: false,
      message: 'Disconnected',
      error: null
    });
  }

  private bindSocket(socket: Socket) {
    socket.on('connect', () => {
      this.setStatus({
        phase: 'handshaking',
        connected: true,
        message: 'Socket connected',
        lastConnectedAt: Date.now(),
        error: null
      });
      socket.emit('handshake', '');
    });

    socket.on('status', (payload: unknown) => {
      if (payload === 200) {
        this.setStatus({
          phase: 'backlog-loading',
          connected: true,
          message: 'Loading backlog',
          error: null
        });
        socket.emit('cli-state', { scope: '*', page: 'lastheard', action: 'lh-backlog' });
        return;
      }

      this.setStatus({
        phase: 'failed',
        connected: true,
        message: 'TGIF handshake failed',
        error: `Unexpected status: ${String(payload)}`
      });
    });

    socket.on('lastheard_backlog', (payload: unknown) => {
      const events = normalizeBacklog(payload, Date.now());
      if (!events.length && Array.isArray(payload) && payload.length > 0) {
        this.handlers.onMalformed(payload, 'Backlog contained no normalizable events');
      }
      this.setStatus({
        phase: 'live',
        connected: true,
        message: 'Live',
        lastEventAt: Date.now(),
        error: null
      });
      this.handlers.onEvents(events);
    });

    socket.on('lastheard', (payload: unknown) => {
      const event = normalizeLastheardPayload(payload, 'socket-lastheard', Date.now());
      if (!event) {
        this.handlers.onMalformed(payload, 'Malformed lastheard payload');
        return;
      }
      this.setStatus({
        phase: 'live',
        connected: true,
        message: 'Live',
        lastEventAt: Date.now(),
        error: null
      });
      this.handlers.onEvents([event]);
    });

    socket.on('disconnect', (reason: string) => {
      this.setStatus({
        phase: 'reconnecting',
        connected: false,
        message: 'Reconnecting',
        error: reason
      });
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (error: Error) => {
      this.setStatus({
        phase: 'failed',
        connected: false,
        message: 'Connection error',
        error: error.message
      });
    });

    socket.on('connect_timeout', (timeout: number) => {
      this.setStatus({
        phase: 'failed',
        connected: false,
        message: 'Connection timeout',
        error: `${timeout}`
      });
    });

    socket.on('reconnect', () => {
      this.setStatus({
        phase: 'handshaking',
        connected: true,
        message: 'Reconnected',
        lastConnectedAt: Date.now(),
        error: null
      });
      socket.emit('handshake', '');
    });

    socket.on('error', (error: Error | string) => {
      this.setStatus({
        phase: 'failed',
        connected: Boolean(this.socket?.connected),
        message: 'Socket error',
        error: typeof error === 'string' ? error : error.message
      });
    });
  }

  private setStatus(status: Partial<ConnectionStatus>) {
    this.status = { ...this.status, ...status };
    this.handlers.onStatus(this.status);
  }
}
