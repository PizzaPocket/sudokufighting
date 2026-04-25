// Module-level singleton — one socket per app lifecycle, not per component mount
import type { ClientMessage, ServerMessage } from '@sudoku-fighting/shared';
import { useGameStore } from '../store/gameStore';
import { useEffect, useRef } from 'react';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let applyFn: ((msg: ServerMessage) => void) | null = null;
let isConnecting = false;

function getWsUrl(): string {
  // Vite define injects __WS_URL__ at build time; fall back to auto-detect in dev
  const injected = (typeof __WS_URL__ !== 'undefined' && __WS_URL__) ? __WS_URL__ as string : null;
  if (injected) return injected;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // /ws path matches the Vite proxy rule → backend at localhost:8080
  return `${proto}//${window.location.host}/ws`;
}

function connect() {
  if (isConnecting || socket?.readyState === WebSocket.OPEN) return;
  isConnecting = true;

  const url = getWsUrl();
  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    isConnecting = false;
    reconnectDelay = 1000;
    // Socket is open — mark connected immediately so lobby effects can fire.
    // The server's 'connected' message still arrives and updates myPlayerId.
    useGameStore.setState({ wsConnected: true });
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as ServerMessage;
      applyFn?.(msg);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onerror = () => {
    isConnecting = false;
  };

  ws.onclose = () => {
    isConnecting = false;
    socket = null;
    useGameStore.setState({ wsConnected: false });
    // Exponential backoff reconnect, cap at 16s
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 16000);
      connect();
    }, reconnectDelay);
  };
}

export function send<T extends ClientMessage['type']>(
  type: T,
  payload: Extract<ClientMessage, { type: T }>['payload'] = {} as never
) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  }
}

export function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (socket) {
    // Close the socket so the server's ws.on('close') fires and cleans up rooms/queue.
    // Do NOT null out onclose — let it fire so wsConnected goes false and reconnect
    // is scheduled. Future lobby sessions need a live socket.
    socket.close();
  }
}

/**
 * Called on app resume (iOS foreground / visibility restore) to detect and
 * recover from stale sockets that iOS suspended without firing ws.onclose.
 * If the socket is not open, force wsConnected=false, cancel any pending
 * reconnect timer, and reconnect immediately.
 */
export function ensureConnected() {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  useGameStore.setState({ wsConnected: false });
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (socket) {
    socket.onclose = null; // suppress — we reconnect manually below
    socket.close();
    socket = null;
  }
  isConnecting = false;
  connect();
}

export function useGameSocket() {
  const applyServerMessage = useGameStore(s => s.applyServerMessage);
  const initialized = useRef(false);

  // Keep applyFn current across renders without reconnecting
  useEffect(() => {
    applyFn = applyServerMessage;
  }, [applyServerMessage]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    applyFn = applyServerMessage;
    connect();
  }, []);
}

// Expose for VS AI mode (bypasses socket)
export function injectServerMessage(msg: ServerMessage) {
  applyFn?.(msg);
}

declare const __WS_URL__: string | null | undefined;
