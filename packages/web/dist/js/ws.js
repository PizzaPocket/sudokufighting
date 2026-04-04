// WebSocket singleton + event dispatcher

let socket = null;
const handlers = new Map(); // type → Set<callback>
let reconnectTimer = null;
let reconnectDelay = 1000;

function getWsUrl() {
  if (window.WS_URL) return window.WS_URL;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}`;
}

export function connect() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  const url = getWsUrl();
  socket = new WebSocket(url);

  socket.onopen = () => {
    reconnectDelay = 1000;
    dispatch('_connected', {});
  };

  socket.onmessage = (evt) => {
    let msg;
    try { msg = JSON.parse(evt.data); } catch { return; }
    dispatch(msg.type, msg.payload ?? {});
  };

  socket.onclose = () => {
    dispatch('_disconnected', {});
    scheduleReconnect();
  };

  socket.onerror = (err) => {
    console.warn('WS error:', err);
  };
}

export function disconnect() {
  clearTimeout(reconnectTimer);
  if (socket) {
    socket.onclose = null; // prevent auto-reconnect
    socket.close();
    socket = null;
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, 16000);
    connect();
  }, reconnectDelay);
}

export function send(type, payload = {}) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  }
}

export function on(type, callback) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(callback);
}

export function off(type, callback) {
  handlers.get(type)?.delete(callback);
}

function dispatch(type, payload) {
  handlers.get(type)?.forEach(fn => fn(payload));
}

// Export for debug
export function getSocket() { return socket; }
