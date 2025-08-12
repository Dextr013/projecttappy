export async function initSdk() {
  if (!window.YaGames) {
    // Wait a little if script is still loading
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!window.YaGames) throw new Error('YaGames not loaded');
  const ysdk = await window.YaGames.init();
  return ysdk;
}

export function getEnvironment(ysdk) {
  const env = ysdk.environment || {};
  return {
    appId: env.app && env.app.id || 'unknown',
    lang: env.i18n && env.i18n.lang || 'ru',
    tld: env.i18n && env.i18n.tld || 'ru',
    payload: env.payload || null
  };
}

export async function getFlagsOnce(ysdk, defaultFlags, clientFeatures) {
  try {
    const flags = await ysdk.getFlags({ defaultFlags, clientFeatures });
    return { ...defaultFlags, ...(flags || {}) };
  } catch (e) {
    console.warn('getFlags failed, using defaults', e);
    return defaultFlags;
  }
}

export async function requestAuthIfNeeded(ysdk) {
  try {
    const player = await ysdk.getPlayer({ signed: false });
    return player;
  } catch (e) {
    // Not authorized yet, open dialog softly
    try { await ysdk.auth.openAuthDialog(); } catch {}
    return null;
  }
}