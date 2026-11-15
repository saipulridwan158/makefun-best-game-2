// STARBLOOM — game states and main loop: title, playing, game over.
// Owns nothing about the rules: it sequences World and Renderer.

import { WIDTH, HEIGHT, PALETTE } from './config.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { buildHud, updateHud } from './hud.js';
import { initInput, isDown } from './input.js';
import { initAudio, toggleMute, sfx } from './audio.js';
import { Particles, Shake, Floaters } from './effects.js';

const OVERLAY_HTML = `
  <div id="overlay">
    <div id="overlay-inner">
      <h1 id="ov-title">STARBLOOM</h1>
      <div id="ov-sub">a neon arena survival</div>
      <div id="ov-body"></div>
      <div id="ov-prompt">CLICK TO START</div>
      <div id="ov-controls">
        <span><b>WASD</b> move</span><span><b>MOUSE</b> aim &amp; shoot</span>
        <span><b>SPACE</b> dash</span><span><b>M</b> mute</span>
      </div>
    </div>
  </div>`;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.effects = { particles: new Particles(), shake: new Shake(), floaters: new Floaters() };
    this.hud = buildHud(document.getElementById('hud-root'));
    this.overlay = document.getElementById('overlay-root');
    this.state = 'title';
    this.highScore = Number(localStorage.getItem('starbloom-hi') || 0);
    this.mouse = { x: -100, y: -100 };

    initInput(canvas);
    initAudio();

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    window.addEventListener('toggle-mute', () => toggleMute());

    this.showTitle();
    canvas.addEventListener('mousedown', () => this.advance());
    window.addEventListener('confirm', () => this.advance());

    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // --- state transitions ----------------------------------------------
  showTitle() {
    this.state = 'title';
    this.world = new World(Math.random);
    this.overlay.innerHTML = OVERLAY_HTML;
    const body = this.overlay.querySelector('#ov-body');
    body.innerHTML = `
      <p>Survive endless waves in the neon bloom. Every kill feeds your
      <b>combo</b> — chain fast, score big. Collect <b>green orbs</b> to repair your hull.</p>
      ${this.highScore > 0 ? `<p class="hi">BEST&nbsp;&nbsp;${this.highScore.toLocaleString()}</p>` : ''}`;
    this.overlay.querySelector('#ov-prompt').textContent = 'CLICK OR PRESS ENTER TO START';
  }

  startGame() {
    this.state = 'playing';
    this.world = new World(Math.random);
    this.world.mouse = this.mouse;
    this.overlay.innerHTML = '';
    sfx.ui();
  }

  showGameOver() {
    this.state = 'over';
    sfx.gameOver();
    if (this.world.score > this.highScore) {
      this.highScore = this.world.score;
      localStorage.setItem('starbloom-hi', String(this.highScore));
    }
    this.overlay.innerHTML = OVERLAY_HTML;
    this.overlay.querySelector('#ov-title').textContent = 'SHIP DESTROYED';
    this.overlay.querySelector('#ov-title').style.color = PALETTE.danger;
    this.overlay.querySelector('#ov-sub').textContent = 'the bloom consumes all';
    const reached = this.world.wave - 1;
    this.overlay.querySelector('#ov-body').innerHTML = `
      <div class="stats">
        <div class="stat"><div class="stat-num">${this.world.score.toLocaleString()}</div><div class="stat-lab">SCORE</div></div>
        <div class="stat"><div class="stat-num">${this.highScore.toLocaleString()}</div><div class="stat-lab">BEST</div></div>
        <div class="stat"><div class="stat-num">${reached}</div><div class="stat-lab">WAVES</div></div>
        <div class="stat"><div class="stat-num">${this.world.kills}</div><div class="stat-lab">KILLS</div></div>
        <div class="stat"><div class="stat-num">x${(1 + this.world.bestCombo * 0.25).toFixed(2)}</div><div class="stat-lab">TOP COMBO</div></div>
      </div>`;
    this.overlay.querySelector('#ov-prompt').textContent = 'CLICK OR PRESS ENTER TO RESTART';
  }

  advance() {
    if (this.state === 'title' || this.state === 'over') this.startGame();
  }

  // --- loop ------------------------------------------------------------
  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const r = this.renderer;

    if (this.state === 'playing') {
      const sfxQueue = this.world.update(dt, { isDown, getMouse: () => this.mouse }, this.effects);
      for (const name of sfxQueue) sfx[name]?.();
      updateHud(this.hud, this.world);
      if (this.world.player.hp <= 0) this.showGameOver();
    } else {
      // Title/over screens: keep particles drifting behind the panel
      this.effects.particles.update(dt);
      if (this.state === 'title' && Math.random() < 0.35) {
        this.effects.particles.burst(Math.random() * WIDTH, Math.random() * HEIGHT,
          PALETTE.enemy[Math.floor(Math.random() * 4)], 2, 60, 3, 1.4);
      }
    }

    r.render(this.world, this.effects, t / 1000);
    requestAnimationFrame((tt) => this.loop(tt));
  }
}

window.__game = new Game(document.getElementById('game'));
