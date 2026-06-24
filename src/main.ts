import { createCircle, stepSimulation } from './physics';
import { WebGLRenderer } from './renderer';
import type { ArenaSize, Circle } from './types';
import { MIN_CIRCLES, PALETTE } from './types';
import './styles.css';

function computeArenaSize(): ArenaSize {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const aspect = 4 / 3;
  let width = Math.min(vw - 32, 800);
  let height = Math.floor(width / aspect);
  if (height > vh * 0.62) {
    height = Math.floor(vh * 0.62);
    width = Math.floor(height * aspect);
  }
  return {
    width: Math.max(320, width),
    height: Math.max(240, height),
  };
}

function main(): void {
  const canvas = document.getElementById('arena') as HTMLCanvasElement | null;
  const wrap = document.getElementById('arena-wrap') as HTMLElement | null;
  if (!canvas || !wrap) {
    document.body.innerHTML = '<p class="error">Не удалось найти canvas</p>';
    return;
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer(canvas);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WebGL2 недоступен';
    document.body.innerHTML = `<p class="error">${message}</p>`;
    return;
  }

  const circles: Circle[] = [];
  let nextId = 1;
  let arena: ArenaSize = { width: 800, height: 600 };
  let lastTime = performance.now();

  const seedCircles = (count: number): void => {
    circles.length = 0;
    for (let i = 0; i < count; i++) {
      circles.push(createCircle(nextId++, arena, i % PALETTE.length));
    }
  };

  const resize = (): void => {
    arena = computeArenaSize();
    wrap.style.width = `${arena.width}px`;
    wrap.style.height = `${arena.height}px`;
    const dpr = window.devicePixelRatio || 1;
    renderer.resize(arena.width, arena.height, dpr);

    for (const c of circles) {
      c.x = Math.min(Math.max(c.x, c.radius), arena.width - c.radius);
      c.y = Math.min(Math.max(c.y, c.radius), arena.height - c.radius);
    }
  };

  const loop = (now: number): void => {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    stepSimulation(circles, arena, dt);
    renderer.clear();
    renderer.draw(circles, null);

    requestAnimationFrame(loop);
  };

  window.addEventListener('resize', resize);
  resize();
  seedCircles(MIN_CIRCLES);
  requestAnimationFrame(loop);
}

main();
