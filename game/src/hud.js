// STARBLOOM — HUD: score, wave, health, combo. DOM overlay so text stays crisp.

import { PALETTE, PLAYER, COMBO } from './config.js';

export function buildHud(root) {
  root.innerHTML = `
    <div id="hud">
      <div id="hud-left">
        <div class="hud-label">SCORE</div>
        <div id="hud-score">0</div>
        <div id="hud-combo"></div>
      </div>
      <div id="hud-center">
        <div class="hud-label">WAVE</div>
        <div id="hud-wave">-</div>
        <div id="hud-wave-state"></div>
      </div>
      <div id="hud-right">
        <div class="hud-label">HULL</div>
        <div id="hud-hp-bar"><div id="hud-hp-fill"></div></div>
        <div id="hud-kills"></div>
      </div>
    </div>`;
  return {
    score: root.querySelector('#hud-score'),
    combo: root.querySelector('#hud-combo'),
    wave: root.querySelector('#hud-wave'),
    waveState: root.querySelector('#hud-wave-state'),
    hpFill: root.querySelector('#hud-hp-fill'),
    kills: root.querySelector('#hud-kills'),
  };
}

export function updateHud(hud, world) {
  hud.score.textContent = world.score.toLocaleString();
  hud.wave.textContent = world.wave > 0 ? world.wave : '-';
  if (world.waveState === 'rest' && world.wave > 0) {
    hud.waveState.textContent = `next in ${Math.ceil(world.waveTimer)}`;
    hud.waveState.style.color = PALETTE.dim;
  } else if (world.waveState === 'rest') {
    hud.waveState.textContent = 'get ready';
    hud.waveState.style.color = PALETTE.dim;
  } else {
    hud.waveState.textContent = `${world.enemies.length + world.spawnQueue.length} hostiles`;
    hud.waveState.style.color = PALETTE.danger;
  }
  const pct = Math.max(0, world.player.hp / PLAYER.maxHp);
  hud.hpFill.style.width = `${pct * 100}%`;
  hud.hpFill.style.background = pct > 0.5 ? PALETTE.player : pct > 0.25 ? '#ffb347' : PALETTE.danger;
  if (world.combo > 1) {
    const mult = (1 + world.combo * COMBO.multiplierPerTier).toFixed(2);
    hud.combo.textContent = `COMBO x${mult}`;
    hud.combo.style.opacity = Math.min(1, world.comboTimer / COMBO.window + 0.4);
  } else {
    hud.combo.textContent = '';
  }
  hud.kills.textContent = `${world.kills} kills`;
}
