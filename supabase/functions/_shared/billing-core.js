export const CHROMADIE_PLUS_AMOUNT = 799;
export const CHROMADIE_PLUS_CURRENCY = 'usd';
export const CHROMADIE_PLUS_ENTITLEMENT = 'chromadie_plus';

const encoder = new TextEncoder();

function parseStripeSignature(header) {
  const values = new Map();
  for (const part of String(header || '').split(',')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(value);
  }
  return {
    timestamp: Number(values.get('t')?.[0]),
    signatures: values.get('v1') || []
  };
}

function hexToBytes(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || '')) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function verifyStripeSignature(payload, signatureHeader, secret, options = {}) {
  if (!payload || !signatureHeader || !secret) return false;
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const nowSeconds = Number.isFinite(options.nowSeconds) ? options.nowSeconds : Math.floor(Date.now() / 1000);
  const toleranceSeconds = Number.isFinite(options.toleranceSeconds) ? options.toleranceSeconds : 300;
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds || signatures.length === 0) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`)));
  return signatures.some(signature => timingSafeEqual(expected, hexToBytes(signature)));
}

export async function stripeRequest(secret, path, options = {}) {
  const response = await (options.fetchImpl || fetch)(`https://api.stripe.com/v1/${path.replace(/^\/+/, '')}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    ...(options.body ? { body: new URLSearchParams(options.body).toString() } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe request failed.');
  return payload;
}
