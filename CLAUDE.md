# CLAUDE.md — Guía del proyecto

Juego web para chicos (canvas 2D, ES modules, sin framework) servido por un Express
dockerizado. Textos de UI en español rioplatense (voseo: "tocá", "juntá").

## Flujo de deploy (obligatorio en cada cambio)

1. Bumpear la insignia de versión `#app-version` en `public/index.html`
   (`vX.Y.Z`: patch = fix chico, minor = feature/juego nuevo, major = cambio grande).
2. Commit con mensaje `feat:`/`fix:` que termina en `(vX.Y.Z)`.
3. `docker compose up -d --build` (puerto 5174).
4. Verificar: `curl -s http://localhost:5174/ | grep vX.Y.Z`.

## Arquitectura

Base copiada de *ameliasgames*, recortada a un solo juego. `game.js` es el
orquestador: hub (`#hub-screen`) + Sky Run. Para sumar un juego nuevo:

- clase en `public/js/<Nombre>.js` con `constructor(canvas)`, `update(dt)`,
  `render(ctx)`, `destroy()` (entrada por `pointer(x, y)` si es 2D)
- en `game.js`: variable de estado, caso en `gameLoop()`, `launchX()`/`exitX()`
  y limpieza en `showHub()`, wiring de botones y tecla Escape
- tarjeta `.hub-card.<juego>` en el hub de `public/index.html` + overlay
  `#<juego>-ui` con botón `← Menú` (clase `.game-menu-btn`) y su estilo en
  `public/css/style.css` (incluida la regla `.hidden { display: none; }`)
- claves de localStorage nuevas → sumarlas a la lista del reset global de
  `index.html`

Los layouts 2D se recalculan por frame proporcional a `canvas.width/height`
— nunca posiciones absolutas.

## Juegos 3D (Three.js) — Sky Run (`Dash3D.js`)

- En la UI se llama **Sky Run** (nombre heredado de ameliasgames);
  el código, ids DOM (`dash3d-*`) y claves de localStorage siguen como `dash3d`.
- Personajes elegibles en la pantalla de inicio (`CHARACTERS`: nena, Labubu,
  conejito), guardado en `dash3d_hero`. Cada uno se arma en `_build_<id>(rig, mesh, P)`
  con formas de Three.js (sin modelos externos) y expone `legs/arms/head/ears/eyes/hair`
  para la animación genérica de `_updateHero()` (lo que no tiene, queda vacío).
  ⚠️ `this.parts` son las partículas; las del héroe son `this.heroParts`.
- Dificultad (`DIFFICULTIES`: Fácil ×0.5, Normal ×1, Difícil ×2) multiplica la
  velocidad en `_speedAt()`; guardada en `dash3d_diff`, récord separado por
  dificultad (`dash3d_best` = Normal, `dash3d_best_facil`, `dash3d_best_dificil`).
  Cambiarla en la pantalla de inicio llama a `reset()` para regenerar la pista.
- Swipes (`_initInput`): ⬅️➡️ carril, ⬆️ salto, toque corto = salto. Se encadenan
  sin levantar el dedo; seguir en la misma dirección sólo re-ancla (un swipe largo
  = UN carril). El gesto también se evalúa en `pointerup` (flicks sin pointermove).

- Three.js sale de `node_modules/three` (servido en `/three`) vía el `importmap` de
  `index.html` (`three`, `three/addons/`). El juego se importa **bajo demanda**
  (`await import('./Dash3D.js')` en `launchDash3D()`), así el hub no carga WebGL.
- Crea su propio `<canvas id="dash3d-canvas">` WebGL encima del canvas 2D;
  `render()` ignora `ctx`. `destroy()` libera geometrías/materiales y el contexto.
- Calidad adaptativa: si baja de ~40 fps apaga bloom y luego baja resolución.
- El primer `dt` puede llegar negativo (rAF vs `performance.now()`): clamp a `[0, 0.05]`.
- Verificación visual: Playwright + Chromium con `--use-angle=swiftshader`
  (lento, ~1 fps: simular con `update(1/60)` en loop y sacar capturas).
