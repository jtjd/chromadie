/** @param {any} options */
export function attachProfilePageScrollController({
  container,
  isPageScrollEnabled = () => false,
  getReducedMotion = () => false,
  getActiveProfilePage = () => 0,
  onActiveProfilePageChange = () => {},
  scrollToProfilePage = () => {},
  now = () => performance.now(),
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = frameId => cancelAnimationFrame(frameId)
} = {}) {
  if (!container) return () => {};

  function getPages() {
    return [...container.querySelectorAll('[data-profile-page]')];
  }

  function updateProfilePageState() {
    if (!isPageScrollEnabled()) {
      onActiveProfilePageChange(0);
      return;
    }

    const pages = getPages();
    if (!pages.length) {
      onActiveProfilePageChange(0);
      return;
    }

    const viewport = container.getBoundingClientRect();
    const focusLine = viewport.top + viewport.height * 0.45;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const [index, page] of pages.entries()) {
      const box = page.getBoundingClientRect();
      const distance = focusLine < box.top ? box.top - focusLine : focusLine > box.bottom ? focusLine - box.bottom : 0;
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }
    onActiveProfilePageChange(closestIndex);
  }

  let wheelLockedUntil = 0;
  let lastWheelAt = 0;
  function handlePageWheel(event) {
    if (!isPageScrollEnabled() || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const pages = getPages();
    const direction = Math.sign(event.deltaY);
    const current = pages[getActiveProfilePage()];
    if (!current || !direction) return;

    const box = current.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    const currentPageOverflows = (direction > 0 && box.bottom > viewport.bottom + 2)
      || (direction < 0 && box.top < viewport.top - 2);
    const nextIndex = getActiveProfilePage() + direction;
    // Let the browser continue to content after the last snap page, such as
    // profile social controls, and let it scroll naturally before page one.
    if (!currentPageOverflows && (nextIndex < 0 || nextIndex >= pages.length)) return;

    const currentTime = now();
    const continuedGesture = currentTime - lastWheelAt < 180;
    lastWheelAt = currentTime;
    event.preventDefault();
    if (currentTime < wheelLockedUntil || continuedGesture) return;

    if (currentPageOverflows) {
      container.scrollBy({
        top: direction * container.clientHeight * 0.8,
        behavior: getReducedMotion() ? 'auto' : 'smooth'
      });
    } else {
      scrollToProfilePage(nextIndex);
    }
    wheelLockedUntil = currentTime + 650;
  }

  container.addEventListener('wheel', handlePageWheel, { passive: false });
  container.addEventListener('scroll', updateProfilePageState, { passive: true });
  const initialFrameId = requestFrame(updateProfilePageState);

  return () => {
    container.removeEventListener('scroll', updateProfilePageState);
    container.removeEventListener('wheel', handlePageWheel);
    if (initialFrameId !== null && initialFrameId !== undefined) cancelFrame(initialFrameId);
  };
}
