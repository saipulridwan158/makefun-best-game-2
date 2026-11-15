// STARBLOOM — canvas renderer. Draws the world state; owns no game rules.

import { WIDTH, HEIGHT, PALETTE, PLAYER, COMBO } from './config.js';

const TAU = Math.PI * 2;

function drawShape(ctx, shape, x, y, r, angle) {
  ctx.beginPath();
  if (shape === 'tri') {
    for (let i = 0; i < 3; i++) {
      const a = angle + i * TAU / 3;
      i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  } else if (shape === 'diamond') {
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y);
  } else if (shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = angle + i * TAU / 6;
      i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  } else if (shape === 'square') {
    ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
  } else if (shape === 'star') {
    for (let i = 0; i < 8; i++) {
      const a = angle + i * TAU / 8;
      const rr = i % 2 === 0 ? r : r * 0.45;
      i === 0 ? ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
  }
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  drawBackground(t) {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Pulsing grid
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    ctx.strokeStyle = pulse > 0.6 ? PALETTE.gridHot : PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); }
    for (let y = 0; y <= HEIGHT; y += 80) { ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); }
    ctx.stroke();
  }

  drawPlayer(world, t) {
    const ctx = this.ctx;
    const p = world.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Blink while invulnerable
    if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    // Dash glow
    if (p.dashing > 0) {
      ctx.shadowColor = PALETTE.player;
      ctx.shadowBlur = 25;
    }
    // Ship body aimed at mouse
    ctx.rotate(p.aim);
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    // Dash cooldown ring
    if (p.dashCd > 0) {
      ctx.strokeStyle = PALETTE.dim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.dashCd / PLAYER.dashCooldown));
      ctx.stroke();
    }
  }

  drawEnemy(ctx, e, t) {
    const color = PALETTE.enemy[e.color];
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    drawShape(ctx, e.shape, e.x, e.y, e.radius, t * 1.5 + e.wobble);
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.stroke();
    // HP pips for tanky enemies
    if (e.maxHp === undefined) e.maxHp = e.hp;
    if (e.maxHp > 6) {
      const pct = e.hp / e.maxHp;
      ctx.fillStyle = '#00000088';
      ctx.fillRect(e.x - 20, e.y - e.radius - 12, 40, 5);
      ctx.fillStyle = color;
      ctx.fillRect(e.x - 20, e.y - e.radius - 12, 40 * pct, 5);
    }
  }

  render(world, effects, t) {
    const ctx = this.ctx;
    const [sx, sy] = effects.shake.offset();
    ctx.save();
    ctx.translate(sx, sy);

    this.drawBackground(t);

    // Particles (under entities, additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of effects.particles.list) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Pickups
    for (const pk of world.pickups) {
      const blink = pk.life < 2 && Math.floor(t * 8) % 2 === 0;
      if (!blink) {
        const s = 1 + Math.sin(pk.bob) * 0.15;
        ctx.fillStyle = PALETTE.pickup;
        ctx.shadowColor = PALETTE.pickup;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, PICK_R * s, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0714';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+', pk.x, pk.y + 3.5);
      }
    }

    // Enemy shots
    ctx.fillStyle = '#ff3860';
    for (const s of world.enemyShots) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, TAU);
      ctx.fill();
    }

    // Enemies
    for (const e of world.enemies) this.drawEnemy(ctx, e, t);

    // Player bullets
    ctx.strokeStyle = PALETTE.bullet;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.015, b.y - b.vy * 0.015);
      ctx.stroke();
    }

    if (world.waveState !== undefined) this.drawPlayer(world, t);

    // Aim reticle
    const m = world.mouse || { x: -100, y: -100 };
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 12, 0, TAU);
    ctx.stroke();

    // Floating score text
    for (const f of effects.floaters.list) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.fillStyle = f.color;
      ctx.font = `bold ${f.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

// Slightly odd location but keeps the hot path allocation-free; used above.
const PICK_R = 9;
