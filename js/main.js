import { initSdk, getEnvironment, getFlagsOnce, requestAuthIfNeeded } from './sdk.js';
import { Game } from './game.js';
import { Ads } from './ads.js';
import { Leaderboard } from './leaderboard.js';
import { AudioManager } from './audio.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';

const CANVAS_ID = 'game';
const LEADERBOARD_NAME = 'flappy_plane_best';

let ysdk = null;
let game = null;
let ads = null;
let leaderboard = null;
let audio = null;
let storage = null;
let ui = null;

(async function boot() {
  try {
    ysdk = await initSdk();
  } catch (e) {
    console.warn('Yandex SDK failed to init, running in degraded mode', e);
  }

  const env = ysdk ? getEnvironment(ysdk) : { appId: 'local', lang: 'ru', tld: 'ru', payload: null };
  const deviceType = ysdk?.deviceInfo?.type || 'desktop';

  // Remote config flags
  const defaultFlags = {
    gravity: 2200,
    flapImpulse: 620,
    scrollSpeed: 220,
    pipeGap: 180,
    pipeIntervalMs: 1450,
    interstitialEveryNDeaths: 2,
    showBannerOnMenu: false
  };
  const clientFeatures = { lang: env.lang, deviceType };
  const flags = ysdk ? await getFlagsOnce(ysdk, defaultFlags, clientFeatures) : defaultFlags;

  // Modules
  const canvas = document.getElementById(CANVAS_ID);
  audio = new AudioManager();
  storage = new Storage(ysdk);
  ads = new Ads(ysdk, { interstitialEveryNDeaths: flags.interstitialEveryNDeaths });
  leaderboard = new Leaderboard(ysdk, LEADERBOARD_NAME);
  ui = new UI({
    onStart: handleStart,
    onPause: handlePause,
    onResume: handleResume,
    onRestart: handleRestart,
    onRewarded: handleRewarded,
    onOpenSettings: () => ui.showSettings(true),
    onBackFromSettings: () => ui.showSettings(false),
    onOpenLeaderboard: async () => {
      ui.showLeaderboard(true);
      const top = await leaderboard.getTop({ includeUser: true }).catch(() => []);
      const best = await storage.getBestScore();
      ui.renderLeaderboard(top, best);
    },
    onBackFromLeaderboard: () => ui.showLeaderboard(false),
    onToggleSound: (v) => { audio.setMuted(!v); storage.setSetting('muted', !v); },
    onToggleFullscreen: async () => {
      if (!ysdk) return;
      const fs = ysdk.screen.fullscreen;
      if (fs.isSupported()) {
        if (!fs.isFullscreen()) await fs.request(); else await fs.exit();
      }
    }
  });

  const player = ysdk ? await requestAuthIfNeeded(ysdk) : null;
  const persistedMuted = await storage.getSetting('muted');
  if (persistedMuted !== undefined) audio.setMuted(!!persistedMuted);
  ui.setSoundChecked(!audio.isMuted());

  game = new Game({
    canvas,
    assets: {
      bg: '/background.png',
      rock: '/rock.png',
      rockDown: '/rockDown.png',
      planeFrames: ['/Planes/planeBlue1.png','/Planes/planeBlue2.png','/Planes/planeBlue3.png']
    },
    audio,
    flags,
    onScore: (score) => ui.setScore(score),
    onDeath: async (score) => {
      ysdk?.features?.GameplayAPI?.stop();
      const best = await storage.updateBestScore(score, player);
      await leaderboard.submitScore(score).catch(() => {});
      ui.showDeath(score, best);
      ads.trackDeath();
    },
    onStart: () => {
      ysdk?.features?.GameplayAPI?.start();
      ui.setScore(0);
      ui.showMenu(false);
      ui.showDeathPanel(false);
    },
    onPause: () => ysdk?.features?.GameplayAPI?.stop(),
    onResume: () => ysdk?.features?.GameplayAPI?.start()
  });

  // Banner on menu (if configured and supported)
  if (ysdk && flags.showBannerOnMenu) {
    ads.mountBanner('#banner-slot').catch(() => {});
  }

  // Visibility handling
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
      ysdk?.features?.GameplayAPI?.stop();
    } else {
      if (game.isRunning()) ysdk?.features?.GameplayAPI?.start();
    }
  });

  // Initial UI state
  ui.showMenu(true);
})();

async function handleStart() {
  await maybeAuthFlow();
  await game.start();
}

async function handlePause() {
  game.pause();
}

async function handleResume() {
  game.resume();
}

async function handleRestart() {
  if (ads.shouldShowInterstitial()) {
    await ads.showInterstitial().catch(() => {});
  }
  await game.restart();
}

async function handleRewarded() {
  if (!ysdk) return game.restart();
  try {
    await ads.showRewarded();
    await game.continueAfterDeath();
  } catch (e) {
    // If user closes without reward or error, just restart
    await game.restart();
  }
}

async function maybeAuthFlow() {
  if (!ysdk) return;
  const player = await ysdk.getPlayer({ signed: false }).catch(() => null);
  if (!player || player.getMode && player.getMode() !== 'lite') {
    // Non-authorized — propose auth once per session
    await ysdk.auth.openAuthDialog().catch(() => {});
  }
}