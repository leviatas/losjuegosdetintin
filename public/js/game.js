// Orquestador de Los juegos de Tintin: hub + Sky Run (Dash3D.js).
// Three.js se importa recién al entrar al juego, así el hub no carga WebGL.

// ── Canvas ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
resize();

// ── State ──────────────────────────────────────────────────────────────────
let dash3d   = null;   // Sky Run (Dash3D.js, Three.js, se carga bajo demanda)
let dash3dLoading = 0;  // token para cancelar una carga si se sale antes
let mode     = 'hub';  // 'hub' | 'dash3d'
let lastTime    = 0;
let animFrameId = null;

const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
function forceLandscape() {
  const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); } catch (e) {} };
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  try {
    if (req && !document.fullscreenElement) {
      const p = req.call(el);
      if (p && p.then) p.then(lock).catch(lock); else lock();
    } else lock();
  } catch (e) { lock(); }
}
if (isTouch) window.addEventListener('pointerdown', () => forceLandscape(), { once: true });

// ── Hub ────────────────────────────────────────────────────────────────────
function showHub() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  mode = 'hub';
  if (dash3d) { dash3d.destroy(); dash3d = null; }
  dash3dLoading++;
  document.getElementById('dash3d-ui').classList.add('hidden');
  document.getElementById('hub-screen').classList.remove('hidden');
}

// ── Sky Run (Dash3D.js) — runner en 3D real (Three.js se importa recién al entrar) ─────────
async function launchDash3D() {
  if (isTouch) forceLandscape();
  document.getElementById('hub-screen').classList.add('hidden');
  const ui = document.getElementById('dash3d-ui');
  ui.classList.remove('hidden');
  const msg = document.getElementById('dash3d-msg');
  msg.classList.remove('hidden');
  const step = t => { msg.innerHTML = `<div class="d3-title">Sky Run</div><div class="d3-sub">${t}</div>`; };
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(what)), ms))]);
  mode = 'dash3d';
  const token = ++dash3dLoading;
  const alive = () => token === dash3dLoading && mode === 'dash3d';
  let stage = 'descarga';
  try {
    step('Descargando el mundo 3D…');
    const { Dash3D } = await withTimeout(import('./Dash3D.js'), 45000, 'la descarga tardó demasiado');
    if (!alive()) return;
    stage = 'armado';
    step('Armando la pista…');
    await nextFrame();
    if (!alive()) return;
    const game = new Dash3D(canvas);
    if (!alive()) { game.destroy(); return; }
    stage = 'shaders';
    step('Preparando luces y colores…');
    await nextFrame();
    await game.warmup();
    if (!alive()) { game.destroy(); return; }
    dash3d = game;
    dash3d.showReady();
  } catch (err) {
    console.error('Sky Run:', err);
    if (!alive()) return;
    const why = !window.WebGLRenderingContext ? 'este navegador no tiene WebGL'
      : !(HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) ? 'el navegador es muy viejo (actualizalo)'
      : String((err && err.message) || err);
    msg.innerHTML = `<div class="d3-title">Ups 😿</div><div class="d3-sub">No se pudo abrir el 3D</div>
      <div class="d3-help">Falló en: ${stage}<br><small>${why.replace(/</g, '&lt;')}</small></div>`;
    return;
  }
  lastTime = performance.now();
  if (!animFrameId) animFrameId = requestAnimationFrame(gameLoop);
}
function exitDash3D() { showHub(); }

// ── Game loop ──────────────────────────────────────────────────────────────
function gameLoop(now) {
  animFrameId = requestAnimationFrame(gameLoop);
  const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05);
  lastTime = now;
  if (mode === 'dash3d' && dash3d) {
    try { dash3d.update(delta); dash3d.render(); }
    catch (err) { console.error('Sky Run:', err); dash3d.showError(err); dash3d = null; }
  }
}

// ── Wiring ─────────────────────────────────────────────────────────────────
const hubCard = document.getElementById('uno-dash3d');
hubCard.addEventListener('click', launchDash3D);
hubCard.addEventListener('touchend', e => { e.preventDefault(); launchDash3D(); }, { passive: false });
const d3Exit = document.getElementById('dash3d-exit');
if (d3Exit) d3Exit.addEventListener('click', exitDash3D);
[['dash3d-left', () => dash3d && dash3d.move(-1)], ['dash3d-right', () => dash3d && dash3d.move(1)],
 ['dash3d-jump', () => dash3d && dash3d.jump()]].forEach(([id, fn]) => {
  const b = document.getElementById(id);
  if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
});
window.addEventListener('keydown', e => {
  if (mode !== 'dash3d') return;
  if (e.code === 'Escape') { exitDash3D(); return; }
  if (!dash3d || e.repeat) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA')       { dash3d.move(-1); e.preventDefault(); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { dash3d.move(1);  e.preventDefault(); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') { dash3d.jump(); e.preventDefault(); }
  else if (e.code === 'Enter') { dash3d.start(); e.preventDefault(); }
});

// ── Bootstrap ──────────────────────────────────────────────────────────────
const loading = document.getElementById('loading');
loading.classList.add('hidden');
setTimeout(() => loading.remove(), 600);
