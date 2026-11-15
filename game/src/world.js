// STARBLOOM — world simulation: player, enemies, bullets, pickups, waves.
// This is the rules of the game; rendering reads its state but never writes it.

import { WIDTH, HEIGHT, PLAYER, ENEMIES, PICKUP, WAVE, COMBO } from './config.js';

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export class World {
  constructor(rng) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.player = {
      x: WIDTH / 2, y: HEIGHT / 2,
      vx: 0, vy: 0,
      aim: 0,
      hp: PLAYER.maxHp,
      fireTimer: 0,
      invuln: 0,
      dashing: 0,
      dashCd: 0,
      dashDirX: 1, dashDirY: 0,
    };
    this.enemies = [];
    this.bullets = [];      // player bullets
    this.enemyShots = [];   // enemy bullets
    this.pickups = [];
    this.wave = 0;
    this.waveState = 'rest';   // rest | spawning | combat
    this.waveTimer = WAVE.restTime;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.combo = 0;           // combo tier
    this.comboTimer = 0;
    this.kills = 0;
    this.bestCombo = 0;
    this.time = 0;
  }

  // --- waves -----------------------------------------------------------
  buildWave(n) {
    const budget = Math.floor(WAVE.baseBudget + n * WAVE.budgetGrowth);
    const pool = ['drone', 'drone', 'weaver'];
    if (n >= 2) pool.push('seeker', 'spitter');
    if (n >= 3) pool.push('brute', 'spitter');
    if (n >= 5) pool.push('seeker', 'brute', 'weaver');
    const queue = [];
    let spent = 0;
    let guard = 0;
    while (spent < budget && guard++ < 200) {
      const type = pool[Math.floor(this.rng() * pool.length)];
      const def = ENEMIES[type];
      if (spent + def.cost > budget + 1) continue;
      queue.push(type);
      spent += def.cost;
    }
    return queue;
  }

  startWave() {
    this.wave++;
    this.spawnQueue = this.buildWave(this.wave);
    this.waveState = 'spawning';
    this.spawnTimer = 0;
  }

  spawnEnemy(type) {
    const def = ENEMIES[type];
    // Spawn on a random edge, at least 180px from the player.
    let x, y;
    for (let tries = 0; tries < 20; tries++) {
      const side = Math.floor(this.rng() * 4);
      if (side === 0) { x = this.rng() * WIDTH; y = -30; }
      else if (side === 1) { x = WIDTH + 30; y = this.rng() * HEIGHT; }
      else if (side === 2) { x = this.rng() * WIDTH; y = HEIGHT + 30; }
      else { x = -30; y = this.rng() * HEIGHT; }
      if (dist2(x, y, this.player.x, this.player.y) > 180 * 180) break;
    }
    this.enemies.push({
      type, ...def,
      x, y, vx: 0, vy: 0,
      hp: def.hp,
      fireTimer: (def.fireInterval ?? 0) * (0.5 + this.rng()),
      wobble: this.rng() * TAU,
    });
  }

  // --- combat ----------------------------------------------------------
  fire() {
    const p = this.player;
    if (p.fireTimer > 0 || p.dashing > 0) return;
    p.fireTimer = PLAYER.fireInterval;
    this.bullets.push({
      x: p.x + Math.cos(p.aim) * 18,
      y: p.y + Math.sin(p.aim) * 18,
      vx: Math.cos(p.aim) * PLAYER.bulletSpeed + p.vx * 0.3,
      vy: Math.sin(p.aim) * PLAYER.bulletSpeed + p.vy * 0.3,
      life: 1.4,
    });
    p.vx -= Math.cos(p.aim) * 40;
    p.vy -= Math.sin(p.aim) * 40;
    return 'shoot';
  }

  dash() {
    const p = this.player;
    if (p.dashCd > 0 || p.dashing > 0) return;
    let dx = p.vx, dy = p.vy;
    if (dx * dx + dy * dy < 100) { dx = Math.cos(p.aim); dy = Math.sin(p.aim); }
    const len = Math.hypot(dx, dy) || 1;
    p.dashDirX = dx / len; p.dashDirY = dy / len;
    p.dashing = PLAYER.dashTime;
    p.dashCd = PLAYER.dashCooldown;
    return 'dash';
  }

  hurtPlayer(amount) {
    const p = this.player;
    if (p.invuln > 0 || p.dashing > 0) return;
    p.hp -= amount;
    p.invuln = PLAYER.invulnTime;
    this.combo = 0;
    return 'hurt';
  }

  killEnemy(e, effects) {
    e.dead = true;
    this.kills++;
    this.combo = Math.min(COMBO.maxTier, this.combo + 1);
    this.comboTimer = COMBO.window;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = 1 + this.combo * COMBO.multiplierPerTier;
    const points = Math.round(e.score * mult);
    this.score += points;
    effects.particles.burst(e.x, e.y, '#ff5e8a', e.radius > 20 ? 40 : 18, e.radius > 20 ? 420 : 300, e.radius > 20 ? 6 : 4);
    effects.floaters.add(e.x, e.y - 10, `+${points}`, this.combo > 3 ? '#ffe66d' : '#e8e4ff', this.combo > 3 ? 24 : 18);
    if (this.rng() < 0.28 || e.radius > 20) {
      this.pickups.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: PICKUP.lifetime, bob: this.rng() * TAU });
    }
    return 'explode';
  }

  // --- main step -------------------------------------------------------
  update(dt, input, effects) {
    this.time += dt;
    const p = this.player;
    const sfxQueue = [];

    // Player movement
    let ax = 0, ay = 0;
    if (input.isDown('left')) ax -= 1;
    if (input.isDown('right')) ax += 1;
    if (input.isDown('up')) ay -= 1;
    if (input.isDown('down')) ay += 1;
    const alen = Math.hypot(ax, ay);
    if (alen > 0) { ax /= alen; ay /= alen; }

    if (p.dashing > 0) {
      p.dashing -= dt;
      p.vx = p.dashDirX * PLAYER.dashSpeed;
      p.vy = p.dashDirY * PLAYER.dashSpeed;
      effects.trail(p.x, p.y, '#7df9ff', -p.vx * 0.05, -p.vy * 0.05);
    } else {
      p.vx += ax * PLAYER.accel * dt;
      p.vy += ay * PLAYER.accel * dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > PLAYER.maxSpeed) { p.vx *= PLAYER.maxSpeed / speed; p.vy *= PLAYER.maxSpeed / speed; }
      const f = Math.exp(-PLAYER.friction * dt * (alen > 0 ? 0.3 : 1));
      p.vx *= f; p.vy *= f;
    }
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.fireTimer -= dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(20, Math.min(WIDTH - 20, p.x));
    p.y = Math.max(20, Math.min(HEIGHT - 20, p.y));

    // Aim at mouse
    const m = input.getMouse();
    p.aim = Math.atan2(m.y - p.y, m.x - p.x);

    // Shooting
    if (m.down && this.fire() === 'shoot') sfxQueue.push('shoot');

    // Combo timer
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Wave flow
    if (this.waveState === 'rest') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this.startWave();
    } else if (this.waveState === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.spawnTimer = WAVE.spawnInterval;
      }
      if (this.spawnQueue.length === 0) this.waveState = 'combat';
    } else if (this.waveState === 'combat' && this.enemies.length === 0) {
      this.waveState = 'rest';
      this.waveTimer = WAVE.restTime;
      sfxQueue.push('waveClear');
      effects.floaters.add(WIDTH / 2, HEIGHT / 2 - 60, `WAVE ${this.wave} CLEARED`, '#4dff9d', 40);
    }

    // Enemies
    for (const e of this.enemies) {
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.wobble += dt * 3;
      let steerX = dx / d, steerY = dy / d;
      if (e.type === 'weaver') {
        // Perpendicular sine weave while approaching
        const w = Math.sin(e.wobble * 2) * 0.9;
        const px = -steerY, py = steerX;
        steerX += px * w; steerY += py * w;
      } else if (e.type === 'spitter') {
        // Keep mid distance, strafe
        if (d < 260) { steerX = -steerX; steerY = -steerY; }
        const w = Math.sin(e.wobble) * 0.6;
        steerX += -steerY * w; steerY += steerX * w;
      } else if (e.homing) {
        // Seeker accelerates in bursts
        const burst = 1 + Math.max(0, Math.sin(e.wobble * 1.5)) * 1.2;
        steerX *= burst; steerY *= burst;
      }
      e.vx += (steerX * e.speed - e.vx) * Math.min(1, dt * 4);
      e.vy += (steerY * e.speed - e.vy) * Math.min(1, dt * 4);
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Shooter fire
      if (e.shooter && d < 620) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = e.fireInterval;
          this.enemyShots.push({
            x: e.x, y: e.y,
            vx: (dx / d) * e.bulletSpeed, vy: (dy / d) * e.bulletSpeed,
            life: 3.5,
          });
        }
      }

      // Touch damage
      if (d < e.radius + PLAYER.radius && p.invuln <= 0 && p.dashing <= 0) {
        if (this.hurtPlayer(e.homing ? 18 : e.radius > 20 ? 30 : 12)) {
          sfxQueue.push('hurt');
          effects.particles.burst(p.x, p.y, '#ff3860', 24, 350, 5);
          effects.shake.add(10);
        }
        // Knock the enemy back so it doesn't grind constantly
        e.vx = -(dx / d) * 260; e.vy = -(dy / d) * 260;
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // Player bullets
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < 0 || b.x > WIDTH || b.y < 0 || b.y > HEIGHT) b.life = 0;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (dist2(b.x, b.y, e.x, e.y) < (e.radius + 4) ** 2) {
          b.life = 0;
          e.hp -= 1;
          effects.particles.burst(b.x, b.y, '#ffe66d', 5, 180, 3, 0.3);
          if (e.hp <= 0) { if (this.killEnemy(e, effects) === 'explode') sfxQueue.push('explode'); effects.shake.add(e.radius > 20 ? 8 : 3); }
          else sfxQueue.push('hit');
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // Enemy shots
    for (const s of this.enemyShots) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.life -= dt;
      if (dist2(s.x, s.y, p.x, p.y) < (PLAYER.radius + 5) ** 2) {
        s.life = 0;
        if (this.hurtPlayer(10)) {
          sfxQueue.push('hurt');
          effects.particles.burst(p.x, p.y, '#ff3860', 18, 320, 5);
          effects.shake.add(8);
        }
      }
    }
    this.enemyShots = this.enemyShots.filter((s) => s.life > 0 && s.x > -40 && s.x < WIDTH + 40 && s.y > -40 && s.y < HEIGHT + 40);

    // Pickups: magnet toward player, collect
    for (const pk of this.pickups) {
      pk.life -= dt;
      pk.bob += dt * 4;
      const d2 = dist2(pk.x, pk.y, p.x, p.y);
      if (d2 < PICKUP.magnetRange ** 2) {
        const d = Math.sqrt(d2) || 1;
        pk.x += ((p.x - pk.x) / d) * 400 * dt;
        pk.y += ((p.y - pk.y) / d) * 400 * dt;
      }
      if (d2 < (PLAYER.radius + PICKUP.radius) ** 2) {
        pk.life = 0;
        p.hp = Math.min(PLAYER.maxHp, p.hp + PICKUP.value);
        this.score += 50;
        sfxQueue.push('pickup');
        effects.floaters.add(pk.x, pk.y - 12, `+${PICKUP.value} HP`, '#4dff9d', 16);
        effects.particles.burst(pk.x, pk.y, '#4dff9d', 10, 200, 3, 0.4);
      }
    }
    this.pickups = this.pickups.filter((pk) => pk.life > 0);

    effects.particles.update(dt);
    effects.shake.update(dt);
    effects.floaters.update(dt);

    return sfxQueue;
  }
}
