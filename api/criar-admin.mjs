// ============================================================
// Criação / reset seguro do usuário administrador.
// Não há credenciais fixas no código: a senha vem de ADMIN_SENHA
// (variável de ambiente) ou é gerada aleatoriamente e impressa UMA vez.
//
// Uso:
//   node api/criar-admin.mjs                          # gera senha aleatória
//   ADMIN_EMAIL=dono@x.com ADMIN_SENHA=Segredo123 node api/criar-admin.mjs
//   ADMIN_NOME="Carlos" ADMIN_EST=e1 node api/criar-admin.mjs
//
// Faz UPSERT por (estabelecimento_id, email): cria se não existir, senão
// atualiza a senha/nome/papel e reativa o usuário.
// ============================================================
import { randomBytes, randomUUID } from 'crypto';
import { pool, q } from './db.js';
import { hashPassword } from './auth.js';

const EST = process.env.ADMIN_EST || process.env.EST_ID || 'e1';
const email = process.env.ADMIN_EMAIL || 'admin@navalha.local';
const nome = process.env.ADMIN_NOME || 'Administrador';
// senha forte aleatória quando não informada (12 bytes base64url -> ~16 chars)
const gerada = !process.env.ADMIN_SENHA;
const senha = process.env.ADMIN_SENHA || randomBytes(12).toString('base64url');

async function main() {
  const hash = await hashPassword(senha);
  const existentes = await q('SELECT id FROM usuarios WHERE estabelecimento_id=? AND email=?', [EST, email]);

  if (existentes.length) {
    await q(
      "UPDATE usuarios SET nome=?, senha_hash=?, papel='dono', ativo=1 WHERE id=?",
      [nome, hash, existentes[0].id],
    );
    console.log(`✓ Admin atualizado (${email}).`);
  } else {
    const id = randomUUID();
    await q(
      "INSERT INTO usuarios (id, estabelecimento_id, nome, email, senha_hash, papel, ativo) VALUES (?,?,?,?,?,'dono',1)",
      [id, EST, nome, email, hash],
    );
    console.log(`✓ Admin criado (${email}).`);
  }

  console.log('  e-mail:', email);
  if (gerada) {
    console.log('  senha :', senha, '  <-- anote agora; não será exibida de novo');
  } else {
    console.log('  senha : (definida via ADMIN_SENHA)');
  }
  await pool.end();
}

main().catch((e) => { console.error('Falha ao criar admin:', e.message); process.exit(1); });
