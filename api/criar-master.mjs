// ============================================================
// Cria (ou redefine) a conta MASTER — o login do desenvolvedor, nível mais alto
// da hierarquia: cria, edita e exclui qualquer conta, inclusive as de CEO.
// Existe sempre exatamente UMA conta master: se já houver uma com outro login,
// ela é atualizada para o login/senha informados (não fica um master "sobrando").
//
// Uso:
//   node api/criar-master.mjs                          # login 'master', senha aleatória
//   MASTER_LOGIN=dev@x.com MASTER_SENHA=Segredo123 node api/criar-master.mjs
//
// Senha gerada (quando MASTER_SENHA não é informada) vai para api/.master-login.txt
// (fora do git). Troque-a no primeiro acesso em Configurações › Minha conta.
// ============================================================
import { randomBytes, randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool, q, tx } from './db.js';
import { hashPassword } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EST = process.env.EST_ID || 'e1';
const login = process.env.MASTER_LOGIN || 'master';
const nome = process.env.MASTER_NOME || 'Master';
const gerada = !process.env.MASTER_SENHA;
const senha = process.env.MASTER_SENHA || randomBytes(12).toString('base64url');

async function main() {
  const hash = await hashPassword(senha);
  const porLogin = await q('SELECT id FROM usuarios WHERE estabelecimento_id=? AND LOWER(email)=LOWER(?) LIMIT 1', [EST, login]);
  const masterAtual = await q("SELECT id, email FROM usuarios WHERE estabelecimento_id=? AND nivel='master' LIMIT 1", [EST]);
  // reaproveita a conta com esse login; senão, a conta master existente; senão, cria
  const id = porLogin[0]?.id || masterAtual[0]?.id || randomUUID();
  const existe = !!(porLogin[0] || masterAtual[0]);

  await tx(async (run) => {
    // só um master: qualquer outro master vira CEO (não perde acesso)
    await run("UPDATE usuarios SET nivel='ceo' WHERE estabelecimento_id=? AND nivel='master' AND id<>?", [EST, id]);
    if (existe) {
      await run("UPDATE usuarios SET nome=?, email=?, senha_hash=?, papel='dono', nivel='master', ativo=1 WHERE id=?", [nome, login, hash, id]);
    } else {
      await run("INSERT INTO usuarios (id, estabelecimento_id, nome, email, senha_hash, papel, nivel, ativo) VALUES (?,?,?,?,?,'dono','master',1)",
        [id, EST, nome, login, hash]);
    }
    await run('DELETE FROM usuario_permissoes WHERE usuario_id=?', [id]);   // master não usa permissões granulares
  });

  const antes = masterAtual[0] && masterAtual[0].id === id && masterAtual[0].email !== login ? ` (antes: ${masterAtual[0].email})` : '';
  console.log(`✓ Conta master ${existe ? 'redefinida' : 'criada'}: ${login}${antes}`);
  if (gerada) {
    const arquivo = join(__dirname, '.master-login.txt');
    writeFileSync(arquivo, `login: ${login}\nsenha: ${senha}\n`, { mode: 0o600 });
    console.log(`  senha gerada gravada em ${arquivo}`);
  } else {
    console.log('  senha: (definida via MASTER_SENHA)');
  }
  await pool.end();
}

main().catch((e) => { console.error('Falha ao criar master:', e.message); process.exit(1); });
