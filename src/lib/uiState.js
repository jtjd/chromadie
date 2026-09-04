import { writable } from 'svelte/store';

export const selectedUserId = writable(null);
export const toasts = writable([]);

export function addToast(message, type = 'error') {
  const id = Math.random().toString(36).substring(7);
  toasts.update(current => [...current, { id, message, type }]);
  setTimeout(() => {
    toasts.update(current => current.filter(toast => toast.id !== id));
  }, 4000);
}
