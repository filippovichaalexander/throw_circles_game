export type AppMode = 'simulation' | 'edit';

export interface Circle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ArenaSize {
  width: number;
  height: number;
}

export const MIN_CIRCLES = 5;
export const MAX_CIRCLES = 10;
export const MIN_RADIUS = 12;
export const MAX_RADIUS = 80;
export const SIZE_FACTOR = 1.12;

export const PALETTE: ReadonlyArray<{ r: number; g: number; b: number; label: string }> = [
  { r: 0.92, g: 0.26, b: 0.21, label: 'Красный' },
  { r: 0.13, g: 0.59, b: 0.95, label: 'Синий' },
  { r: 0.3, g: 0.69, b: 0.31, label: 'Зелёный' },
  { r: 0.98, g: 0.76, b: 0.07, label: 'Жёлтый' },
  { r: 0.61, g: 0.15, b: 0.69, label: 'Фиолетовый' },
];

export function isTransparentCircle(circle: Circle): boolean {
  return circle.a < 0.999;
}
