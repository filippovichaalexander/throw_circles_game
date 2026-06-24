import './types';
import './styles.css';

import type { ArenaSize, Circle } from './types';
import { WebGLRenderer } from './renderer';

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

const DEMO_CIRCLES: Circle[] = [
  {
    id: 1,
    x: 180,
    y: 140,
    vx: 0,
    vy: 0,
    radius: 42,
    r: 0.92,
    g: 0.26,
    b: 0.21,
    a: 1,
  },
  {
    id: 2,
    x: 380,
    y: 190,
    vx: 0,
    vy: 0,
    radius: 30,
    r: 0.13,
    g: 0.59,
    b: 0.95,
    a: 1,
  },
  {
    id: 3,
    x: 540,
    y: 110,
    vx: 0,
    vy: 0,
    radius: 24,
    r: 0.3,
    g: 0.69,
    b: 0.31,
    a: 0.5,
  },
];

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

  const resize = (): void => {
    const arena = computeArenaSize();
    wrap.style.width = `${arena.width}px`;
    wrap.style.height = `${arena.height}px`;
    const dpr = window.devicePixelRatio || 1;
    renderer.resize(arena.width, arena.height, dpr);
    renderer.clear();
    renderer.draw(DEMO_CIRCLES, 2);
  };

  window.addEventListener('resize', resize);
  resize();
}

main();
