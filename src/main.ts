import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { DataService } from './app/data.service';
import { AuthService } from './app/auth.service';
import { authInterceptor } from './app/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // No boot: se houver token salvo, revalida a sessão e carrega os dados
    // (bootstrap é protegido). Sem token, vai direto para a tela de login.
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService, DataService],
      useFactory: (auth: AuthService, data: DataService) => async () => {
        if (!auth.hasToken()) return;
        try {
          await auth.restore();
          await data.load();
        } catch {
          auth.logout();   // token inválido/expirado
        }
      },
    },
  ],
}).catch((err) => console.error(err));
