// Paradiso arena — clouds that drift smoothly to the right

const CLOUD_WIDTHS = [820, 586, 550, 496, 316, 356]; // cloud1.svg … cloud6.svg
const MIN_WIDTH    = Math.min(...CLOUD_WIDTHS);
const MAX_WIDTH    = Math.max(...CLOUD_WIDTHS);
const MIN_SPEED    = 3;   // px/sec for the smallest cloud
const MAX_SPEED    = 12;  // px/sec for the largest cloud
const MAX_CLOUDS   = 3;
const SPAWN_MIN_MS = 5000;
const SPAWN_MAX_MS = 15000;

const clouds = [];
let spawnTimer  = null;
let rafId       = null;
let lastTs      = null;
let containerEl = null;
let running     = false;

export function startClouds(el) {
  if (running) return;
  running     = true;
  containerEl = el;
  lastTs      = null;

  // Place up to MAX_CLOUDS already visible on screen at match start
  const vw = window.innerWidth;
  const initialCount = Math.floor(Math.random() * (MAX_CLOUDS + 1)); // 0–3
  for (let i = 0; i < initialCount; i++) spawnCloud(Math.random() * vw);

  scheduleSpawn();
  rafId = requestAnimationFrame(tick);
}

export function stopClouds() {
  running = false;
  clearTimeout(spawnTimer);
  cancelAnimationFrame(rafId);
  clouds.forEach(c => c.el.remove());
  clouds.length = 0;
  containerEl = null;
}

function scheduleSpawn() {
  const delay = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
  spawnTimer = setTimeout(() => {
    if (!running) return;
    if (clouds.length < MAX_CLOUDS) spawnCloud();
    scheduleSpawn();
  }, delay);
}

// startX: explicit x position, or omitted to spawn off the left edge
function spawnCloud(startX) {
  const vh = window.innerHeight;
  const cloudIdx = Math.floor(Math.random() * CLOUD_WIDTHS.length); // 0-based
  const cloudNum = cloudIdx + 1;
  const naturalWidth = CLOUD_WIDTHS[cloudIdx];
  const t = (naturalWidth - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH);
  const speed = MIN_SPEED + t * (MAX_SPEED - MIN_SPEED); // px/sec

  const x = startX ?? -(naturalWidth + 20);
  const y = Math.random() * (vh * 0.75);

  const el = document.createElement('img');
  el.src = `/assets/arenas/paradiso/cloud${cloudNum}.svg`;
  el.style.cssText = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    'pointer-events:none',
    'z-index:0',
  ].join(';');

  containerEl.insertBefore(el, containerEl.firstChild);
  clouds.push({ el, x, naturalWidth, speed });
}

function tick(ts) {
  if (!running) return;
  if (lastTs === null) lastTs = ts;
  const dt = Math.min(ts - lastTs, 100);
  lastTs = ts;

  const vw = window.innerWidth;

  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.x += c.speed * (dt / 1000);
    c.el.style.left = `${c.x}px`;

    if (c.x > vw + c.naturalWidth + 20) {
      c.el.remove();
      clouds.splice(i, 1);
    }
  }

  rafId = requestAnimationFrame(tick);
}
