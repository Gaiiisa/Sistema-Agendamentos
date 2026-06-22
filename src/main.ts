import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { DataService } from './app/data.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    // carrega os dados do banco (via API) antes de renderizar a aplicação
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [DataService],
      useFactory: (data: DataService) => () => data.load(),
    },
  ],
}).catch((err) => console.error(err));
