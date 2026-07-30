import { PROFILE_AUDIO_RULES, PROFILE_IMAGE_RULES } from './profileExpression.js';

export function validateProfileAudioFile(file) {
  if (!file || typeof file !== 'object') return 'Choose an MP3 file first.';
  if (!PROFILE_AUDIO_RULES.accept.includes(file.type)) return 'Use an MP3 audio file.';
  if (!Number.isFinite(file.size) || file.size > PROFILE_AUDIO_RULES.maxInputBytes) {
    return 'That audio file is too large. Keep it under 1 MB.';
  }
  return '';
}

function loadAudioDuration(source) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error('The audio file could not be read.'));
    audio.src = source;
  });
}

export async function validateProfileAudioDuration(file) {
  const validationError = validateProfileAudioFile(file);
  if (validationError) return validationError;
  if (typeof window === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return 'Audio validation is only available in a browser.';
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const duration = await loadAudioDuration(sourceUrl);
    if (!Number.isFinite(duration) || duration <= 0) return 'That audio file has no readable duration.';
    if (duration > PROFILE_AUDIO_RULES.maxDurationSeconds) {
      return `Keep profile audio under ${PROFILE_AUDIO_RULES.maxDurationSeconds} seconds.`;
    }
    return '';
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

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

function resizeCanvas(canvas, scale) {
  const nextCanvas = document.createElement('canvas');
  nextCanvas.width = Math.max(1, Math.round(canvas.width * scale));
  nextCanvas.height = Math.max(1, Math.round(canvas.height * scale));
  nextCanvas.getContext('2d').drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height);
  return nextCanvas;
}

async function boundedWebpFromCanvas(canvas, kind) {
  const rules = PROFILE_IMAGE_RULES[kind];
  let candidateCanvas = canvas;
  let quality = kind === 'avatar' ? 0.86 : 0.8;
  const minimumSide = kind === 'avatar' ? 320 : 800;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const blob = await blobFromCanvas(candidateCanvas, quality);
    if (blob.size <= rules.maxOutputBytes) return blob;

    if (quality > 0.35) {
      quality = Math.max(0.35, quality - 0.1);
      continue;
    }

    if (Math.min(candidateCanvas.width, candidateCanvas.height) <= minimumSide) break;
    candidateCanvas = resizeCanvas(candidateCanvas, 0.8);
    quality = 0.72;
  }

  throw new Error(`That image could not be compressed below ${rules.outputLabel}. Try a simpler image.`);
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
      return await boundedWebpFromCanvas(canvas, kind);
    }

    const maxDimension = 2400;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return await boundedWebpFromCanvas(canvas, kind);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
