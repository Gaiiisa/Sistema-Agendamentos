import { Component, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  styles: [`
    /* ════════════════════ Página ════════════════════ */
    .login-page {
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      background: var(--app-bg);
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    /* manchas suaves de luz no fundo */
    .login-page::before,
    .login-page::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      opacity: .55;
    }
    .login-page::before {
      width: 520px; height: 520px;
      top: -180px; left: -120px;
      background: radial-gradient(circle, var(--accent-soft-2), transparent 70%);
    }
    .login-page::after {
      width: 460px; height: 460px;
      bottom: -200px; right: -120px;
      background: radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%);
    }

    /* botão de tema no canto */
    .theme-toggle {
      position: absolute; top: 18px; right: 18px; z-index: 3;
      width: 38px; height: 38px; border-radius: var(--r-md);
      display: grid; place-items: center;
      background: var(--nav-glass);
      backdrop-filter: var(--nav-blur); -webkit-backdrop-filter: var(--nav-blur);
      border: 1px solid var(--nav-border);
      color: var(--nav-text-h);
      transition: color .15s, transform .12s;
    }
    .theme-toggle:hover { color: var(--nav-text-on); }
    .theme-toggle:active { transform: scale(.92); }

    /* ════════════════════ Shell split ════════════════════ */
    .login-shell {
      position: relative; z-index: 1;
      width: 100%; max-width: 940px;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-xl);
      box-shadow: var(--sh-pop);
      overflow: hidden;
      animation: rise .26s cubic-bezier(.2,.9,.3,1) both;
    }
    @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(.98); } }

    /* ──────── Painel showcase (esquerda) ──────── */
    .showcase {
      position: relative;
      padding: 44px 40px;
      background:
        linear-gradient(150deg, var(--accent-soft-2) 0%, transparent 48%),
        radial-gradient(120% 90% at 100% 100%, var(--accent-soft) 0%, transparent 55%),
        var(--app-bg);
      display: flex; flex-direction: column;
      overflow: hidden;
      isolation: isolate;
    }
    .showcase::before { /* véu de vidro sobre o gradiente, igual à nav */
      content: ''; position: absolute; inset: 0;
      background: var(--nav-glass);
      backdrop-filter: var(--nav-blur); -webkit-backdrop-filter: var(--nav-blur);
      z-index: -1;
    }
    .sc-brand { display: flex; align-items: center; gap: 11px; }
    .sc-logo {
      width: 40px; height: 40px; border-radius: 11px;
      background: var(--nav-logo-bg);
      border: 1px solid var(--nav-logo-border);
      display: grid; place-items: center;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
      color: var(--nav-text-on);
    }
    .sc-brand-name {
      font-size: 17px; font-weight: 800; letter-spacing: -0.03em;
      color: var(--nav-brand);
    }
    .sc-welcome {
      margin-top: auto; padding-top: 36px;
    }
    .sc-welcome h1 {
      font-size: 27px; font-weight: 800; letter-spacing: -0.035em;
      line-height: 1.12; color: var(--nav-text-on);
    }
    .sc-welcome p {
      margin-top: 12px; max-width: 34ch;
      font-size: 14px; line-height: 1.55;
      color: var(--nav-text-h);
    }
    .sc-benefits {
      margin-top: 26px; display: flex; flex-direction: column; gap: 13px;
    }
    .sc-benefit {
      display: flex; align-items: center; gap: 11px;
      font-size: 13.5px; font-weight: 600; color: var(--nav-text-on);
      animation: fadein .4s ease both;
    }
    .sc-benefit:nth-child(1) { animation-delay: .10s; }
    .sc-benefit:nth-child(2) { animation-delay: .18s; }
    .sc-benefit:nth-child(3) { animation-delay: .26s; }
    .sc-benefit .bi {
      width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
      display: grid; place-items: center;
      background: var(--nav-pill);
      border: 1px solid var(--nav-pill-border);
      box-shadow: var(--nav-pill-shadow);
      color: var(--nav-text-on);
    }
    /* ícones dos benefícios com cor (paleta do sistema) */
    .sc-benefit:nth-child(1) .bi { color: var(--accent); }
    .sc-benefit:nth-child(2) .bi { color: var(--st-confirmado); }
    .sc-benefit:nth-child(3) .bi { color: var(--st-atendimento); }
    @keyframes fadein { from { opacity: 0; transform: translateX(-8px); } }

    /* card flutuante de métrica (evoca o dashboard) */
    .sc-float {
      position: absolute; top: 38px; right: -14px;
      width: 168px; padding: 13px 15px;
      background: var(--nav-pill);
      border: 1px solid var(--nav-pill-border);
      border-radius: var(--r-lg);
      box-shadow: var(--nav-pill-shadow), 0 10px 30px rgba(0,0,0,0.16);
      animation: floaty 5s ease-in-out infinite;
    }
    .sc-float .lbl {
      font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
      color: var(--nav-text-h);
    }
    .sc-float .val {
      font-size: 22px; font-weight: 800; letter-spacing: -0.03em;
      color: var(--nav-text-on); line-height: 1.1; margin-top: 3px;
    }
    .sc-float .spark { display: flex; align-items: flex-end; gap: 3px; height: 26px; margin-top: 9px; }
    .sc-float .spark i {
      flex: 1; background: var(--accent); opacity: .9;
      border-radius: 2px 2px 0 0; display: block;
    }
    .sc-float .spark i:last-child { background: var(--st-confirmado); }
    @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

    /* ──────── Painel formulário (direita) ──────── */
    .form-panel {
      padding: 46px 44px;
      display: flex; flex-direction: column; justify-content: center;
    }
    .fp-head { margin-bottom: 26px; }
    .fp-head h2 {
      font-size: 21px; font-weight: 800; letter-spacing: -0.03em; color: var(--text);
    }
    .fp-head p { margin-top: 5px; font-size: 13.5px; color: var(--text-3); }

    .login-form { display: flex; flex-direction: column; gap: 15px; }

    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label {
      font-size: 12.5px; font-weight: 600; color: var(--text-2);
      display: flex; align-items: center; justify-content: space-between;
    }

    /* input com ícone + ação */
    .input-wrap {
      display: flex; align-items: center; gap: 9px;
      padding: 0 12px;
      border-radius: var(--r-md);
      border: 1px solid var(--border-strong);
      background: var(--surface);
      transition: border-color .14s, box-shadow .14s;
    }
    .input-wrap .lead { color: var(--text-3); flex-shrink: 0; display: grid; place-items: center; }
    .input-wrap input {
      flex: 1; min-width: 0;
      padding: 11px 0; border: none; outline: none; background: none;
      color: var(--text); font-size: 14px;
    }
    .input-wrap:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .input-wrap:focus-within .lead { color: var(--accent); }
    .input-wrap.invalid {
      border-color: var(--st-faltou);
      box-shadow: 0 0 0 3px var(--st-faltou-bg);
    }
    .eye-btn {
      flex-shrink: 0; width: 30px; height: 30px; border-radius: var(--r-sm);
      display: grid; place-items: center; color: var(--text-3);
      transition: color .12s, background .12s;
    }
    .eye-btn:hover { color: var(--text-2); background: var(--surface-2); }

    .field-msg { font-size: 11.5px; color: var(--st-faltou); font-weight: 500; }
    .caps-msg { font-size: 11.5px; color: var(--st-pendente); font-weight: 600; display: flex; align-items: center; gap: 5px; }

    /* linha opções */
    .fp-options {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin-top: -2px;
    }
    .remember {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--text-2); cursor: pointer; user-select: none;
    }
    .remember .box {
      width: 17px; height: 17px; border-radius: 5px;
      border: 1.5px solid var(--border-strong); background: var(--surface);
      display: grid; place-items: center; color: var(--on-accent);
      transition: .12s; flex-shrink: 0;
    }
    .remember .box.on { background: var(--accent); border-color: var(--accent); }
    .forgot {
      font-size: 13px; font-weight: 600; color: var(--accent-text);
      background: none; padding: 0;
    }
    .forgot:hover { color: var(--accent-hover); text-decoration: underline; }

    /* erro global */
    .login-error {
      display: flex; align-items: center; gap: 9px;
      padding: 10px 12px; border-radius: var(--r-md);
      background: var(--st-faltou-bg); border: 1px solid var(--st-faltou);
      color: var(--st-faltou); font-size: 13px; font-weight: 600;
      animation: shake .3s ease;
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-5px); } 40% { transform: translateX(5px); }
      60% { transform: translateX(-4px); } 80% { transform: translateX(4px); }
    }

    /* botão principal */
    .login-btn {
      width: 100%; height: 44px; margin-top: 4px;
      display: inline-flex; align-items: center; justify-content: center; gap: 9px;
      font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em;
      border-radius: var(--r-md);
      background: var(--btn-bg); color: var(--btn-fg);
      box-shadow: var(--sh-sm);
      transition: background .12s, box-shadow .12s, transform .06s, opacity .12s;
    }
    .login-btn:hover:not(:disabled) { background: var(--btn-bg-hover); box-shadow: var(--sh-md); }
    .login-btn:active:not(:disabled) { background: var(--btn-bg-press); transform: translateY(1px); box-shadow: none; }
    .login-btn:disabled { opacity: .55; cursor: default; }
    .login-btn.is-ok { background: var(--st-confirmado); box-shadow: none; }

    .spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid currentColor; border-right-color: transparent;
      animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .fp-foot {
      margin-top: 22px; text-align: center;
      font-size: 12px; color: var(--text-3);
    }

    /* ════════════════════ Responsivo ════════════════════ */
    @media (max-width: 860px) {
      .login-shell { grid-template-columns: 1fr; max-width: 420px; }
      .showcase { display: none; }
      .form-panel { padding: 38px 30px; }
    }
    @media (max-width: 420px) {
      .login-page { padding: 16px; }
      .form-panel { padding: 32px 22px; }
      .fp-options { flex-wrap: wrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      .login-shell, .sc-benefit, .sc-float, .login-error { animation: none; }
      .spinner { animation-duration: 1.2s; }
    }
  `],
  template: `
    <div class="login-page">

      <button type="button" class="theme-toggle" (click)="toggleTheme()"
              [attr.aria-label]="theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'">
        <app-icon [name]="theme === 'dark' ? 'sun' : 'moon'" [size]="17"></app-icon>
      </button>

      <div class="login-shell">

        <!-- ───────── Showcase ───────── -->
        <aside class="showcase">
          <div class="sc-brand">
            <div class="sc-logo">
              <app-icon name="scissors" [size]="20"></app-icon>
            </div>
            <span class="sc-brand-name">Lâmina</span>
          </div>

          <div class="sc-float" aria-hidden="true">
            <div class="lbl">Agendamentos · hoje</div>
            <div class="val">15</div>
            <div class="spark">
              @for (h of spark; track $index) {
                <i [style.height.%]="h"></i>
              }
            </div>
          </div>

          <div class="sc-welcome">
            <h1>Sua barbearia,<br>sob controle total.</h1>
            <p>Agenda, caixa, equipe e clientes em um só lugar. Entre para ver o dia de hoje.</p>

            <div class="sc-benefits">
              <div class="sc-benefit">
                <span class="bi"><app-icon name="calendar" [size]="15"></app-icon></span>
                Agenda inteligente e sem furos
              </div>
              <div class="sc-benefit">
                <span class="bi"><app-icon name="money" [size]="15"></app-icon></span>
                Caixa e comissões automáticos
              </div>
              <div class="sc-benefit">
                <span class="bi"><app-icon name="users" [size]="15"></app-icon></span>
                Clientes fiéis e campanhas no WhatsApp
              </div>
            </div>
          </div>
        </aside>

        <!-- ───────── Formulário ───────── -->
        <div class="form-panel">
          <div class="fp-head">
            <h2>Bem-vindo de volta 👋</h2>
            <p>Entre com suas credenciais para acessar o painel.</p>
          </div>

          <form class="login-form" (ngSubmit)="login()" novalidate>

            <!-- usuário -->
            <div class="field">
              <label for="email">Email / Usuário</label>
              <div class="input-wrap" [class.invalid]="touched.email && !email.trim()">
                <span class="lead"><app-icon name="user" [size]="16"></app-icon></span>
                <input
                  #emailInput
                  id="email" type="text" placeholder="voce@empresa.com"
                  [(ngModel)]="email" name="email"
                  autocomplete="username" autocapitalize="none" spellcheck="false"
                  [disabled]="loading || done"
                  (blur)="touched.email = true"
                  (input)="error = ''"
                  [attr.aria-invalid]="touched.email && !email.trim()"
                />
              </div>
              @if (touched.email && !email.trim()) {
                <span class="field-msg">Informe seu usuário.</span>
              }
            </div>

            <!-- senha -->
            <div class="field">
              <label for="senha">Senha</label>
              <div class="input-wrap" [class.invalid]="touched.senha && !senha">
                <span class="lead"><app-icon name="lock" [size]="16"></app-icon></span>
                <input
                  id="senha" [type]="showPass ? 'text' : 'password'" placeholder="••••••••"
                  [(ngModel)]="senha" name="senha"
                  autocomplete="current-password"
                  [disabled]="loading || done"
                  (blur)="touched.senha = true"
                  (input)="error = ''"
                  (keyup)="checkCaps($event)" (keydown)="checkCaps($event)"
                  [attr.aria-invalid]="touched.senha && !senha"
                />
                <button type="button" class="eye-btn" (click)="showPass = !showPass"
                        [attr.aria-label]="showPass ? 'Ocultar senha' : 'Mostrar senha'"
                        [attr.aria-pressed]="showPass" tabindex="0">
                  @if (showPass) {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" y1="2" x2="22" y2="22"/>
                    </svg>
                  } @else {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  }
                </button>
              </div>
              @if (touched.senha && !senha) {
                <span class="field-msg">Informe sua senha.</span>
              } @else if (capsOn) {
                <span class="caps-msg">
                  <app-icon name="alert" [size]="13"></app-icon> Caps Lock está ativado
                </span>
              }
            </div>

            <!-- opções -->
            <div class="fp-options">
              <label class="remember">
                <span class="box" [class.on]="remember">
                  @if (remember) { <app-icon name="check" [size]="12" [stroke]="3"></app-icon> }
                </span>
                <input type="checkbox" [(ngModel)]="remember" name="remember" hidden>
                Lembrar de mim
              </label>
              <button type="button" class="forgot" (click)="forgot()">Esqueci a senha</button>
            </div>

            <!-- erro -->
            @if (error) {
              <div class="login-error" role="alert" aria-live="assertive">
                <app-icon name="alert" [size]="15"></app-icon>
                {{ error }}
              </div>
            }

            <!-- botão -->
            <button type="submit" class="login-btn" [class.is-ok]="done"
                    [disabled]="loading || done" [attr.aria-busy]="loading">
              @if (done) {
                <app-icon name="check" [size]="17" [stroke]="3"></app-icon> Acesso liberado
              } @else if (loading) {
                <span class="spinner"></span> Entrando…
              } @else {
                Entrar
              }
            </button>
          </form>

          <div class="fp-foot">© {{ year }} Lâmina · Todos os direitos reservados</div>
        </div>

      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  @Output() success = new EventEmitter<void>();
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  email = '';
  senha = '';
  error = '';
  loading = false;
  done = false;               // estado de sucesso (mantém o botão verde antes de emitir)
  showPass = false;
  remember = false;
  capsOn = false;
  touched = { email: false, senha: false };
  theme: 'dark' | 'light' = 'light';
  readonly year = new Date().getFullYear();
  readonly spark = [40, 62, 48, 80, 58, 92, 70];

  constructor(private auth: AuthService, private data: DataService) {}

  ngOnInit() {
    // tema persistido (mesma chave usada pela sidebar)
    const saved = localStorage.getItem('app-theme');
    this.theme = saved === 'dark' ? 'dark' : 'light';
    this.applyTheme();
    // usuário lembrado
    const remembered = localStorage.getItem('login-user');
    if (remembered) { this.email = remembered; this.remember = true; }
    // foco inicial
    setTimeout(() => this.emailInput?.nativeElement.focus(), 60);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('app-theme', this.theme);
    this.applyTheme();
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  checkCaps(e: KeyboardEvent) {
    if (typeof e.getModifierState === 'function') {
      this.capsOn = e.getModifierState('CapsLock');
    }
  }

  forgot() {
    this.error = '';
    alert('Recuperação de senha: enviaremos um link para o e-mail cadastrado. (Demonstração)');
  }

  async login() {
    if (this.loading || this.done) return;   // previne múltiplos cliques
    this.error = '';
    this.touched = { email: true, senha: true };

    // validação antes do envio
    if (!this.email.trim() || !this.senha) {
      this.error = 'Preencha e-mail e senha para continuar.';
      return;
    }

    // ── autenticação real (API + banco) ──
    this.loading = true;
    if (this.remember) localStorage.setItem('login-user', this.email);
    else localStorage.removeItem('login-user');
    try {
      await this.auth.login(this.email.trim(), this.senha);
      await this.data.load();               // carrega os dados já autenticado
      this.loading = false;
      this.done = true;
      setTimeout(() => this.success.emit(), 450);
    } catch (e: any) {
      this.loading = false;
      // mensagem vinda do backend (401/403) ou fallback de rede
      this.error = e?.error?.error || 'Não foi possível entrar. Verifique sua conexão e tente novamente.';
    }
  }
}
