export class Leaderboard {
  constructor(ysdk, boardName) {
    this.ysdk = ysdk;
    this.boardName = boardName;
    this.lb = null;
    this.ready = this._init();
  }

  async _init() {
    if (!this.ysdk?.getLeaderboards) return null;
    try {
      this.lb = await this.ysdk.getLeaderboards();
      return this.lb;
    } catch (e) {
      console.warn('Leaderboards init failed', e);
      return null;
    }
  }

  async submitScore(score) {
    await this.ready;
    if (!this.lb) return;
    try {
      await this.lb.setLeaderboardScore(this.boardName, score);
    } catch (e) {
      console.warn('submitScore failed', e);
    }
  }

  async getTop({ includeUser = true, quantityTop = 10 } = {}) {
    await this.ready;
    if (!this.lb) return [];
    try {
      const resp = await this.lb.getLeaderboardEntries(this.boardName, { quantityTop, includeUser });
      return resp?.entries?.map(e => ({
        rank: e.rank,
        name: e.player?.publicName || 'Игрок',
        score: e.score,
        me: !!e.player && e.player.uniqueID === resp.userRank?.player?.uniqueID
      })) || [];
    } catch (e) {
      console.warn('getTop failed', e);
      return [];
    }
  }

  async getRandomOpponents(count = 3) {
    const entries = await this.getTop({ includeUser: true, quantityTop: 50 });
    const others = entries.filter(e => !e.me && e.score > 0);
    const shuffled = others.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}