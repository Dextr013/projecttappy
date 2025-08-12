export class UI {
  constructor(handlers) {
    this.scoreEl = document.querySelector('#hud .score');
    this.menu = document.getElementById('menu');
    this.settings = document.getElementById('settings');
    this.leaderboard = document.getElementById('leaderboard');
    this.death = document.getElementById('death');
    this.toast = document.getElementById('toast');
    this.chkSound = document.getElementById('chk-sound');

    document.getElementById('btn-start').addEventListener('click', handlers.onStart);
    document.getElementById('btn-leaderboard').addEventListener('click', handlers.onOpenLeaderboard);
    document.getElementById('btn-settings').addEventListener('click', handlers.onOpenSettings);
    document.getElementById('btn-back-settings').addEventListener('click', handlers.onBackFromSettings);
    document.getElementById('btn-back-lb').addEventListener('click', handlers.onBackFromLeaderboard);

    document.getElementById('btn-restart').addEventListener('click', handlers.onRestart);
    document.getElementById('btn-rewarded').addEventListener('click', handlers.onRewarded);

    document.getElementById('btn-pause').addEventListener('click', handlers.onPause);
    document.getElementById('btn-sound').addEventListener('click', () => {
      const checked = !this.chkSound.checked;
      this.chkSound.checked = checked;
      handlers.onToggleSound(checked);
    });
    document.getElementById('btn-fullscreen').addEventListener('click', handlers.onToggleFullscreen);

    this.chkSound.addEventListener('change', (e) => handlers.onToggleSound(e.target.checked));
  }

  showMenu(v) { this._toggle(this.menu, v); }
  showSettings(v) { this._toggle(this.settings, v); }
  showLeaderboard(v) { this._toggle(this.leaderboard, v); }
  showDeathPanel(v) { this._toggle(this.death, v); }

  showDeath(score, best) {
    this.showDeathPanel(true);
    document.getElementById('death-score').textContent = String(score);
    this.toastMsg(`Лучший: ${best}`);
  }

  setScore(v) { this.scoreEl.textContent = String(v); }

  renderLeaderboard(entries, bestLocal) {
    const list = document.getElementById('lb-list');
    list.innerHTML = '';
    const rows = entries.map(e => `<div>#${e.rank} — ${escapeHtml(e.name)} — ${e.score}${e.me ? ' (вы)' : ''}</div>`);
    if (bestLocal && !entries.some(e => e.me)) rows.unshift(`<div>Ваш локальный рекорд: ${bestLocal}</div>`);
    list.innerHTML = rows.join('');
  }

  setSoundChecked(on) { this.chkSound.checked = !!on; }

  toastMsg(msg, ms = 2000) {
    this.toast.textContent = msg;
    this.toast.classList.add('visible');
    setTimeout(() => this.toast.classList.remove('visible'), ms);
  }

  _toggle(el, v) {
    if (!el) return;
    if (v) {
      el.classList.add('visible');
    } else {
      el.classList.remove('visible');
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}