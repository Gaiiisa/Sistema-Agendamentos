// ============================================================
// Autenticação — hashing de senha (bcrypt) + tokens JWT + middleware.
// Reaproveitado por server.js e criar-admin.mjs.
// ============================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = join(__dirname, '.auth-secret');
const TOKEN_TTL = process.env.JWT_TTL || '12h';
const BCRYPT_ROUNDS = 10;

// Segredo do JWT: env > arquivo persistido > gerado na hora (e salvo).
// Persistir evita invalidar todos os tokens a cada restart, sem hardcode no código.
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (existsSync(SECRET_FILE)) return readFileSync(SECRET_FILE, 'utf8').trim();
  const s = randomBytes(48).toString('hex');
  try { writeFileSync(SECRET_FILE, s, { mode: 0o600 }); } catch { /* fs RO: usa em memória */ }
  return s;
}
const SECRET = loadSecret();

export const hashPassword = (senha) => bcrypt.hash(senha, BCRYPT_ROUNDS);
export const verifyPassword = (senha, hash) => bcrypt.compare(senha, hash || '');

export const signToken = (usuario) =>
  jwt.sign(
    { sub: usuario.id, papel: usuario.papel, est: usuario.estabelecimento_id },
    SECRET,
    { expiresIn: TOKEN_TTL },
  );

export const verifyToken = (token) => jwt.verify(token, SECRET);

// Middleware: exige Bearer token válido. Popula req.auth = { sub, papel, est }.
export function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
  }
}

// Middleware opcional por papel (ex.: authRole('dono','admin')).
export const authRole = (...papeis) => (req, res, next) => {
  if (!req.auth || !papeis.includes(req.auth.papel)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};
