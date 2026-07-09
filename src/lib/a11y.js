export const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element =>
    !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  );
}

export function focusFirstElement(container) {
  const [first] = getFocusableElements(container);
  first?.focus();
  return first || null;
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return false;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}

export function restoreFocus(previous) {
  if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
    previous.focus();
  }
}
