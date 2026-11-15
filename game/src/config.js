// STARBLOOM — shared constants and palette.
// Every tunable in one place so feel can be adjusted without touching logic.

export const WIDTH = 1280;
export const HEIGHT = 720;

export const PALETTE = {
  bg: '#0a0714',
  grid: '#1c1430',
  gridHot: '#2a1f4d',
  player: '#7df9ff',
  playerCore: '#ffffff',
  bullet: '#ffe66d',
  enemy: ['#ff5e8a', '#b06bff', '#ff9d5c', '#4dff9d'],
  pickup: '#ffdf5e',
  text: '#e8e4ff',
  dim: '#6b5f96',
  danger: '#ff3860',
};

// Player tuning
export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 420,
  friction: 6.5,
  fireInterval: 0.14,
  bulletSpeed: 780,
  maxHp: 100,
  invulnTime: 1.0,
  dashSpeed: 1500,
  dashTime: 0.16,
  dashCooldown: 1.4,
};

// Enemy archetypes: behaviour + stats. Variety is the depth of the loop.
export const ENEMIES = {
  drone:   { radius: 13, hp: 3,  speed: 150, score: 100, color: 0, shape: 'tri',     cost: 1 },
  weaver:  { radius: 11, hp: 2,  speed: 230, score: 150, color: 1, shape: 'diamond', cost: 1 },
  brute:   { radius: 24, hp: 12, speed: 90,  score: 300, color: 2, shape: 'hex',     cost: 3 },
  spitter: { radius: 16, hp: 5,  speed: 70,  score: 250, color: 3, shape: 'square',  cost: 2, shooter: true, fireInterval: 2.2, bulletSpeed: 300 },
  seeker:  { radius: 12, hp: 4,  speed: 340, score: 200, color: 0, shape: 'star',    cost: 2, homing: true },
};

export const PICKUP = {
  radius: 9,
  magnetRange: 120,
  lifetime: 9,
  value: 25,
};

// Wave budget grows with wave number; composition table weights unlock over time.
export const WAVE = {
  baseBudget: 6,
  budgetGrowth: 2.2,
  restTime: 3.0,
  spawnInterval: 0.7,
};

export const COMBO = {
  window: 2.5,
  multiplierPerTier: 0.25,
  maxTier: 8,
};
