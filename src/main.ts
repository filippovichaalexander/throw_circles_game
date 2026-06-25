import { canPlaceAt } from './collision';
import { InputController } from './input';
import {
  createCircle,
  freezeCircles,
  stepEditThrows,
  stepSimulation,
  unfreezeCircles,
} from './physics';
import { WebGLRenderer } from './renderer';
import type { AppMode, ArenaSize, Circle } from './types';
import {
  ALPHA_WHEEL_STEP,
  MAX_CIRCLES,
  MAX_RADIUS,
  MAX_TRANSPARENT_ALPHA,
  MIN_CIRCLES,
  MIN_RADIUS,
  MIN_TRANSPARENT_ALPHA,
  PALETTE,
  SIZE_FACTOR,
  TRANSPARENT_ALPHA,
} from './types';
import { bindUI, updateHintUI, updatePaletteUI, updateSelectionUI, type UIElements } from './ui';

function computeArenaSize(): ArenaSize {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minArea = vw * vh * 0.5;
  const aspect = 4 / 3;
  let height = Math.sqrt(minArea / aspect);
  let width = height * aspect;
  const maxW = vw - 32;
  const maxH = vh * 0.62;
  if (width > maxW) {
    width = maxW;
    height = width / aspect;
  }
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  return {
    width: Math.max(320, Math.floor(width)),
    height: Math.max(240, Math.floor(height)),
  };
}

class App {
  private canvas: HTMLCanvasElement;
  private wrap: HTMLElement;
  private renderer: WebGLRenderer;
  private ui: UIElements;
  private input: InputController;
  private circles: Circle[] = [];
  private nextId = 1;
  private mode: AppMode = 'simulation';
  private selectedId: number | null = null;
  private arena: ArenaSize = { width: 800, height: 600 };
  private lastTime = 0;
  private pendingAddColorIndex: number | null = null;
  private nextSequentialColorIndex = 0;

