export function getStrings(lang) {
  const l = (lang || 'ru').toLowerCase();
  const ru = {
    title: 'Тап-Тап самолет',
    start: 'Начать',
    leaderboard: 'Лидерборд',
    settings: 'Настройки',
    sound: 'Звук',
    ghosts: 'Режим призраков',
    skin: 'Скин самолёта',
    back: 'Назад',
    youLost: 'Вы проиграли',
    watchAd: 'Смотреть рекламу и продолжить',
    restart: 'Заново',
    best: 'Лучший',
    yourLocalRecord: 'Ваш локальный рекорд',
    pause: 'Пауза',
    pressStart: 'Нажмите старт',
    collision: 'Столкновение',
    overtaken: 'Обогнан',
  };
  const en = {
    title: 'Tap-Tap Plane',
    start: 'Start',
    leaderboard: 'Leaderboard',
    settings: 'Settings',
    sound: 'Sound',
    ghosts: 'Ghost race',
    skin: 'Plane skin',
    back: 'Back',
    youLost: 'You lost',
    watchAd: 'Watch ad and continue',
    restart: 'Restart',
    best: 'Best',
    yourLocalRecord: 'Your local record',
    pause: 'Paused',
    pressStart: 'Press start',
    collision: 'Collision',
    overtaken: 'Overtaken',
  };
  return l.startsWith('ru') ? ru : en;
}