// WebSocket server URL — override this for production deployment
// In production, Vercel build step replaces this with the real URL:
//   echo "window.WS_URL='wss://your-backend.fly.dev'" > js/config.js
window.WS_URL = null; // null = auto-detect from current host
