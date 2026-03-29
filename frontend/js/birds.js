// Paradiso arena — pixel-stepped birds that drift across the upper screen

const FRAMES       = 4;
const FRAME_MS     = 180;   // ms per animation frame
const PX_PER_FRAME = 8;     // horizontal pixels jumped on each frame change
const DRIFT_PER_FRAME = 3;  // max vertical pixels drifted per frame change
const SPAWN_MIN_MS = 4000;
const SPAWN_MAX_MS = 12000;

const birds = [];
let spawnTimer  = null;
let rafId       = null;
let lastTs      = null;
let containerEl = null;
let running     = false;

export function startBirds(el) {
  if (running) return;
  running     = true;
  containerEl = el;
  lastTs      = null;
  scheduleSpawn();
  rafId = requestAnimationFrame(tick);
}

export function stopBirds() {
  running = false;
  clearTimeout(spawnTimer);
  cancelAnimationFrame(rafId);
  birds.forEach(b => b.el.remove());
  birds.length = 0;
  containerEl = null;
}

function scheduleSpawn() {
  const delay = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
  spawnTimer = setTimeout(() => {
    if (!running) return;
    spawnBird();
    scheduleSpawn();
  }, delay);
}

function spawnBird() {
  const fromLeft = Math.random() < 0.5;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const y = 30 + Math.random() * (vh * 0.38);
  const x = fromLeft ? -80 : vw + 80;
  // Random drift direction, kept consistent per bird
  const dy = (Math.random() * 2 - 1) * DRIFT_PER_FRAME;

  const el = document.createElement('img');
  el.src = '/assets/arenas/paradiso/bird_frame1.svg';
  el.style.cssText = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    'width:32px',
    'height:32px',
    'pointer-events:none',
    'z-index:0',
    'image-rendering:pixelated',
    fromLeft ? '' : 'transform:scaleX(-1)',
  ].filter(Boolean).join(';');

  // Prepend so DOM order puts birds behind the static arena elements at the same z-index
  containerEl.insertBefore(el, containerEl.firstChild);

  birds.push({ el, x, y, fromLeft, dy, frame: 1, frameElapsed: 0 });
}

function tick(ts) {
  if (!running) return;
  if (lastTs === null) lastTs = ts;
  const dt = Math.min(ts - lastTs, 100); // cap ms to handle tab blur
  lastTs = ts;

  const vw = window.innerWidth;

  for (let i = birds.length - 1; i >= 0; i--) {
    const b = birds[i];

    b.frameElapsed += dt;

    if (b.frameElapsed >= FRAME_MS) {
      b.frameElapsed -= FRAME_MS;
      b.frame = (b.frame % FRAMES) + 1;
      b.el.src = `/assets/arenas/paradiso/bird_frame${b.frame}.svg`;

      // Position steps only on frame change — no smooth interpolation
      b.x += b.fromLeft ? PX_PER_FRAME : -PX_PER_FRAME;
      b.y += b.dy;
      b.el.style.left = `${b.x}px`;
      b.el.style.top  = `${b.y}px`;
    }

    if ((b.fromLeft && b.x > vw + 80) || (!b.fromLeft && b.x < -80)) {
      b.el.remove();
      birds.splice(i, 1);
    }
  }

  rafId = requestAnimationFrame(tick);
}
