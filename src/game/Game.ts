import { Application, Graphics, Sprite, Texture } from 'pixi.js';

// ---------- Tipos compartilhados com o React ----------
export type Stats = {
  hp: number; maxHp: number;
  xp: number; xpNext: number;
  level: number; time: number; kills: number;
};
export type Upgrade = { label: string; apply: () => void };
export type Callbacks = {
  onStats: (s: Stats) => void;
  onLevelUp: (options: Upgrade[]) => void;
  onGameOver: (s: Stats) => void;
};

type Enemy = { g: Sprite; x: number; y: number; hp: number; speed: number; r: number };
type Bullet = { g: Sprite; x: number; y: number; vx: number; vy: number; life: number };
type Gem = { g: Sprite; x: number; y: number; value: number };

// Cores neon (altere à vontade!)
const COLORS = { player: 0x00f0ff, bullet: 0xfff200, enemy: 0xff2e88, tank: 0xff7a00, gem: 0x7dff4f };

export class Game {
  private app = new Application();
  private cb: Callbacks;
  private ready = false;
  private destroyed = false;
  private keys = new Set<string>();

  // estado do jogador (tudo aqui pode ser ajustado)
  private player!: Sprite;
  private px = 0; private py = 0;
  private hp = 100; private maxHp = 100;
  private speed = 220;
  private damage = 1;
  private fireRate = 2.5;       // tiros por segundo
  private projectiles = 1;
  private magnet = 90;
  private hurtCd = 0;
  private fireCd = 0;

  private xp = 0; private xpNext = 5; private level = 1;
  private time = 0; private kills = 0;
  private spawnCd = 0; private statsCd = 0;
  private paused = false; private over = false;

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private gems: Gem[] = [];

  // Cache: cada combinação (raio, cor) vira UMA textura reaproveitada por todos os sprites
  private textures = new Map<string, Texture>();

  constructor(cb: Callbacks) { this.cb = cb; }

  // Gera (ou reaproveita) a textura neon e devolve um Sprite novo
  private neon(r: number, color: number): Sprite {
    const key = `${r}-${color}`;
    let tex = this.textures.get(key);
    if (!tex) {
      // Graphics usado só como "molde": desenha uma vez e vira textura
      const g = new Graphics();
      g.circle(0, 0, r * 1.8).fill({ color, alpha: 0.18 });
      g.circle(0, 0, r).fill({ color });
      tex = this.app.renderer.generateTexture(g);
      g.destroy();
      this.textures.set(key, tex);
    }
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    return sprite;
  }

