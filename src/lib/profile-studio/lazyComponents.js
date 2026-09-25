const CUSTOMIZE_SECTION_IDS_BY_TAB = Object.freeze({
  appearance: Object.freeze(['customize', 'profile-identity', 'profile-collection']),
  media: Object.freeze(['customize', 'profile-media']),
  content: Object.freeze(['customize', 'profile-content', 'profile-widgets']),
  links: Object.freeze(['customize', 'profile-layout', 'profile-aliases']),
  layout: Object.freeze(['customize'])
});

/**
 * Own Profile Studio's lazy component requests and their recoverable state.
 * Svelte consumers receive immutable snapshots through `onChange`.
 *
 * @param {{sectionLoaders?: Record<string, () => Promise<any>>, previewLoader?: () => Promise<any>, onChange?: (state: any) => void}} options
 */
export function createProfileStudioLazyComponents({
  sectionLoaders = {},
  previewLoader = () => Promise.resolve(null),
  onChange = () => {}
} = {}) {
  let sectionComponents = {};
  let sectionErrors = {};
  const sectionLoadPromises = new Map();
  let previewComponent = null;
  let previewLoadPromise = null;
  let previewError = '';
  let disposed = false;

  function getState() {
    return {
      sectionComponents: { ...sectionComponents },
      sectionErrors: { ...sectionErrors },
      sectionLoading: sectionLoadPromises.size > 0,
      preview: previewComponent,
      previewError
    };
  }

  function publishState() {
    if (!disposed) onChange(getState());
  }

  function loadSection(sectionId, { force = false } = {}) {
    if (disposed) return Promise.resolve();
    const loader = sectionLoaders[sectionId];
    if (!loader || (!force && sectionComponents[sectionId])) return Promise.resolve();
    if (sectionLoadPromises.has(sectionId)) return sectionLoadPromises.get(sectionId);

    sectionErrors = { ...sectionErrors, [sectionId]: '' };
    const promise = Promise.resolve()
      .then(() => loader())
      .then(module => {
        sectionComponents = { ...sectionComponents, [sectionId]: module.default };
        sectionErrors = { ...sectionErrors, [sectionId]: '' };
      })
      .catch(loadError => {
        sectionErrors = {
          ...sectionErrors,
          [sectionId]: loadError?.message || 'The dashboard section could not be loaded.'
        };
      })
      .finally(() => {
        sectionLoadPromises.delete(sectionId);
        publishState();
      });

    sectionLoadPromises.set(sectionId, promise);
    publishState();
    return promise;
  }

  function loadCustomize(tabId) {
    const sectionIds = CUSTOMIZE_SECTION_IDS_BY_TAB[tabId] || CUSTOMIZE_SECTION_IDS_BY_TAB.layout;
    return Promise.all(sectionIds.map(sectionId => loadSection(sectionId)));
  }

  function loadPreview() {
    if (disposed) return Promise.resolve(null);
    if (previewComponent) return Promise.resolve(previewComponent);
    if (previewLoadPromise) return previewLoadPromise;

    previewError = '';
    publishState();
    previewLoadPromise = Promise.resolve()
      .then(() => previewLoader())
      .then(module => {
        previewComponent = module.default;
        return previewComponent;
      })
      .catch(loadError => {
        previewError = loadError instanceof Error
          ? loadError.message
          : 'The live preview could not be loaded.';
        return null;
      })
      .finally(() => {
        previewLoadPromise = null;
        publishState();
      });
    return previewLoadPromise;
  }

  function dispose() {
    disposed = true;
    sectionLoadPromises.clear();
  }

  return {
    getState,
    loadSection,
    loadCustomize,
    loadPreview,
    dispose
  };
}
