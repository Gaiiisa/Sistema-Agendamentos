/* Sessão / autenticação — guarda o token + usuário logado e fala com a API. */
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { TOKEN_KEY } from './auth.interceptor';

/** Hierarquia: master (desenvolvedor) > ceo (dono) > usuario (permissões granulares). */
export type Nivel = 'master' | 'ceo' | 'usuario';
export const NIVEL_LABEL: Record<Nivel, string> = { master: 'Master', ceo: 'CEO', usuario: 'Usuário' };

export interface Usuario {
  id: string; nome: string; email: string; papel: string; papelCod: string;
  nivel: Nivel; permissoes: string[]; cor: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario: Usuario | null = null;
  authenticated = false;

  constructor(private api: ApiService) {}

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  hasToken(): boolean { return !!this.token; }

  get isMaster(): boolean { return this.usuario?.nivel === 'master'; }
  /** Master ou CEO: acesso total aos módulos e gestão de usuários. */
  get isGestor(): boolean { return this.usuario?.nivel === 'master' || this.usuario?.nivel === 'ceo'; }

  /** Verifica se a sessão tem a permissão 'modulo:acao'. Fonte única de autorização no front. */
  can(modulo: string, acao: string): boolean {
    if (!this.usuario) return false;
    if (this.isGestor) return true;
    return this.usuario.permissoes?.includes(`${modulo}:${acao}`) ?? false;
  }

  /** Pode ao menos visualizar o módulo (usado para menu/rota). */
  canView(modulo: string): boolean { return this.can(modulo, 'ver'); }

  /** Faz login; em sucesso persiste o token e marca a sessão. */
  async login(email: string, senha: string): Promise<Usuario> {
    const r: any = await firstValueFrom(this.api.post('/login', { email, senha }));
    localStorage.setItem(TOKEN_KEY, r.token);
    this.usuario = r.usuario;
    this.authenticated = true;
    return r.usuario;
  }

  /** Revalida a sessão a partir do token salvo (chamado no boot). */
  async restore(): Promise<Usuario> {
    const r: any = await firstValueFrom(this.api.get('/me'));
    this.usuario = r.usuario;
    this.authenticated = true;
    return r.usuario;
  }

  /** Encerra a sessão: descarta o token (JWT é stateless) e limpa o estado. */
  logout(): void {
    this.api.post('/logout', {}).subscribe({ error: () => {} });
    localStorage.removeItem(TOKEN_KEY);
    this.usuario = null;
    this.authenticated = false;
  }
}