  async init(host: HTMLElement) {
    await this.app.init({ resizeTo: host, background: '#05020f', antialias: true });
    // O React StrictMode pode destruir antes do init terminar
    if (this.destroyed) { this.app.destroy(true); return; }
    host.appendChild(this.app.canvas);

    this.px = this.app.screen.width / 2;
    this.py = this.app.screen.height / 2;
    this.player = this.neon(12, COLORS.player);
    this.app.stage.addChild(this.player);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.app.ticker.add((t) => this.update(Math.min(t.deltaMS / 1000, 0.05)));
    this.ready = true;
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.ready) this.app.destroy(true, { children: true, texture: true });
  }

  resume() { this.paused = false; }

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  // ---------- Loop principal ----------
  private update(dt: number) {
    if (this.paused || this.over) return;
    this.time += dt;

    this.movePlayer(dt);
    this.spawnEnemies(dt);
    this.updateEnemies(dt);
    this.shoot(dt);
    this.updateBullets(dt);
    this.updateGems(dt);

    this.statsCd -= dt;
    if (this.statsCd <= 0) { this.statsCd = 0.1; this.cb.onStats(this.stats()); }
  }

  private stats(): Stats {
    return { hp: this.hp, maxHp: this.maxHp, xp: this.xp, xpNext: this.xpNext,
             level: this.level, time: this.time, kills: this.kills };
  }

  private movePlayer(dt: number) {
    const k = this.keys;
    let dx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let dy = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const { width, height } = this.app.screen;
    this.px = Math.max(12, Math.min(width - 12, this.px + dx * this.speed * dt));
    this.py = Math.max(12, Math.min(height - 12, this.py + dy * this.speed * dt));
    this.player.position.set(this.px, this.py);
    this.hurtCd -= dt;
    this.player.alpha = this.hurtCd > 0 ? 0.4 : 1;
  }

  private spawnEnemies(dt: number) {
    this.spawnCd -= dt;
    if (this.spawnCd > 0) return;
    // Quanto mais tempo passa, mais rápido nascem inimigos
    this.spawnCd = Math.max(0.12, 0.8 - this.time * 0.01);

    const { width, height } = this.app.screen;
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -20 : side === 1 ? width + 20 : Math.random() * width;
    const y = side === 2 ? -20 : side === 3 ? height + 20 : Math.random() * height;

    const tank = this.time > 30 && Math.random() < 0.2;
    const r = tank ? 16 : 9;
    const g = this.neon(r, tank ? COLORS.tank : COLORS.enemy);
    g.position.set(x, y);
    this.app.stage.addChild(g);
    this.enemies.push({
      g, x, y, r,
      hp: tank ? 6 + this.time / 20 : 2 + this.time / 40,
      speed: (tank ? 50 : 80) + Math.random() * 30,
    });
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      const dx = this.px - e.x, dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      e.g.position.set(e.x, e.y);

      if (d < e.r + 12 && this.hurtCd <= 0) {
        this.hp -= 10;
        this.hurtCd = 0.6;
        if (this.hp <= 0) this.gameOver();
      }
    }
  }

  private shoot(dt: number) {
    this.fireCd -= dt;
    if (this.fireCd > 0 || this.enemies.length === 0) return;
    this.fireCd = 1 / this.fireRate;

    // alvo = inimigo mais próximo
    let target = this.enemies[0], best = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < best) { best = d; target = e; }
    }
    const base = Math.atan2(target.y - this.py, target.x - this.px);
    const spread = 0.18;
    for (let i = 0; i < this.projectiles; i++) {
      const a = base + (i - (this.projectiles - 1) / 2) * spread;
      const g = this.neon(4, COLORS.bullet);
      g.position.set(this.px, this.py);
      this.app.stage.addChild(g);
      this.bullets.push({ g, x: this.px, y: this.py, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 1.2 });
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.g.position.set(b.x, b.y);
      for (const e of this.enemies) {
        if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 4) {
          e.hp -= this.damage;
          b.life = 0;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => {
      if (b.life > 0) return true;
      b.g.destroy(); return false;
    });

    this.enemies = this.enemies.filter((e) => {
      if (e.hp > 0) return true;
      this.kills++;
      this.dropGem(e.x, e.y);
      e.g.destroy(); return false;
    });
  }

  private dropGem(x: number, y: number) {
    const g = this.neon(4, COLORS.gem);
    g.position.set(x, y);
    this.app.stage.addChild(g);
    this.gems.push({ g, x, y, value: 1 });
  }

  private updateGems(dt: number) {
    this.gems = this.gems.filter((gm) => {
      const dx = this.px - gm.x, dy = this.py - gm.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < this.magnet) { // gemas são puxadas até você
        gm.x += (dx / d) * 360 * dt;
        gm.y += (dy / d) * 360 * dt;
        gm.g.position.set(gm.x, gm.y);
      }
      if (d < 14) {
        this.xp += gm.value;
        gm.g.destroy();
        if (this.xp >= this.xpNext) this.levelUp();
        return false;
      }
      return true;
    });
  }

  private levelUp() {
    this.xp -= this.xpNext;
    this.xpNext = Math.round(this.xpNext * 1.4 + 2);
    this.level++;
    this.paused = true;

    // Para criar um upgrade novo, basta adicionar um item aqui
    const pool: Upgrade[] = [
      { label: 'Cadência +25%', apply: () => (this.fireRate *= 1.25) },
      { label: 'Dano +1', apply: () => (this.damage += 1) },
      { label: 'Velocidade +15%', apply: () => (this.speed *= 1.15) },
      { label: 'Tiro extra', apply: () => (this.projectiles += 1) },
      { label: 'Ímã maior', apply: () => (this.magnet += 50) },
      { label: 'Vida máx. +20 e cura', apply: () => { this.maxHp += 20; this.hp = this.maxHp; } },
    ];
    const options = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    this.cb.onLevelUp(options);
  }

  private gameOver() {
    this.over = true;
    this.cb.onGameOver(this.stats());
  }
}