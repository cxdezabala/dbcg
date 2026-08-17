// POST { email, password } -> si coincide con TELOS_ADVISOR_USERS, emite una
// cookie de sesión firmada (api/_lib/session.js). Ante credencial incorrecta,
// respuesta genérica y un retardo, sin distinguir si falló el correo o la
// contraseña. Limita intentos por IP (api/_lib/telos-ratelimit.js).
// Ver TELOS-DEPLOY.md §4.

const { checkCredentials } = require('./_lib/telos-auth');
const { makeSessionCookie } = require('./_lib/session');
const { isRateLimited, recordLoginAttempt } = require('./_lib/telos-ratelimit');

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

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
};
