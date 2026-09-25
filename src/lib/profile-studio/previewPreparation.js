/**
 * @param {{ isActive: () => boolean, createObjectURL: (blob: Blob) => string, onPreview: (url: string) => void }} options
 */
export function createPreviewPreparationHandler({ isActive, createObjectURL, onPreview }) {
  if (typeof isActive !== 'function' || typeof createObjectURL !== 'function' || typeof onPreview !== 'function') {
    throw new TypeError('An active check, URL creator, and preview callback are required.');
  }

  return blob => {
    if (!isActive()) return false;
    onPreview(createObjectURL(blob));
    return true;
  };
}
