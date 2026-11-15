// STARBLOOM — keyboard + mouse input. Tracks pressed keys and pointer state.

const keys = new Set();
let mouse = { x: 0, y: 0, down: false };
let canvas = null;

const KEY_ALIASES = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'dash',
};

export function initInput(targetCanvas) {
  canvas = targetCanvas;
  window.addEventListener('keydown', (e) => {
    const alias = KEY_ALIASES[e.code];
    if (alias) { keys.add(alias); e.preventDefault(); }
    if (e.code === 'KeyM') window.dispatchEvent(new CustomEvent('toggle-mute'));
    if (e.code === 'Enter' || e.code === 'Space') window.dispatchEvent(new CustomEvent('confirm'));
  });
  window.addEventListener('keyup', (e) => {
    const alias = KEY_ALIASES[e.code];
    if (alias) keys.delete(alias);
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', () => { mouse.down = true; });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function isDown(action) { return keys.has(action); }
export function getMouse() { return mouse; }
