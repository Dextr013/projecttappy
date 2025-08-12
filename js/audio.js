export class AudioManager {
  constructor() {
    this.ctx = null;
    this._muted = false;
  }

  isMuted() { return this._muted; }
  setMuted(m) { this._muted = !!m; }

  _ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
  }

  async beep({ frequency = 440, durationMs = 100, type = 'sine', volume = 0.05 } = {}) {
    if (this._muted) return;
    this._ensureCtx();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t0);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(t0 + durationMs / 1000);
  }

  flap() { return this.beep({ frequency: 700, durationMs: 60, type: 'sine', volume: 0.06 }); }
  score() { return this.beep({ frequency: 900, durationMs: 90, type: 'triangle', volume: 0.07 }); }
  hit() { return this.beep({ frequency: 140, durationMs: 150, type: 'square', volume: 0.07 }); }
}