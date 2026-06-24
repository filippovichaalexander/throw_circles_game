import type { Circle } from './types';

export function circlesOverlap(a: Circle, b: Circle, gap = 0): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius + gap;
  return distSq < minDist * minDist;
}

export function isInsideBounds(
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number,
): boolean {
  return (
    x - radius >= 0 &&
    x + radius <= width &&
    y - radius >= 0 &&
    y + radius <= height
  );
}

export function canPlaceAt(
  circle: Circle,
  x: number,
  y: number,
  others: Circle[],
  width: number,
  height: number,
): boolean {
  if (!isInsideBounds(x, y, circle.radius, width, height)) {
    return false;
  }

  const probe: Circle = { ...circle, x, y };
  for (const other of others) {
    if (other.id === circle.id) continue;
    if (circlesOverlap(probe, other)) return false;
  }
  return true;
}

export function resolveMovement(
  circle: Circle,
  dx: number,
  dy: number,
  others: Circle[],
  width: number,
  height: number,
): { x: number; y: number } {
  const cx = circle.x + dx;
  const cy = circle.y + dy;
  if (canPlaceAt(circle, cx, cy, others, width, height)) {
    return { x: cx, y: cy };
  }

  const nx = circle.x + dx;
  if (canPlaceAt(circle, nx, circle.y, others, width, height)) {
    return { x: nx, y: circle.y };
  }

  const ny = circle.y + dy;
  if (canPlaceAt(circle, circle.x, ny, others, width, height)) {
    return { x: circle.x, y: ny };
  }

  return { x: circle.x, y: circle.y };
}

export function circleSpeed(circle: Circle): number {
  return Math.hypot(circle.vx, circle.vy);
}

export function resolveCircleCollision(a: Circle, b: Circle): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;

  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  const separation = 0.72;
  a.x -= nx * overlap * 0.5 * separation;
  a.y -= ny * overlap * 0.5 * separation;
  b.x += nx * overlap * 0.5 * separation;
  b.y += ny * overlap * 0.5 * separation;

  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const dot = dvx * nx + dvy * ny;

  if (dot < 0) return;

  const bounce = 0.92;
  const impulse = dot * bounce;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
}

export function resolveWallCollision(circle: Circle, width: number, height: number): void {
  if (circle.x - circle.radius < 0) {
    circle.x = circle.radius;
    circle.vx = Math.abs(circle.vx);
  }
  if (circle.x + circle.radius > width) {
    circle.x = width - circle.radius;
    circle.vx = -Math.abs(circle.vx);
  }
  if (circle.y - circle.radius < 0) {
    circle.y = circle.radius;
    circle.vy = Math.abs(circle.vy);
  }
  if (circle.y + circle.radius > height) {
    circle.y = height - circle.radius;
    circle.vy = -Math.abs(circle.vy);
  }
}
