import {
  PROFILE_STUDIO_HASH_ALIASES,
  getProfileStudioHash,
  resolveProfileStudioLocation
} from './dashboardContract.js';

function getRecognizedHash(location, visibleSections) {
  if (!location.rawHash) return null;
  return PROFILE_STUDIO_HASH_ALIASES[location.rawHash]
    || visibleSections.some(section => section.id === location.rawHash)
    ? location.rawHash
    : null;
}

/**
 * Owns the browser navigation listeners for Profile Studio while leaving
 * section state, lazy loading, draft state, and prompt presentation in Svelte.
 */
export function createProfileStudioNavigationController({
  windowRef,
  getVisibleSections,
  getActiveSection,
  getActiveCustomizeTab,
  isNavigationDirty,
  setActiveSection,
  onCustomizeTabChange,
  loadCustomizeComponents,
  openDirtyPrompt
}) {
  let started = false;

  const getLocationState = () => resolveProfileStudioLocation(
    windowRef.location.hash,
    getVisibleSections()
  );

  const applyLocation = () => {
    const nextLocation = getLocationState();
    const nextSection = nextLocation.sectionId;

    if (nextSection === getActiveSection()) {
      if (nextSection === 'customize'
        && nextLocation.customizeTab
        && nextLocation.customizeTab !== getActiveCustomizeTab()) {
        onCustomizeTabChange(nextLocation.customizeTab);
        loadCustomizeComponents();
      }
      return;
    }

    if (isNavigationDirty()) {
      const currentHash = getProfileStudioHash(getActiveSection(), getActiveCustomizeTab());
      windowRef.history.replaceState(
        windowRef.history.state,
        '',
        `${windowRef.location.pathname}${windowRef.location.search}#${currentHash}`
      );
      openDirtyPrompt({
        type: 'section',
        value: nextSection,
        customizeTab: nextLocation.customizeTab
      });
      return;
    }

    const visibleSections = getVisibleSections();
    setActiveSection(nextSection, {
      push: false,
      customizeTab: nextLocation.customizeTab,
      hash: getRecognizedHash(nextLocation, visibleSections)
    });
  };

  const beforeUnload = event => {
    if (!isNavigationDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  };

  const navigationGuard = event => {
    if (!isNavigationDirty()) return;
    event.preventDefault();
    openDirtyPrompt(event.detail?.navigation
      ? { type: 'navigate', value: event.detail.navigation }
      : { type: 'path', value: event.detail?.nextPath || windowRef.location.pathname });
  };

  return {
    start() {
      if (started) return;
      const initialLocation = getLocationState();
      setActiveSection(initialLocation.sectionId, {
        push: false,
        customizeTab: initialLocation.customizeTab,
        hash: getRecognizedHash(initialLocation, getVisibleSections())
      });
      windowRef.addEventListener('hashchange', applyLocation);
      windowRef.addEventListener('popstate', applyLocation);
      windowRef.addEventListener('beforeunload', beforeUnload);
      windowRef.addEventListener('chromadie:navigation-request', navigationGuard);
      started = true;
    },

    stop() {
      if (!started) return;
      windowRef.removeEventListener('hashchange', applyLocation);
      windowRef.removeEventListener('popstate', applyLocation);
      windowRef.removeEventListener('beforeunload', beforeUnload);
      windowRef.removeEventListener('chromadie:navigation-request', navigationGuard);
      started = false;
    }
  };
}
