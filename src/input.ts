import { circleSpeed, resolveMovement } from './collision';
import type { AppMode, ArenaSize, Circle } from './types';

const MIN_THROW_SPEED = 55;
const MAX_THROW_SPEED = 820;
const DRAG_SAMPLE_LIMIT = 6;

interface DragSample {
  x: number;
  y: number;
  t: number;
}

const MOVING_CATCH_SPEED = 20;
const MOVING_CATCH_SCALE = 1.35;

export function hitTestCircle(
  circles: Circle[],
  x: number,
  y: number,
  catchMoving = false,
): Circle | null {
  for (let i = circles.length - 1; i >= 0; i--) {
    const c = circles[i];
    const dx = x - c.x;
    const dy = y - c.y;
    const speed = circleSpeed(c);
    const radius =
      catchMoving && speed >= MOVING_CATCH_SPEED ? c.radius * MOVING_CATCH_SCALE : c.radius;
    if (dx * dx + dy * dy <= radius * radius) {
      return c;
    }
  }
  return null;
}

export function canvasPointFromEvent(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  arena: ArenaSize,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * arena.width;
  const y = ((clientY - rect.top) / rect.height) * arena.height;
  return { x, y };
}

export interface InputHandlers {
  onSelect: (id: number | null) => void;
  onDragStart: (id: number) => void;
  onDragMove: (id: number, x: number, y: number) => void;
  onThrowRelease: (id: number, vx: number, vy: number) => void;
  getMode: () => AppMode;
  getCircles: () => Circle[];
  getSelectedId: () => number | null;
  getArena: () => ArenaSize;
}

export class InputController {
  private canvas: HTMLCanvasElement;
  private handlers: InputHandlers;
  private dragging = false;
  private dragId: number | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragSamples: DragSample[] = [];
  private keys = new Set<string>();
  private keyboardSpeed = 220;

  constructor(canvas: HTMLCanvasElement, handlers: InputHandlers) {
    this.canvas = canvas;
    this.handlers = handlers;

    canvas.addEventListener('mousedown', this.onPointerDown);
    canvas.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  getDragId(): number | null {
    return this.dragging ? this.dragId : null;
  }

  update(dt: number): void {
    if (this.handlers.getMode() !== 'edit') return;
    const id = this.handlers.getSelectedId();
    if (id === null || this.dragging) return;

    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('s')) dy += 1;
    if (dx === 0 && dy === 0) return;

    const len = Math.hypot(dx, dy);
    dx = (dx / len) * this.keyboardSpeed * dt;
    dy = (dy / len) * this.keyboardSpeed * dt;

    const circles = this.handlers.getCircles();
    const circle = circles.find((c) => c.id === id);
    if (!circle) return;

    const arena = this.handlers.getArena();
    const pos = resolveMovement(circle, dx, dy, circles, arena.width, arena.height);
    this.handlers.onDragMove(id, pos.x, pos.y);
  }

  private onPointerDown = (e: MouseEvent): void => {
    const arena = this.handlers.getArena();
    const pt = canvasPointFromEvent(this.canvas, e.clientX, e.clientY, arena);
    const catchMoving = this.handlers.getMode() === 'edit';
    const hit = hitTestCircle(this.handlers.getCircles(), pt.x, pt.y, catchMoving);
    if (!hit) {
      this.handlers.onSelect(null);
      return;
    }
    this.handlers.onSelect(hit.id);
    if (this.handlers.getMode() !== 'edit') return;
    this.beginDrag(hit.id, pt.x, pt.y);
  };

  private onPointerMove = (e: MouseEvent): void => {
    if (!this.dragging || this.dragId === null) return;
    const arena = this.handlers.getArena();
    const pt = canvasPointFromEvent(this.canvas, e.clientX, e.clientY, arena);
    this.moveDragged(pt.x, pt.y);
  };

  private onPointerUp = (): void => {
    this.endDrag();
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    const arena = this.handlers.getArena();
    const pt = canvasPointFromEvent(this.canvas, t.clientX, t.clientY, arena);
    const catchMoving = this.handlers.getMode() === 'edit';
    const hit = hitTestCircle(this.handlers.getCircles(), pt.x, pt.y, catchMoving);
    if (!hit) {
      this.handlers.onSelect(null);
      return;
    }
    this.handlers.onSelect(hit.id);
    if (this.handlers.getMode() !== 'edit') return;
    e.preventDefault();
    this.beginDrag(hit.id, pt.x, pt.y);
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.dragging || this.dragId === null || e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    const arena = this.handlers.getArena();
    const pt = canvasPointFromEvent(this.canvas, t.clientX, t.clientY, arena);
    this.moveDragged(pt.x, pt.y);
  };

  private onTouchEnd = (): void => {
    this.endDrag();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
    if (!arrows.includes(e.key)) return;
    if (this.handlers.getMode() !== 'edit') return;
    e.preventDefault();
    this.keys.add(e.key);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key);
  };

  private beginDrag(id: number, grabX: number, grabY: number): void {
    const circle = this.handlers.getCircles().find((c) => c.id === id);
    if (circle) {
      this.dragOffsetX = grabX - circle.x;
      this.dragOffsetY = grabY - circle.y;
    } else {
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;
    }
    this.dragging = true;
    this.dragId = id;
    this.dragSamples = [];
    this.handlers.onDragStart(id);
  }

  private endDrag(): void {
    if (this.dragging && this.dragId !== null && this.handlers.getMode() === 'edit') {
      const velocity = this.computeThrowVelocity();
      if (velocity) {
        this.handlers.onThrowRelease(this.dragId, velocity.vx, velocity.vy);
      }
    }
    this.dragging = false;
    this.dragId = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragSamples = [];
  }

  private recordDragSample(x: number, y: number): void {
    this.dragSamples.push({ x, y, t: performance.now() });
    if (this.dragSamples.length > DRAG_SAMPLE_LIMIT) {
      this.dragSamples.shift();
    }
  }

  private computeThrowVelocity(): { vx: number; vy: number } | null {
    if (this.dragSamples.length < 2) return null;

    const first = this.dragSamples[0];
    const last = this.dragSamples[this.dragSamples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt < 0.02) return null;

    let vx = (last.x - first.x) / dt;
    let vy = (last.y - first.y) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed < MIN_THROW_SPEED) return null;

    const scale = Math.min(1, MAX_THROW_SPEED / speed);
    vx *= scale;
    vy *= scale;
    return { vx, vy };
  }

  private moveDragged(cursorX: number, cursorY: number): void {
    if (this.dragId === null) return;
    const circles = this.handlers.getCircles();
    const circle = circles.find((c) => c.id === this.dragId);
    if (!circle) return;

    const arena = this.handlers.getArena();
    const targetX = cursorX - this.dragOffsetX;
    const targetY = cursorY - this.dragOffsetY;
    const dx = targetX - circle.x;
    const dy = targetY - circle.y;
    const pos = resolveMovement(circle, dx, dy, circles, arena.width, arena.height);
    this.handlers.onDragMove(this.dragId, pos.x, pos.y);
    this.recordDragSample(pos.x, pos.y);
  }
}
