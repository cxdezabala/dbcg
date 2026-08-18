#!/usr/bin/env node
// Genera la línea que va en la variable de entorno TELOS_ADVISOR_USERS de
// Vercel. No sube nada a ningún sitio -- corre en tu máquina.
//
// Uso:
//   node scripts/telos-hash-password.js correo@dominio.com "tu contraseña"
//
// Para añadir a más personas más adelante, genera una línea por persona y
// júntalas separadas por comas en la misma variable de entorno.
//
// Alternativa sin correr nada: TELOS_ADVISOR_USERS también acepta una
// entrada en texto plano, para pegarla directo en el dashboard de Vercel:
//   tu-correo@gmail.com:plain:tu-contraseña
// (evita usar comas dentro de la contraseña -- separan a distintas personas
// dentro de la misma variable). Este script solo existe para quien prefiera
// no tener la contraseña en texto plano en ningún sitio.

const crypto = require('crypto');

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node scripts/telos-hash-password.js correo@dominio.com "tu contraseña"');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 32);
const line = `${email.trim().toLowerCase()}:scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;

console.log('\nAñade esta línea a TELOS_ADVISOR_USERS en Vercel (Project Settings → Environment Variables).');
console.log('Para varias personas, sepáralas con comas dentro de la misma variable:\n');
console.log(line);
console.log('');
