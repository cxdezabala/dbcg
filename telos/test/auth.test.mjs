// Tests de la capa de autenticación del Advisor (api/_lib/session.js y
// api/_lib/telos-auth.js). Código sensible -- credenciales y sesión -- merece
// su propia verificación automatizada aparte de los motores de proyección.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.TELOS_SESSION_SECRET = 'test-secret-only-for-this-suite';

const { sign, verify, makeSessionCookie, clearSessionCookie, getSession, MAX_AGE_SECONDS } =
  await import('../../api/_lib/session.js');
const { checkCredentials, verifyPassword, parseUsers } = await import('../../api/_lib/telos-auth.js');

describe('session: firma y verificación', () => {
  test('un token recién firmado verifica y devuelve el payload', () => {
    const token = sign({ email: 'a@b.com', iat: Date.now(), exp: Date.now() + 1000 });
    const payload = verify(token);
    assert.equal(payload.email, 'a@b.com');
  });

  test('un token alterado (cuerpo distinto) se rechaza', () => {
    const token = sign({ email: 'a@b.com', iat: Date.now(), exp: Date.now() + 60000 });
    const [body, mac] = token.split('.');
    const tamperedBody = Buffer.from(JSON.stringify({ email: 'attacker@evil.com', iat: Date.now(), exp: Date.now() + 60000 })).toString('base64url');
    const tampered = tamperedBody + '.' + mac;
    assert.equal(verify(tampered), null);
  });

  test('un token expirado se rechaza', () => {
    const token = sign({ email: 'a@b.com', iat: Date.now() - 2000, exp: Date.now() - 1000 });
    assert.equal(verify(token), null);
  });

  test('un token con firma incorrecta se rechaza', () => {
    const token = sign({ email: 'a@b.com', iat: Date.now(), exp: Date.now() + 60000 });
    const [body] = token.split('.');
    assert.equal(verify(body + '.' + 'a'.repeat(43)), null);
  });

  test('makeSessionCookie produce flags HttpOnly, Secure, SameSite=Strict', () => {
    const cookie = makeSessionCookie('asesor@dbcg.es');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, new RegExp('Max-Age=' + MAX_AGE_SECONDS));
  });

  test('clearSessionCookie pone Max-Age=0', () => {
    assert.match(clearSessionCookie(), /Max-Age=0/);
  });

  test('getSession(req) lee la cookie del header y la valida', () => {
    const cookie = makeSessionCookie('asesor@dbcg.es');
    const cookieValue = cookie.split(';')[0]; // "telos_session=<token>"
    const req = { headers: { cookie: cookieValue } };
    const session = getSession(req);
    assert.equal(session.email, 'asesor@dbcg.es');
  });

  test('getSession(req) sin cookie devuelve null', () => {
    assert.equal(getSession({ headers: {} }), null);
  });
});

describe('telos-auth: credenciales', () => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync('correcta123', salt, 32);
  const hashSpec = 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex');

  test('verifyPassword acepta la contraseña correcta', () => {
    assert.equal(verifyPassword('correcta123', hashSpec), true);
  });

  test('verifyPassword rechaza una contraseña incorrecta', () => {
    assert.equal(verifyPassword('incorrecta', hashSpec), false);
  });

  test('checkCredentials contra TELOS_ADVISOR_USERS con varias personas', () => {
    process.env.TELOS_ADVISOR_USERS = 'a@dbcg.es:' + hashSpec + ',b@dbcg.es:' + hashSpec;
    assert.equal(checkCredentials('a@dbcg.es', 'correcta123'), true);
    assert.equal(checkCredentials('A@DBCG.ES', 'correcta123'), true); // email case-insensitive
    assert.equal(checkCredentials('b@dbcg.es', 'correcta123'), true);
    assert.equal(checkCredentials('a@dbcg.es', 'mala'), false);
    assert.equal(checkCredentials('inexistente@dbcg.es', 'correcta123'), false);
    delete process.env.TELOS_ADVISOR_USERS;
  });

  test('parseUsers ignora entradas mal formadas', () => {
    process.env.TELOS_ADVISOR_USERS = 'a@dbcg.es:' + hashSpec + ', , sinDosPuntos , b@dbcg.es:' + hashSpec;
    const users = parseUsers();
    assert.deepEqual(Object.keys(users).sort(), ['a@dbcg.es', 'b@dbcg.es']);
    delete process.env.TELOS_ADVISOR_USERS;
  });
});
