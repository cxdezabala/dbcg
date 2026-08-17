// Sesión del Telos Advisor, consolidada en una sola función (el plan Hobby
// de Vercel limita a 12 Serverless Functions por despliegue -- ver el commit
// que añadió este archivo para el detalle). Antes eran tres archivos
// separados (telos-login.js, telos-logout.js, telos-session.js); ahora es
// un único recurso "sesión" con verbos HTTP:
//   GET    -> comprobar sesión actual (200 {authed,email} / 401)
//   POST   -> iniciar sesión { email, password } -> cookie firmada
//   DELETE -> cerrar sesión (borra la cookie)
// Ver TELOS-DEPLOY.md §4.

const { getSession, makeSessionCookie, clearSessionCookie } = require('./_lib/session');
const { checkCredentials } = require('./_lib/telos-auth');
const { isRateLimited, recordLoginAttempt } = require('./_lib/telos-ratelimit');

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function handleGet(req, res) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ authed: false });
    return;
  }
  res.status(200).json({ authed: true, email: session.email });
}

async function handlePost(req, res) {
  const ip = clientIp(req);
  if (await isRateLimited(ip)) {
    await delay(400 + Math.random() * 300);
    res.status(429).json({ error: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.' });
    return;
  }

  const body = req.body || {};
  const { email, password } = body;
  const ok = typeof email === 'string' && typeof password === 'string' && checkCredentials(email, password);

  // Mismo retardo en éxito y en fallo, para no filtrar por tiempo de respuesta.
  await delay(400 + Math.random() * 300);

  if (!ok) {
    await recordLoginAttempt(ip);
    res.status(401).json({ error: 'Credenciales no válidas' });
    return;
  }

  res.setHeader('Set-Cookie', makeSessionCookie(email.trim().toLowerCase()));
  res.status(200).json({ ok: true });
}

async function handleDelete(req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(405).json({ error: 'Método no permitido' });
};
