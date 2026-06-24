import type { Circle } from './types';

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
