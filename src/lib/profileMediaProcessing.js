import { PROFILE_IMAGE_RULES } from './profileExpression.js';

export function validateProfileImageFile(file, kind) {
  const rules = PROFILE_IMAGE_RULES[kind];
  if (!rules) return 'This image type is not supported.';
  if (!file || typeof file !== 'object') return 'Choose an image first.';
  if (!rules.accept.includes(file.type)) return 'Use a JPEG, PNG, or WebP image.';
  if (!Number.isFinite(file.size) || file.size > rules.maxInputBytes) {
    return `That image is too large. Keep it under ${kind === 'avatar' ? '5 MB' : '10 MB'}.`;
  }
  return '';
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be read.'));
    image.src = source;
  });
}

function blobFromCanvas(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || blob.type !== 'image/webp') {
        reject(new Error('This browser could not create a WebP image.'));
        return;
      }
      resolve(blob);
    }, 'image/webp', quality);
  });
}

/**
 * Convert an accepted local image to the bounded WebP representation used by
 * the profile buckets. No original file is sent to Storage.
 */
export async function processProfileImage(file, kind) {
  const validationError = validateProfileImageFile(file, kind);
  if (validationError) throw new Error(validationError);
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Image processing is only available in a browser.');
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    const sourceWidth = Math.max(1, image.naturalWidth || image.width);
    const sourceHeight = Math.max(1, image.naturalHeight || image.height);

    if (kind === 'avatar') {
      const side = Math.min(sourceWidth, sourceHeight);
      const maxSide = 800;
      const outputSide = Math.min(side, maxSide);
      canvas.width = outputSide;
      canvas.height = outputSide;
      const sourceX = (sourceWidth - side) / 2;
      const sourceY = (sourceHeight - side) / 2;
      canvas.getContext('2d').drawImage(image, sourceX, sourceY, side, side, 0, 0, outputSide, outputSide);
      return await blobFromCanvas(canvas, 0.86);
    }

    const maxDimension = 2400;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return await blobFromCanvas(canvas, 0.8);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
