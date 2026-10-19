/* Cliente HTTP da API REST (Node/Express + MySQL) */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, defer, finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly mutationsSettled = new Subject<void>();
  private pendingWrites = 0;
  private mutationVersion = 0;

  get version(): number { return this.mutationVersion; }
  get writing(): boolean { return this.pendingWrites > 0; }

  private write(request: () => Observable<any>): Observable<any> {
    return defer(() => {
      this.pendingWrites++;
      this.mutationVersion++;
      return request().pipe(finalize(() => {
        this.mutationVersion++;
        if (--this.pendingWrites === 0) this.mutationsSettled.next();
      }));
    });
  }
  /** Base da API. Usa o mesmo host que abriu a página (localhost no PC,
   *  IP da rede no celular), apontando para a porta 3000 do backend.
   *  Ajuste aqui se publicar o backend em outro host/porta. */
  readonly base = `http://${window.location.hostname}:3000/api`;

  constructor(private http: HttpClient) {}

  bootstrap(): Observable<any> {
    return this.http.get<any>(`${this.base}/bootstrap`);
  }
  get(path: string): Observable<any> {
    return this.http.get<any>(`${this.base}${path}`);
  }
  post(path: string, body: any): Observable<any> {
    return this.write(() => this.http.post<any>(`${this.base}${path}`, body));
  }
  put(path: string, body: any): Observable<any> {
    return this.write(() => this.http.put<any>(`${this.base}${path}`, body));
  }
  delete(path: string): Observable<any> {
    return this.write(() => this.http.delete<any>(`${this.base}${path}`));
  }
}
