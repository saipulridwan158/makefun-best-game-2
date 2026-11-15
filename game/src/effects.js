// STARBLOOM — effects: particles, screen shake, floating text.
// Purely visual layer; world logic never depends on it.

export class Particles {
  constructor() { this.list = []; }

  burst(x, y, color, count = 18, speed = 320, size = 4, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      this.list.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life, maxLife: life,
        size: size * (0.5 + Math.random()),
        color,
      });
    }
  }

  trail(x, y, color, vx = 0, vy = 0) {
    this.list.push({
      x, y, vx, vy,
      life: 0.3, maxLife: 0.3,
      size: 3, color,
    });
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    if (this.list.length > 900) this.list.splice(0, this.list.length - 900);
  }
}

export class Shake {
  constructor() { this.mag = 0; }
  add(m) { this.mag = Math.min(24, this.mag + m); }
  update(dt) { this.mag = Math.max(0, this.mag - this.mag * 7 * dt - 2 * dt); }
  offset() {
    if (this.mag <= 0.1) return [0, 0];
    return [(Math.random() * 2 - 1) * this.mag, (Math.random() * 2 - 1) * this.mag];
  }
}

export class Floaters {
  constructor() { this.list = []; }
  add(x, y, text, color = '#ffe66d', size = 20) {
    this.list.push({ x, y, text, color, size, life: 1.0, maxLife: 1.0 });
  }
  update(dt) {
    for (const f of this.list) { f.y -= 45 * dt; f.life -= dt; }
    this.list = this.list.filter((f) => f.life > 0);
  }
}
