import { useGameStore } from '../store/gameStore';
import { useEffect, useRef } from 'react';
let socket = null;
let reconnectTimer = null;
let reconnectDelay = 1000;
let applyFn = null;
let isConnecting = false;
function getWsUrl() {
    // Vite define injects __WS_URL__ at build time; fall back to auto-detect in dev
    const injected = (typeof __WS_URL__ !== 'undefined' && __WS_URL__) ? __WS_URL__ : null;
    if (injected)
        return injected;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // /ws path matches the Vite proxy rule → backend at localhost:8080
    return `${proto}//${window.location.host}/ws`;
}
function connect() {
    if (isConnecting || socket?.readyState === WebSocket.OPEN)
        return;
    isConnecting = true;
    const url = getWsUrl();
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
        isConnecting = false;
        reconnectDelay = 1000;
        useGameStore.getState().applyServerMessage({ type: 'connected', payload: { playerId: '' } });
        // Real playerId comes from server 'connected' event
    };
    ws.onmessage = (ev) => {
        try {
            const msg = JSON.parse(ev.data);
            applyFn?.(msg);
        }
        catch {
            // ignore malformed messages
        }
    };
    ws.onerror = () => {
        isConnecting = false;
    };
    ws.onclose = () => {
        isConnecting = false;
        socket = null;
        // Exponential backoff reconnect, cap at 16s
        if (reconnectTimer)
            clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 16000);
            connect();
        }, reconnectDelay);
    };
}
export function send(type, payload = {}) {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, payload }));
    }
}
export function disconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (socket) {
        socket.onclose = null; // prevent reconnect loop
        socket.close();
        socket = null;
    }
}
export function useGameSocket() {
    const applyServerMessage = useGameStore(s => s.applyServerMessage);
    const initialized = useRef(false);
    // Keep applyFn current across renders without reconnecting
    useEffect(() => {
        applyFn = applyServerMessage;
    }, [applyServerMessage]);
    useEffect(() => {
        if (initialized.current)
            return;
        initialized.current = true;
        applyFn = applyServerMessage;
        connect();
    }, []);
}
// Expose for VS AI mode (bypasses socket)
export function injectServerMessage(msg) {
    applyFn?.(msg);
}
