import type { AppMode } from './types';
import { PALETTE } from './types';

const HINT_BY_MODE: Record<AppMode, string> = {
  simulation: 'Просто смотри как красиво они движутся',
  edit: 'Выбери кружок и перемещай мышью или стрелками.',
};

export function updateHintUI(ui: UIElements, mode: AppMode): void {
  ui.hint.textContent = HINT_BY_MODE[mode];
}

export interface UIElements {
  btnModeSim: HTMLButtonElement;
  btnModeEdit: HTMLButtonElement;
  btnAdd: HTMLButtonElement;
  btnDelete: HTMLButtonElement;
  btnGrow: HTMLButtonElement;
  btnShrink: HTMLButtonElement;
  btnTransparent: HTMLButtonElement;
  palette: HTMLElement;
  swatches: HTMLButtonElement[];
  hint: HTMLElement;
}

export interface UICallbacks {
  onModeChange: (mode: AppMode) => void;
  onAdd: () => void;
  onDelete: () => void;
  onGrow: () => void;
  onShrink: () => void;
  onPaletteToggle: (index: number) => void;
  onPaletteClear: () => void;
  hasPendingPaletteColor: () => boolean;
  onTransparent: () => void;
}

export function bindUI(callbacks: UICallbacks): UIElements {
  const btnModeSim = document.getElementById('btn-mode-sim') as HTMLButtonElement;
  const btnModeEdit = document.getElementById('btn-mode-edit') as HTMLButtonElement;
  const btnAdd = document.getElementById('btn-add') as HTMLButtonElement;
  const btnDelete = document.getElementById('btn-delete') as HTMLButtonElement;
  const btnGrow = document.getElementById('btn-grow') as HTMLButtonElement;
  const btnShrink = document.getElementById('btn-shrink') as HTMLButtonElement;
  const btnTransparent = document.getElementById('btn-transparent') as HTMLButtonElement;
  const palette = document.getElementById('palette') as HTMLElement;
  const hint = document.getElementById('hint') as HTMLElement;

  const setMode = (mode: AppMode) => {
    btnModeSim.classList.toggle('active', mode === 'simulation');
    btnModeEdit.classList.toggle('active', mode === 'edit');
    hint.textContent = HINT_BY_MODE[mode];
    callbacks.onModeChange(mode);
  };

  btnModeSim.addEventListener('click', () => setMode('simulation'));
  btnModeEdit.addEventListener('click', () => setMode('edit'));
  btnAdd.addEventListener('click', () => callbacks.onAdd());
  btnDelete.addEventListener('click', () => callbacks.onDelete());
  btnGrow.addEventListener('click', () => callbacks.onGrow());
  btnShrink.addEventListener('click', () => callbacks.onShrink());
  btnTransparent.addEventListener('click', () => callbacks.onTransparent());

  const swatches: HTMLButtonElement[] = [];

  PALETTE.forEach((color, index) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.dataset.colorIndex = String(index);
    swatch.title = `${color.label} — цвет нового кружка`;
    swatch.style.backgroundColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    swatch.addEventListener('click', () => callbacks.onPaletteToggle(index));
    palette.appendChild(swatch);
    swatches.push(swatch);
  });

  palette.appendChild(btnTransparent);

  document.addEventListener('mousedown', (e) => {
    if (!callbacks.hasPendingPaletteColor()) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#palette .swatch')) return;
    if (target.closest('#btn-add')) return;
    callbacks.onPaletteClear();
  });

  return {
    btnModeSim,
    btnModeEdit,
    btnAdd,
    btnDelete,
    btnGrow,
    btnShrink,
    btnTransparent,
    palette,
    swatches,
    hint,
  };
}

export function updatePaletteUI(ui: UIElements, pendingAddColorIndex: number | null): void {
  ui.swatches.forEach((swatch, index) => {
    swatch.classList.toggle('active', pendingAddColorIndex === index);
  });
}

export function updateSelectionUI(
  ui: UIElements,
  selectedId: number | null,
  circleCount: number,
  minCircles: number,
  maxCircles: number,
  canGrow = false,
  canShrink = false,
): void {
  const hasSelection = selectedId !== null;
  const canDelete = hasSelection && circleCount > minCircles;
  ui.btnDelete.disabled = !canDelete;
  ui.btnGrow.disabled = !hasSelection || !canGrow;
  ui.btnShrink.disabled = !hasSelection || !canShrink;
  ui.btnTransparent.disabled = !hasSelection;
  ui.btnAdd.disabled = circleCount >= maxCircles;
}
