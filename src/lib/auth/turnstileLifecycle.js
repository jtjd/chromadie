const CONTAINER_ID = 'turnstile-container';
const CONTAINER_SELECTOR = `#${CONTAINER_ID}`;
const POLL_INTERVAL_MS = 200;
const MAX_POLL_ATTEMPTS = 50;

/**
 * Own the external Turnstile script and widget lifecycle. The form supplies
 * browser references so this module can be exercised without mounting Svelte.
 *
 * @param {{windowRef: any, documentRef: any, siteKey?: string, onState?: (state: string) => void, onError?: (message: string) => void, setIntervalFn?: typeof setInterval, clearIntervalFn?: typeof clearInterval}} options
 */
export function createTurnstileLifecycle({
  windowRef,
  documentRef,
  siteKey = '',
  onState = () => {},
  onError = () => {},
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
}) {
  let widgetId = null;
  let pollId = null;
  let token = '';
  let stopped = false;

  function getApi() {
    return windowRef?.turnstile || null;
  }

  function clearPolling() {
    if (pollId !== null) clearIntervalFn(pollId);
    pollId = null;
  }

  function render() {
    if (stopped || widgetId !== null) return;

    const api = getApi();
    if (!siteKey || !api || !documentRef?.getElementById(CONTAINER_ID)) return;

    token = '';
    widgetId = api.render(CONTAINER_SELECTOR, {
      sitekey: siteKey,
      callback(nextToken) {
        if (stopped) return;
        token = nextToken || '';
        onState('ready');
      },
      'expired-callback'() {
        if (stopped) return;
        token = '';
      },
      'error-callback'() {
        if (stopped) return;
        token = '';
        onState('error');
        onError('The security check failed to load. Please retry.');
      }
    });
    onState('ready');
  }

  function start() {
    if (stopped || pollId !== null) return;
    if (!siteKey) {
      onState('error');
      return;
    }

    let attempts = 0;
    pollId = setIntervalFn(() => {
      if (stopped) {
        clearPolling();
        return;
      }

      attempts += 1;
      if (getApi()) {
        clearPolling();
        onState('ready');
        render();
      } else if (attempts >= MAX_POLL_ATTEMPTS) {
        clearPolling();
        onState('error');
        onError('The security check could not load. Check your connection or content blocker, then retry.');
      }
    }, POLL_INTERVAL_MS);
  }

  function reset() {
    const api = getApi();
    if (widgetId !== null && api) api.reset(widgetId);
    token = '';
  }

  function remove() {
    const api = getApi();
    if (widgetId !== null && api) api.remove(widgetId);
    widgetId = null;
    token = '';
  }

  function retry() {
    if (stopped) return;
    onState('loading');

    const api = getApi();
    if (!api) {
      windowRef?.location?.reload?.();
      return;
    }

    remove();
    render();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearPolling();
    remove();
  }

  return {
    start,
    render,
    reset,
    remove,
    retry,
    stop,
    getToken() {
      return token || null;
    }
  };
}
