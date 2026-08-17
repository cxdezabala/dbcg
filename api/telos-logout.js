// Borra la cookie de sesión del Telos Advisor.

const { clearSessionCookie } = require('./_lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
};
