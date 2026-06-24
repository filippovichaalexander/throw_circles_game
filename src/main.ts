import './styles.css';

function computeArenaSize(): { width: number; height: number } {
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

function main(): void {
  const canvas = document.getElementById('arena') as HTMLCanvasElement | null;
  const wrap = document.getElementById('arena-wrap') as HTMLElement | null;
  if (!canvas || !wrap) {
    document.body.innerHTML = '<p class="error">Не удалось найти canvas</p>';
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.innerHTML = '<p class="error">Canvas 2D не поддерживается</p>';
    return;
  }

  const resize = (): void => {
    const arena = computeArenaSize();
    wrap.style.width = `${arena.width}px`;
    wrap.style.height = `${arena.height}px`;
    canvas.width = arena.width;
    canvas.height = arena.height;

    ctx.clearRect(0, 0, arena.width, arena.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, arena.width, arena.height);
  };

  window.addEventListener('resize', resize);
  resize();
}

main();
