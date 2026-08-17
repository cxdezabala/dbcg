// Verifica credenciales de asesor contra TELOS_ADVISOR_USERS. Dos formatos de
// entrada por persona, mezclables en la misma variable separada por comas:
//   correo@dominio.com:scrypt$saltHex$hashHex   (hash generado con
//     `node scripts/telos-hash-password.js` -- no expone la contraseña)
//   correo@dominio.com:plain:tu-contraseña       (texto plano, para pegarla
//     directamente en Vercel sin correr nada. Evita usar comas en la
//     contraseña: separan a las distintas personas dentro de la variable.)
// Usa crypto.scryptSync (ya incluido en Node) para no añadir ninguna
// dependencia nueva al proyecto — ver TELOS-DEPLOY.md §4.

const crypto = require('crypto');

function parseUsers() {
  const raw = process.env.TELOS_ADVISOR_USERS || '';
  const out = {};
  raw.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => {
    const idx = entry.indexOf(':');
    if (idx === -1) return;
    const email = entry.slice(0, idx).trim().toLowerCase();
    const hashSpec = entry.slice(idx + 1).trim();
    if (email && hashSpec) out[email] = hashSpec;
  });
  return out;
}

// Compara dos strings sin filtrar por tiempo si difieren en longitud:
// timingSafeEqual exige buffers del mismo tamaño, así que se comparan sus
// resúmenes SHA-256 (longitud fija) en vez de los strings originales.
function safeStringEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function verifyPassword(password, hashSpec) {
  const spec = hashSpec || '';
  if (spec.startsWith('plain:')) {
    return safeStringEqual(password, spec.slice('plain:'.length));
  }
  const parts = spec.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, saltHex, hashHex] = parts;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(password, salt, expected.length);
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Comprueba email+password. Si el correo no existe, igualmente hace un
// trabajo equivalente (derivar un scrypt) para que el tiempo de respuesta no
// delate si el correo estaba o no en la lista (defensa contra enumeración
// por timing).
function checkCredentials(email, password) {
  const users = parseUsers();
  const hashSpec = users[(email || '').trim().toLowerCase()];
  if (!hashSpec) {
    try { crypto.scryptSync(password || '', Buffer.alloc(16), 32); } catch { /* noop */ }
    return false;
  }
  return verifyPassword(password || '', hashSpec);
}

module.exports = { parseUsers, verifyPassword, checkCredentials };