  constructor() {
    this.canvas = document.getElementById('arena') as HTMLCanvasElement;
    this.wrap = document.getElementById('arena-wrap') as HTMLElement;
    this.renderer = new WebGLRenderer(this.canvas);

    this.ui = bindUI({
      onModeChange: (mode) => this.setMode(mode),
      onAdd: () => this.addCircle(),
      onDelete: () => this.deleteSelected(),
      onGrow: () => this.resizeSelected(SIZE_FACTOR),
      onShrink: () => this.resizeSelected(1 / SIZE_FACTOR),
      onPaletteToggle: (index) => this.togglePaletteColor(index),
      onPaletteClear: () => this.clearPendingPaletteColor(),
      hasPendingPaletteColor: () => this.pendingAddColorIndex !== null,
      onTransparent: () => this.makeTransparent(),
    });
    updateHintUI(this.ui, this.mode);

    this.input = new InputController(this.canvas, {
      onSelect: (id) => {
        this.selectedId = id;
        this.refreshSelectionUI();
      },
      onDragStart: (id) => {
        const circle = this.circles.find((c) => c.id === id);
        if (circle) {
          circle.vx = 0;
          circle.vy = 0;
        }
      },
      onDragMove: (id, x, y) => {
        const circle = this.circles.find((c) => c.id === id);
        if (circle) {
          circle.x = x;
          circle.y = y;
        }
      },
      onThrowRelease: (id, vx, vy) => {
        const circle = this.circles.find((c) => c.id === id);
        if (circle) {
          circle.vx = vx;
          circle.vy = vy;
        }
      },
      onOpacityAdjust: (id, direction) => this.adjustOpacity(id, direction),
      getMode: () => this.mode,
      getCircles: () => this.circles,
      getSelectedId: () => this.selectedId,
      getArena: () => this.arena,
    });

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
    this.seedCircles(MIN_CIRCLES);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private seedCircles(count: number): void {
    this.circles = [];
    for (let i = 0; i < count; i++) {
      const colorIndex = i % PALETTE.length;
      this.circles.push(createCircle(this.nextId++, this.arena, colorIndex));
    }
    this.nextSequentialColorIndex = count % PALETTE.length;
    this.refreshSelectionUI();
  }

  private canResizeSelected(factor: number): boolean {
    if (this.selectedId === null) return false;
    const circle = this.circles.find((c) => c.id === this.selectedId);
    if (!circle) return false;
    const newRadius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, circle.radius * factor));
    return newRadius !== circle.radius;
  }

  private refreshSelectionUI(): void {
    updateSelectionUI(
      this.ui,
      this.selectedId,
      this.circles.length,
      MIN_CIRCLES,
      MAX_CIRCLES,
      this.canResizeSelected(SIZE_FACTOR),
      this.canResizeSelected(1 / SIZE_FACTOR),
    );
  }

  private getAddColorIndex(): number {
    if (this.pendingAddColorIndex !== null) {
      return this.pendingAddColorIndex;
    }
    const index = this.nextSequentialColorIndex;
    this.nextSequentialColorIndex = (this.nextSequentialColorIndex + 1) % PALETTE.length;
    return index;
  }

  private handleResize(): void {
    this.arena = computeArenaSize();
    this.wrap.style.width = `${this.arena.width}px`;
    this.wrap.style.height = `${this.arena.height}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.resize(this.arena.width, this.arena.height, dpr);

    for (const c of this.circles) {
      c.x = Math.min(Math.max(c.x, c.radius), this.arena.width - c.radius);
      c.y = Math.min(Math.max(c.y, c.radius), this.arena.height - c.radius);
    }
  }

  private setMode(mode: AppMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'edit') {
      freezeCircles(this.circles);
    } else {
      unfreezeCircles(this.circles);
    }
  }

  private addCircle(): void {
    if (this.circles.length >= MAX_CIRCLES) return;
    const colorIndex = this.getAddColorIndex();
    const circle = createCircle(this.nextId++, this.arena, colorIndex);
    if (this.mode === 'edit') {
      circle.vx = 0;
      circle.vy = 0;
    }
    let placed = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (canPlaceAt(circle, circle.x, circle.y, this.circles, this.arena.width, this.arena.height)) {
        placed = true;
        break;
      }
      const margin = circle.radius + 4;
      circle.x = margin + Math.random() * (this.arena.width - margin * 2);
      circle.y = margin + Math.random() * (this.arena.height - margin * 2);
    }
    if (!placed) return;
    this.circles.push(circle);
    this.selectedId = circle.id;
    this.refreshSelectionUI();
  }

  private deleteSelected(): void {
    if (this.selectedId === null || this.circles.length <= MIN_CIRCLES) return;

    const removedIndex = this.circles.findIndex((c) => c.id === this.selectedId);
    this.circles = this.circles.filter((c) => c.id !== this.selectedId);

    if (this.circles.length > 0) {
      const nextIndex = Math.min(Math.max(removedIndex, 0), this.circles.length - 1);
      this.selectedId = this.circles[nextIndex].id;
    } else {
      this.selectedId = null;
    }
    this.refreshSelectionUI();
  }

  private resizeSelected(factor: number): void {
    if (this.selectedId === null) return;
    const circle = this.circles.find((c) => c.id === this.selectedId);
    if (!circle) return;

    const newRadius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, circle.radius * factor));
    if (newRadius === circle.radius) return;

    const probe = { ...circle, radius: newRadius };
    if (!canPlaceAt(probe, probe.x, probe.y, this.circles, this.arena.width, this.arena.height)) {
      return;
    }
    circle.radius = newRadius;
    this.refreshSelectionUI();
  }

  private clearPendingPaletteColor(): void {
    if (this.pendingAddColorIndex === null) return;
    this.pendingAddColorIndex = null;
    updatePaletteUI(this.ui, null);
  }

  private togglePaletteColor(index: number): void {
    if (this.pendingAddColorIndex === index) {
      this.pendingAddColorIndex = null;
    } else {
      this.pendingAddColorIndex = index;
    }
    updatePaletteUI(this.ui, this.pendingAddColorIndex);

    if (this.selectedId !== null) {
      this.applyColorToSelected(index);
    }
  }

  private applyColorToSelected(index: number): void {
    if (this.selectedId === null) return;
    const circle = this.circles.find((c) => c.id === this.selectedId);
    if (!circle) return;
    const color = PALETTE[index];
    circle.r = color.r;
    circle.g = color.g;
    circle.b = color.b;
    circle.a = 1;
  }

  private makeTransparent(): void {
    if (this.selectedId === null) return;
    const circle = this.circles.find((c) => c.id === this.selectedId);
    if (!circle) return;
    circle.a = TRANSPARENT_ALPHA;
  }

  private adjustOpacity(id: number, direction: number): void {
    const circle = this.circles.find((c) => c.id === id);
    if (!circle || circle.a >= 0.999) return;

    circle.a = Math.min(
      MAX_TRANSPARENT_ALPHA,
      Math.max(MIN_TRANSPARENT_ALPHA, circle.a + direction * ALPHA_WHEEL_STEP),
    );
  }

  private loop(now: number): void {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.mode === 'simulation') {
      stepSimulation(this.circles, this.arena, dt, this.selectedId);
    } else {
      stepEditThrows(this.circles, this.arena, dt, this.input.getDragId());
      this.input.update(dt);
    }

    this.renderer.clear();
    this.renderer.draw(this.circles, this.selectedId);

    requestAnimationFrame((t) => this.loop(t));
  }
}

function main(): void {
  try {
    new App();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    document.body.innerHTML = `<p class="error">Ошибка запуска: ${msg}</p>`;
  }
}

main();
