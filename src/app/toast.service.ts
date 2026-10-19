/* Serviço de notificações (toast) compartilhado.
   Permite que serviços sem UI própria (ex.: DataService) sinalizem
   sucesso ou falha ao usuário, reaproveitando o toast do AppComponent. */
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage { msg: string; type: 'ok' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _messages = new Subject<ToastMessage>();
  readonly messages$ = this._messages.asObservable();

  /** Mensagem de sucesso/informação. */
  show(msg: string) { this._messages.next({ msg, type: 'ok' }); }

  /** Mensagem de erro (falha de gravação, indisponibilidade, etc.). */
  error(msg: string) { this._messages.next({ msg, type: 'error' }); }
}
