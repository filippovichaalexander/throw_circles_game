import { resolveCircleCollision, resolveWallCollision } from './collision';
import type { ArenaSize, Circle } from './types';
import { MAX_RADIUS, MIN_RADIUS, PALETTE } from './types';

const TARGET_SPEED = 130;
const MIN_SPEED = 85;
const MAX_SPEED = 175;
const STEER_STRENGTH = 1.4;
const SPEED_RAMP = 0.55;
const SUBSTEPS = 2;

function lerpToward(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function randomVelocity(): { vx: number; vy: number } {
  const angle = Math.random() * Math.PI * 2;
  const speed = 80 + Math.random() * 120;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function smoothSteering(circles: Circle[], dt: number): void {
  const time = performance.now() * 0.00035;

  for (const c of circles) {
    let speed = Math.hypot(c.vx, c.vy);
    if (speed < 1) {
      const v = randomVelocity();
      c.vx = v.vx;
      c.vy = v.vy;
      speed = Math.hypot(c.vx, c.vy);
    }

    const angle = Math.atan2(c.vy, c.vx);
    const steer = (Math.random() - 0.5) * STEER_STRENGTH * dt;
    const targetSpeed =
      TARGET_SPEED + Math.sin(time + c.id * 1.73) * 22 + Math.cos(time * 0.7 + c.id) * 12;
    const clampedTarget = Math.min(MAX_SPEED, Math.max(MIN_SPEED, targetSpeed));
    const newSpeed = lerpToward(speed, clampedTarget, dt, SPEED_RAMP);
    const newAngle = angle + steer;

    c.vx = Math.cos(newAngle) * newSpeed;
    c.vy = Math.sin(newAngle) * newSpeed;
  }
}

function integrate(circles: Circle[], arena: ArenaSize, dt: number): void {
  for (const c of circles) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    resolveWallCollision(c, arena.width, arena.height);
  }

  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      resolveCircleCollision(circles[i], circles[j]);
      resolveWallCollision(circles[i], arena.width, arena.height);
      resolveWallCollision(circles[j], arena.width, arena.height);
    }
  }
}

export function createCircle(
  id: number,
  arena: ArenaSize,
  colorIndex: number,
  radius?: number,
): Circle {
  const r = radius ?? MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
  const margin = r + 4;
  const x = margin + Math.random() * (arena.width - margin * 2);
  const y = margin + Math.random() * (arena.height - margin * 2);
  const { vx, vy } = randomVelocity();

  const idx = ((colorIndex % PALETTE.length) + PALETTE.length) % PALETTE.length;
  const color = PALETTE[idx];

  return { id, x, y, vx, vy, radius: r, r: color.r, g: color.g, b: color.b, a: 1 };
}
// TODO fix 
export function stepSimulation(circles: Circle[], arena: ArenaSize, dt: number): void {
  const subDt = dt / SUBSTEPS;

  for (let step = 0; step < SUBSTEPS; step++) {
    smoothSteering(circles, subDt);
    integrate(circles, arena, subDt);
  }
}
