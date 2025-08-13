const TAU = Math.PI * 2;

export class Game {
  constructor({ canvas, assets, audio, flags, onScore, onDeath, onStart, onPause, onResume, onDistance, onOvertake, selectedSkin = 'blue', skins, strings }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.audio = audio;
    this.flags = flags;
    this.onScore = onScore;
    this.onDeath = onDeath;
    this.onStart = onStart;
    this.onPause = onPause;
    this.onResume = onResume;
    this.onDistance = onDistance;
    this.onOvertake = onOvertake;

    this.metersPerPixel = this.flags.metersPerPixel || 0.2;
    this.distanceMeters = 0;

    this.skins = skins || {};
    this.currentSkin = selectedSkin;
    this.ghosts = [];
    this.strings = strings || { pressStart: 'Press start', pause: 'Paused', collision: 'Collision' };

    this.state = 'menu'; // menu | running | dead | paused
    this.score = 0;
    this.best = 0;

    this.world = { width: canvas.width, height: canvas.height };
    this.rocks = [];
    this.lastPipeMs = 0;
    this.accumulator = 0;

    this.images = {};
    this.planeFrames = [];
    this.frameIndex = 0;
    this.frameTimer = 0;

    this.plane = { x: 120, y: canvas.height / 2, vy: 0, r: 28 };

    this._bindInput();
    this._loadAssets().then(() => this._resizeToFit());
    window.addEventListener('resize', () => this._resizeToFit());

    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  async _loadAssets() {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.src = src; i.onload = () => res(i); i.onerror = rej; });
    this.images.bg = await load(this.assets.bg);
    this.images.rock = await load(this.assets.rock);
    this.images.rockDown = await load(this.assets.rockDown);
    for (const f of this.assets.planeFrames) this.planeFrames.push(await load(f));
    // If skins supplied, preload all frames
    if (this.skins) {
      for (const skinId of Object.keys(this.skins)) {
        const arr = [];
        for (const src of this.skins[skinId]) arr.push(await load(src));
        this.skins[skinId] = arr;
      }
      this._applySkin(this.currentSkin);
    }
  }

  _bindInput() {
    const flap = (e) => {
      if (this.state === 'menu') return;
      if (this.state === 'dead') return;
      if (this.state === 'paused') return;
      this.plane.vy = -this.flags.flapImpulse;
      this.audio.flap();
      e?.preventDefault?.();
    };
    this.canvas.addEventListener('pointerdown', flap, { passive: false });
    window.addEventListener('keydown', (e) => { if (e.code === 'Space') flap(e); if (e.code === 'KeyP') this.pause(); });
  }

  _resizeToFit() {
    const { innerWidth: iw, innerHeight: ih } = window;
    const aspect = this.canvas.width / this.canvas.height;
    let w = iw, h = iw / aspect;
    if (h > ih) { h = ih; w = ih * aspect; }
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  isRunning() { return this.state === 'running'; }

  setSkin(id) {
    if (!this.skins || !this.skins[id]) return;
    this.currentSkin = id;
    this._applySkin(id);
  }

  _applySkin(id) {
    if (this.skins && this.skins[id]) {
      this.planeFrames = this.skins[id];
      this.frameIndex = 0;
    }
  }

  setOpponents(list) {
    // list: [{ name, targetDistance }]
    this.ghosts = Array.isArray(list) ? list.map(g => ({...g, overtaken: false})) : [];
  }

  async start() {
    if (this.state !== 'menu' && this.state !== 'paused') return;
    this._reset();
    this.state = 'running';
    this.onStart?.();
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.onPause?.();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.onResume?.();
  }

  async restart() {
    this._reset();
    this.distanceMeters = 0;
    this.state = 'running';
    this.onResume?.();
  }

  async continueAfterDeath() {
    if (this.state !== 'dead') return;
    // Continue from slightly after previous spot
    this.state = 'running';
    this.plane.vy = -this.flags.flapImpulse * 0.8;
    this.onResume?.();
  }

  _reset() {
    this.score = 0;
    this.distanceMeters = 0;
    this.rocks = [];
    this.plane = { x: 120, y: this.canvas.height / 2, vy: 0, r: 28 };
    this.lastPipeMs = 0;
  }

  _spawnRocks() {
    const gap = this.flags.pipeGap;
    const minY = 120;
    const maxY = this.world.height - 220;
    const centerY = Math.random() * (maxY - minY) + minY;
    const topHeight = Math.max(40, centerY - gap / 2);
    const bottomY = centerY + gap / 2;
    const bottomHeight = this.world.height - bottomY - 40;
    const x = this.world.width + 40;
    this.rocks.push({ x, y: 0, w: 64, h: topHeight, passed: false, type: 'top' });
    this.rocks.push({ x, y: bottomY, w: 64, h: bottomHeight, passed: false, type: 'bottom' });
  }

  _update(dt) {
    if (this.state !== 'running') return;

    // Physics
    this.plane.vy += this.flags.gravity * dt;
    this.plane.y += this.plane.vy * dt;

    // Distance
    this.distanceMeters += (this.flags.scrollSpeed * dt) * this.metersPerPixel;
    this.onDistance?.(this.distanceMeters);

    // Spawn
    this.lastPipeMs += dt * 1000;
    if (this.lastPipeMs >= this.flags.pipeIntervalMs) {
      this.lastPipeMs = 0;
      this._spawnRocks();
    }

    // Move rocks
    const speed = this.flags.scrollSpeed;
    for (const r of this.rocks) r.x -= speed * dt;
    this.rocks = this.rocks.filter(r => r.x + r.w > -80);

    // Score
    for (let i = 0; i < this.rocks.length; i += 2) {
      const pairX = this.rocks[i].x + this.rocks[i].w;
      if (!this.rocks[i].passed && pairX < this.plane.x - this.plane.r) {
        this.rocks[i].passed = this.rocks[i+1].passed = true;
        this.score += 1;
        this.audio.score();
        this.onScore?.(this.score);
      }
    }

    // Collisions
    const hitGround = this.plane.y + this.plane.r > this.world.height - 20;
    const hitTop = this.plane.y - this.plane.r < 0;
    if (hitGround || hitTop || this._collides()) {
      this.audio.hit();
      this.state = 'dead';
      this.onDeath?.(this.score, this.distanceMeters);
    }
  }

  _collides() {
    const px = this.plane.x, py = this.plane.y, pr = this.plane.r;
    for (const r of this.rocks) {
      const cx = Math.max(r.x, Math.min(px, r.x + r.w));
      const cy = Math.max(r.y, Math.min(py, r.y + r.h));
      const dx = px - cx;
      const dy = py - cy;
      if (dx*dx + dy*dy < pr*pr) return true;
    }
    return false;
  }

  _draw() {
    const { ctx, world } = this;
    ctx.clearRect(0, 0, world.width, world.height);

    // Background
    if (this.images.bg) ctx.drawImage(this.images.bg, 0, 0, world.width, world.height);

    // Rocks
    for (const r of this.rocks) {
      const img = r.type === 'top' ? this.images.rockDown : this.images.rock;
      if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
      else {
        ctx.fillStyle = '#6f8';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
    }

    // Plane animation
    this.frameTimer += 1;
    if (this.frameTimer % 8 === 0) this.frameIndex = (this.frameIndex + 1) % this.planeFrames.length;
    const pf = this.planeFrames[this.frameIndex];
    const angle = Math.atan2(this.plane.vy, 240) * 0.7;
    if (pf) {
      const pw = 64, ph = 64;
      this._drawRotated(pf, this.plane.x, this.plane.y, pw, ph, angle);
    } else {
      ctx.fillStyle = '#ff6';
      ctx.beginPath(); ctx.arc(this.plane.x, this.plane.y, this.plane.r, 0, TAU); ctx.fill();
    }

    // Ground line
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, world.height - 20, world.width, 20);

    // State overlays
    if (this.state === 'menu') {
      this._drawCenterText(this.strings.pressStart);
    } else if (this.state === 'paused') {
      this._drawCenterText(this.strings.pause);
    } else if (this.state === 'dead') {
      this._drawCenterText(this.strings.collision);
    }

    // Ghosts overlay
    if (this.ghosts && this.ghosts.length > 0) {
      this._drawGhosts();
    }
  }

  _drawRotated(img, x, y, w, h, angle) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
  }

  _drawCenterText(text) {
    const { ctx, world } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, world.width/2, world.height/2);
  }

  _drawGhosts() {
    const { ctx, world } = this;
    const maxOffset = world.width * 0.35;
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (const g of this.ghosts) {
      if (g.overtaken) continue;
      const diff = g.targetDistance - this.distanceMeters; // meters ahead
      const dxPixels = Math.max(-maxOffset, Math.min(maxOffset, diff / this.metersPerPixel));
      const x = this.plane.x + dxPixels;
      const y = this.plane.y - 80;
      const pf = this.planeFrames[this.frameIndex];
      if (pf) this._drawRotated(pf, x, y, 64, 64, 0);
      ctx.fillStyle = 'white';
      ctx.font = '12px system-ui, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(g.name, x, y - 40);
      if (diff <= 0) {
        g.overtaken = true;
        this.onOvertake?.(g.name);
      }
    }
    ctx.restore();
    // Remove overtaken ghosts to avoid repeated toasts
    this.ghosts = this.ghosts.filter(g => !g.overtaken);
  }

  _loop(ts) {
    if (!this._lastTs) this._lastTs = ts;
    const dt = Math.min(0.033, (ts - this._lastTs) / 1000);
    this._lastTs = ts;
    this._update(dt);
    this._draw();
    requestAnimationFrame(this._loop);
  }
}