/** @param {any} options */
export function attachProfilePortfolioScrollController({
  container,
  getMoreElement = () => null,
  isPortfolioLayout = () => false,
  getReducedMotion = () => false,
  getActivePortfolioPage = () => 0,
  onActivePortfolioPageChange = () => {},
  onMoreActiveChange = () => {},
  scrollToPortfolioPage = () => {},
  now = () => performance.now(),
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = frameId => cancelAnimationFrame(frameId)
} = {}) {
  if (!container) return () => {};

  function getPages() {
    return [...container.querySelectorAll('[data-profile-portfolio-page]')];
  }

  function updatePortfolioPageState() {
    if (!isPortfolioLayout()) {
      onActivePortfolioPageChange(0);
      return;
    }

    const pages = getPages();
    if (!pages.length) {
      onActivePortfolioPageChange(0);
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
    onActivePortfolioPageChange(closestIndex);
  }

  function getContainerOffsetTop(element) {
    if (!element) return 0;
    return element.getBoundingClientRect().top
      - container.getBoundingClientRect().top
      + container.scrollTop;
  }

  function updateProfileScrollState() {
    const more = getMoreElement();
    if (!more) {
      onMoreActiveChange(false);
      updatePortfolioPageState();
      return;
    }

    const moreTop = getContainerOffsetTop(more);
    onMoreActiveChange(container.scrollTop >= moreTop - container.clientHeight * 0.45);
    updatePortfolioPageState();
  }

  let wheelLockedUntil = 0;
  let lastWheelAt = 0;
  function handlePageWheel(event) {
    if (!isPortfolioLayout() || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const currentTime = now();
    const continuedGesture = currentTime - lastWheelAt < 180;
    lastWheelAt = currentTime;
    event.preventDefault();
    if (currentTime < wheelLockedUntil || continuedGesture) return;

    const pages = getPages();
    const direction = Math.sign(event.deltaY);
    const current = pages[getActivePortfolioPage()];
    if (!current) return;

    const box = current.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    if ((direction > 0 && box.bottom > viewport.bottom + 2) || (direction < 0 && box.top < viewport.top - 2)) {
      container.scrollBy({
        top: direction * container.clientHeight * 0.8,
        behavior: getReducedMotion() ? 'auto' : 'smooth'
      });
    } else {
      scrollToPortfolioPage(Math.max(0, Math.min(pages.length - 1, getActivePortfolioPage() + direction)));
    }
    wheelLockedUntil = currentTime + 650;
  }

  container.addEventListener('wheel', handlePageWheel, { passive: false });
  container.addEventListener('scroll', updateProfileScrollState, { passive: true });
  const initialFrameId = requestFrame(updateProfileScrollState);

  return () => {
    container.removeEventListener('scroll', updateProfileScrollState);
    container.removeEventListener('wheel', handlePageWheel);
    if (initialFrameId !== null && initialFrameId !== undefined) cancelFrame(initialFrameId);
  };
}
