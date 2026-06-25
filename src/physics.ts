import {
  circleSpeed,
  resolveCircleCollision,
  resolveCircleCollisionAgainstStatic,
  resolveWallCollision,
  resolveWallCollisionBounce,
} from './collision';
import type { ArenaSize, Circle } from './types';
import { MAX_RADIUS, MIN_RADIUS, PALETTE } from './types';

const TARGET_SPEED = 130;
const MIN_SPEED = 85;
const MAX_SPEED = 175;
const STEER_STRENGTH = 1.4;
const SPEED_RAMP = 0.55;
const SUBSTEPS = 2;

const THROW_FRICTION = 0.45;
const THROW_STOP_SPEED = 14;
const THROW_WALL_BOUNCE = 0.86;
const THROW_BALL_BOUNCE = 0.9;
const THROW_SUBSTEPS = 2;
const MOVING_EPS = 1;

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

export function freezeCircles(circles: Circle[]): void {
  for (const c of circles) {
    c.vx = 0;
    c.vy = 0;
  }
}

export function unfreezeCircles(circles: Circle[]): void {
  for (const c of circles) {
    if (c.vx === 0 && c.vy === 0) {
      const v = randomVelocity();
      c.vx = v.vx;
      c.vy = v.vy;
    }
  }
}

export function stepSimulation(circles: Circle[], arena: ArenaSize, dt: number): void {
  const subDt = dt / SUBSTEPS;

  for (let step = 0; step < SUBSTEPS; step++) {
    smoothSteering(circles, subDt);
    integrate(circles, arena, subDt);
  }
}

export function stepEditThrows(
  circles: Circle[],
  arena: ArenaSize,
  dt: number,
  heldId: number | null = null,
): void {
  const subDt = dt / THROW_SUBSTEPS;

  for (let step = 0; step < THROW_SUBSTEPS; step++) {
    for (const c of circles) {
      if (c.id === heldId) continue;

      const speed = circleSpeed(c);
      if (speed < MOVING_EPS) {
        c.vx = 0;
        c.vy = 0;
        continue;
      }

      c.x += c.vx * subDt;
      c.y += c.vy * subDt;
      resolveWallCollisionBounce(c, arena.width, arena.height, THROW_WALL_BOUNCE);

      const nextSpeed = Math.max(0, speed - THROW_FRICTION * speed * subDt);
      if (nextSpeed < THROW_STOP_SPEED) {
        c.vx = 0;
        c.vy = 0;
      } else {
        c.vx = (c.vx / speed) * nextSpeed;
        c.vy = (c.vy / speed) * nextSpeed;
      }
    }

    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        if (a.id === heldId || b.id === heldId) continue;

        const aSpeed = circleSpeed(a);
        const bSpeed = circleSpeed(b);

        if (aSpeed < MOVING_EPS && bSpeed < MOVING_EPS) continue;

        if (aSpeed >= MOVING_EPS && bSpeed >= MOVING_EPS) {
          resolveCircleCollision(a, b);
        } else if (aSpeed >= MOVING_EPS) {
          resolveCircleCollisionAgainstStatic(a, b, THROW_BALL_BOUNCE);
        } else {
          resolveCircleCollisionAgainstStatic(b, a, THROW_BALL_BOUNCE);
        }

        resolveWallCollisionBounce(a, arena.width, arena.height, THROW_WALL_BOUNCE);
        resolveWallCollisionBounce(b, arena.width, arena.height, THROW_WALL_BOUNCE);
      }
    }
  }
}
