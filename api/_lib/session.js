// Firma y verifica la cookie de sesión del Telos Advisor con HMAC-SHA256.
// TELOS_SESSION_SECRET vive solo en variables de entorno de Vercel (nunca en
// el repo). Ver TELOS-DEPLOY.md §4.

const crypto = require('crypto');

const COOKIE_NAME = 'telos_session';
const MAX_AGE_SECONDS = 8 * 60 * 60; // 8 horas

function getSecret() {
  const secret = process.env.TELOS_SESSION_SECRET;
  if (!secret) throw new Error('TELOS_SESSION_SECRET no está configurado');
  return secret;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  let expectedMac;
  try {
    expectedMac = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  } catch {
    return null;
  }
  const a = Buffer.from(mac), b = Buffer.from(expectedMac);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

function makeSessionCookie(email) {
  const payload = { email, iat: Date.now(), exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const token = sign(payload);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function getSession(req) {
  const cookies = parseCookies(req.headers && req.headers.cookie);
  return verify(cookies[COOKIE_NAME]);
}

module.exports = { COOKIE_NAME, MAX_AGE_SECONDS, sign, verify, makeSessionCookie, clearSessionCookie, getSession, parseCookies };
