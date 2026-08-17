// GET -> 200 { authed:true, email } con cookie de sesión válida, o 401 sin
// ella. telos-advisor.html llama esto al cargar antes de pedir ningún dato.

const { getSession } = require('./_lib/session');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ authed: false });
    return;
  }
  res.status(200).json({ authed: true, email: session.email });
};
