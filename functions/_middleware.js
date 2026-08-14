const COOKIE_NAME = "__Host-chromadie-preview";
const LOGIN_PATH = "/__preview-login";
const LOGOUT_PATH = "/__preview-logout";
const CLEANUP_PATH = "/api/profile-media/account-cleanup";
const SESSION_SECONDS = 60 * 60;
const encoder = new TextEncoder();

const LOGIN_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Chromadie — Site under maintenance</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101010;
        color: #f4f1eb;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 50% 35%, rgba(91, 119, 255, 0.14), transparent 32rem),
          #101010;
      }

      main {
        width: min(28rem, calc(100% - 3rem));
        padding: 2rem 0;
        text-align: center;
      }

      h1 {
        margin: 0;
        font-size: clamp(1.8rem, 5vw, 2.8rem);
        font-weight: 500;
        letter-spacing: -0.04em;
      }

      p {
        margin: 1rem 0 1.5rem;
        color: #a8a39b;
        line-height: 1.6;
      }

      form {
        display: grid;
        gap: 0.75rem;
        text-align: left;
      }

      label {
        color: #d5d0c8;
        font-size: 0.85rem;
      }

      input, button {
        width: 100%;
        border: 1px solid #45413c;
        border-radius: 0.65rem;
        font: inherit;
        padding: 0.8rem 0.9rem;
      }

      input {
        background: #171717;
        color: #f4f1eb;
      }

      button {
        margin-top: 0.25rem;
        background: #f4f1eb;
        color: #101010;
        cursor: pointer;
      }

      button:focus-visible, input:focus-visible {
        outline: 2px solid #a9b8ff;
        outline-offset: 3px;
      }

      .error {
        margin: 0 0 1rem;
        color: #ffb4ab;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Site is under maintenance</h1>
      <p>Enter the access password to continue.</p>
      {{ERROR}}
      <form method="post" action="/__preview-login">
        <input type="hidden" name="returnTo" value="{{RETURN_TO}}">
        <label for="password">Access password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        <button type="submit">Continue</button>
      </form>
    </main>
  </body>
</html>`;

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Chromadie — Site under maintenance</title>
  </head>
  <body style="font-family:system-ui;text-align:center;padding:20vh 2rem;background:#101010;color:#f4f1eb">
    <h1>Site is under maintenance</h1>
    <p>Access is not configured yet.</p>
  </body>
</html>`;

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Cloudflare Pages uses this public HTTP path for custom-domain
  // certificate validation. Keep the rest of the site behind the preview
  // gate while allowing only the validation endpoint through.
  if (
    ['GET', 'HEAD'].includes(request.method)
    && url.pathname.startsWith('/.well-known/acme-challenge/')
  ) {
    return context.next();
  }

  // The account-cleanup scheduler is a server-only control-plane caller. It
  // must be able to reach its handler while the browser-facing rehearsal gate
  // is active, but only with the same secret checked again by that handler.
  if (url.pathname === CLEANUP_PATH && request.method === 'POST' && isAuthorizedCleanupRequest(request, context.env)) {
    return context.next();
  }

  // Keep the rehearsal gate reversible after the public release. The
  // password flow remains the default unless the Pages environment explicitly
  // disables it with PREVIEW_PROTECTION=off.
  if (context.env?.PREVIEW_PROTECTION === "off") {
    return context.next();
  }

  const password = context.env?.PREVIEW_PASSWORD;

  if (typeof password !== "string" || password.length === 0) {
    return htmlResponse(MAINTENANCE_HTML, 503, {
      "retry-after": "1800"
    });
  }

  if (url.pathname === LOGOUT_PATH) {
    return new Response(null, {
      status: 303,
      headers: {
        "cache-control": "no-store",
        "location": "/",
        "set-cookie": clearCookie()
      }
    });
  }

  if (request.method === "POST" && url.pathname === LOGIN_PATH) {
    return handleLogin(request, password);
  }

  const session = getCookie(request.headers.get("cookie"), COOKIE_NAME);
  if (session && await verifySession(session, password)) {
    return uncachedPreviewResponse(await context.next());
  }

  return loginResponse(url.pathname + url.search);
}

function isAuthorizedCleanupRequest(request, env) {
  const expected = String(env?.R2_ACCOUNT_CLEANUP_SECRET || '').trim();
  if (!expected) return false;

  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  const supplied = request.headers.get('x-r2-cleanup-secret')?.trim() || bearer;
  return Boolean(supplied && supplied === expected);
}

function uncachedPreviewResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  headers.set("x-robots-tag", "noindex, nofollow");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function handleLogin(request, password) {
  let form;

  try {
    form = await request.formData();
  } catch {
    return loginResponse("/", "Enter the access password to continue.", 400);
  }

  const candidate = form.get("password");
  const returnTo = safeReturnTo(form.get("returnTo"), request.url);

  if (typeof candidate !== "string" || !(await equalSecret(candidate, password))) {
    return loginResponse(returnTo, "That password was not accepted.", 401);
  }

  const session = await createSession(password);

  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      "location": returnTo,
      "set-cookie": sessionCookie(session)
    }
  });
}

function loginResponse(returnTo, error = "", status = 401) {
  const errorMarkup = error
    ? `<p class="error" role="alert">${escapeHtml(error)}</p>`
    : "";
  const html = LOGIN_HTML
    .replace("{{ERROR}}", errorMarkup)
    .replace("{{RETURN_TO}}", escapeHtml(safeReturnTo(returnTo, "https://chm.lol/")));

  return htmlResponse(html, status);
}

function htmlResponse(html, status, extraHeaders = {}) {
  return new Response(html, {
    status,
    headers: {
      "cache-control": "no-store, no-cache, must-revalidate",
      "content-type": "text/html; charset=UTF-8",
      "x-robots-tag": "noindex, nofollow",
      ...extraHeaders
    }
  });
}

async function createSession(secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const payload = `${expiresAt}.${nonce}`;
  const signature = await sign(payload, secret);
  return `${payload}.${toBase64Url(signature)}`;
}

async function verifySession(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAt, nonce, encodedSignature] = parts;
  if (!/^\d+$/.test(expiresAt) || !nonce || !encodedSignature) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  try {
    const expected = await sign(`${expiresAt}.${nonce}`, secret);
    const actual = fromBase64Url(encodedSignature);
    return equalBytes(actual, expected);
  } catch {
    return false;
  }
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function equalSecret(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  return equalBytes(new Uint8Array(leftDigest), new Uint8Array(rightDigest));
}

function equalBytes(left, right) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }

  return difference === 0;
}

function getCookie(header, name) {
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim();
    if (key === name) return part.slice(separator + 1).trim();
  }

  return null;
}

function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; Max-Age=${SESSION_SECONDS}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

function safeReturnTo(value, requestUrl) {
  if (typeof value !== "string" || value.length === 0) return "/";

  try {
    const target = new URL(value, requestUrl);
    const origin = new URL(requestUrl).origin;
    if (target.origin !== origin) return "/";
    return `${target.pathname}${target.search}`;
  } catch {
    return "/";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
