export class Ads {
  constructor(ysdk, options) {
    this.ysdk = ysdk;
    this.deaths = 0;
    this.interstitialEveryNDeaths = options?.interstitialEveryNDeaths || 2;
    this.bannerInstance = null;
  }

  trackDeath() {
    this.deaths += 1;
  }

  shouldShowInterstitial() {
    if (!this.ysdk) return false;
    if (this.interstitialEveryNDeaths <= 0) return false;
    return this.deaths > 0 && this.deaths % this.interstitialEveryNDeaths === 0;
  }

  async showInterstitial() {
    if (!this.ysdk?.adv?.showInterstitial) return;
    return new Promise((resolve, reject) => {
      this.ysdk.adv.showInterstitial({
        callbacks: {
          onOpen: () => { this._stopGameplay(); },
          onClose: (wasShown) => { this._startGameplay(); resolve(wasShown); },
          onOffline: () => { this._startGameplay(); resolve(false); },
          onError: (err) => { this._startGameplay(); reject(err); }
        }
      });
    });
  }

  async showRewarded() {
    if (!this.ysdk?.adv?.showRewardedVideo) return Promise.reject(new Error('Rewarded not supported'));
    return new Promise((resolve, reject) => {
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => { this._stopGameplay(); },
          onRewarded: () => {},
          onClose: (wasRewarded) => { this._startGameplay(); wasRewarded ? resolve(true) : reject(new Error('no-reward')); },
          onError: (err) => { this._startGameplay(); reject(err); }
        }
      });
    });
  }

  async mountBanner(selector) {
    if (!this.ysdk?.adv?.createBannerAdv) return;
    const el = document.querySelector(selector);
    if (!el) return;
    try {
      this.bannerInstance = await this.ysdk.adv.createBannerAdv({
        containerId: undefined,
        type: 'sticky',
        rtl: false
      });
      if (this.bannerInstance?.render) {
        await this.bannerInstance.render(el);
      }
    } catch (e) {
      console.warn('Banner failed', e);
    }
  }

  _stopGameplay() {
    try { this.ysdk.features.GameplayAPI.stop(); } catch {}
  }
  _startGameplay() {
    try { this.ysdk.features.GameplayAPI.start(); } catch {}
  }
}