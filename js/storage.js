export class Storage {
  constructor(ysdk) {
    this.ysdk = ysdk;
    this.key = 'flappy-plane';
  }

  async _player() {
    try { return await this.ysdk.getPlayer({ signed: false }); } catch { return null; }
  }

  async getBestScore() {
    const player = await this._player();
    if (player && player.getData) {
      try {
        const data = await player.getData([this.key]);
        return data?.[this.key]?.best || 0;
      } catch {}
    }
    try {
      const v = JSON.parse(localStorage.getItem(this.key) || '{}');
      return v.best || 0;
    } catch { return 0; }
  }

  async updateBestScore(score, player) {
    const current = await this.getBestScore();
    const best = Math.max(current, score);
    await this._save({ best }, player);
    return best;
  }

  async getSetting(name) {
    try { const v = JSON.parse(localStorage.getItem(this.key) || '{}'); return v.settings?.[name]; } catch { return undefined; }
  }

  async setSetting(name, value) {
    const v = JSON.parse(localStorage.getItem(this.key) || '{}');
    v.settings = v.settings || {}; v.settings[name] = value;
    localStorage.setItem(this.key, JSON.stringify(v));
    const player = await this._player();
    if (player && player.setData) {
      try { await player.setData({ [this.key]: v }); } catch {}
    }
  }

  async _save(data, playerInput) {
    const v = JSON.parse(localStorage.getItem(this.key) || '{}');
    const merged = { ...v, ...data };
    localStorage.setItem(this.key, JSON.stringify(merged));
    const player = playerInput || await this._player();
    if (player && player.setData) {
      try { await player.setData({ [this.key]: merged }); } catch {}
    }
  }
}