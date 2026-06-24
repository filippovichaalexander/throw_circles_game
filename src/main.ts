import { createCircle, stepSimulation } from './physics';
import { WebGLRenderer } from './renderer';
import type { AppMode, ArenaSize, Circle } from './types';
import { MAX_CIRCLES, MIN_CIRCLES, PALETTE } from './types';
import { bindUI, updateHintUI, updateSelectionUI, type UIElements } from './ui';
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

class App {
  private canvas: HTMLCanvasElement;
  private wrap: HTMLElement;
  private renderer: WebGLRenderer;
  private ui: UIElements;
  private circles: Circle[] = [];
  private nextId = 1;
  private mode: AppMode = 'simulation';
  private arena: ArenaSize = { width: 800, height: 600 };
  private lastTime = 0;

  constructor() {
    this.canvas = document.getElementById('arena') as HTMLCanvasElement;
    this.wrap = document.getElementById('arena-wrap') as HTMLElement;
    this.renderer = new WebGLRenderer(this.canvas);

    this.ui = bindUI({
      onModeChange: (mode) => this.setMode(mode),
      onAdd: () => {},
      onDelete: () => {},
      onGrow: () => {},
      onShrink: () => {},
      onPaletteToggle: () => {},
      onPaletteClear: () => {},
      hasPendingPaletteColor: () => false,
      onTransparent: () => {},
    });

    updateHintUI(this.ui, this.mode);
    this.refreshSelectionUI();

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
    this.seedCircles(MIN_CIRCLES);
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private seedCircles(count: number): void {
    this.circles = [];
    for (let i = 0; i < count; i++) {
      const circle = createCircle(this.nextId++, this.arena, i % PALETTE.length);
      if (i === 2) {
        circle.a = 0.5;
      }
      this.circles.push(circle);
    }
    this.refreshSelectionUI();
  }

  private refreshSelectionUI(): void {
    updateSelectionUI(
      this.ui,
      null,
      this.circles.length,
      MIN_CIRCLES,
      MAX_CIRCLES,
    );
  }

  private handleResize(): void {
    this.arena = computeArenaSize();
    this.wrap.style.width = `${this.arena.width}px`;
    this.wrap.style.height = `${this.arena.height}px`;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.resize(this.arena.width, this.arena.height, dpr);

    for (const c of this.circles) {
      c.x = Math.min(Math.max(c.x, c.radius), this.arena.width - c.radius);
      c.y = Math.min(Math.max(c.y, c.radius), this.arena.height - c.radius);
    }
  }

  private setMode(mode: AppMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    updateHintUI(this.ui, mode);
  }

  private loop(now: number): void {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.mode === 'simulation') {
      stepSimulation(this.circles, this.arena, dt);
    }

    this.renderer.clear();
    this.renderer.draw(this.circles, null);

    requestAnimationFrame((t) => this.loop(t));
  }
}

function main(): void {
  try {
    new App();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    document.body.innerHTML = `<p class="error">Ошибка запуска: ${message}</p>`;
  }
}

main();
