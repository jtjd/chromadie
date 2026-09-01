const prototypeLoaders = import.meta.env.DEV
  ? { prototype: () => import('./ProfileCanvasPrototype.svelte') }
  : {};

const loaders = Object.freeze({
  home: () => import('./HomePage.svelte'),
  auth: () => import('./Auth.svelte'),
  authPage: () => import('./AuthPage.svelte'),
  authCallback: () => import('./AuthCallback.svelte'),
  resetPassword: () => import('./ResetPassword.svelte'),
  game: () => import('./RollPage.svelte'),
  leaderboard: () => import('./Leaderboard.svelte'),
  progression: () => import('./ProgressionPage.svelte'),
  profileLegacy: () => import('./Profile.svelte'),
  profileShell: () => import('./ProfileShell.svelte'),
  profileSettings: () => import('./ProfileSettings.svelte'),
  guestProfile: () => import('./GuestProfileOnboarding.svelte'),
  privacy: () => import('./PrivacyPolicy.svelte'),
  terms: () => import('./TermsOfService.svelte'),
  howToPlay: () => import('./FAQ.svelte'),
  pricing: () => import('./Pricing.svelte'),
  ...prototypeLoaders
});

const promiseCache = new Map();

export const ROUTE_COMPONENT_KEYS = Object.freeze(Object.keys(loaders));

export function loadRouteComponent(key) {
  const loader = loaders[key];
  if (!loader) return Promise.reject(new Error(`Unknown route component: ${key}`));

  if (!promiseCache.has(key)) {
    promiseCache.set(key, loader().then(module => module.default).catch(error => {
      promiseCache.delete(key);
      throw error;
    }));
  }

  return promiseCache.get(key);
}

export function prefetchRouteComponent(key) {
  return loadRouteComponent(key).catch(() => null);
}
