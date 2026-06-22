/* Cliente HTTP da API REST (Node/Express + MySQL) */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  /** Base da API. Ajuste aqui se publicar o backend em outro host/porta. */
  readonly base = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  bootstrap(): Observable<any> {
    return this.http.get<any>(`${this.base}/bootstrap`);
  }
  post(path: string, body: any): Observable<any> {
    return this.http.post<any>(`${this.base}${path}`, body);
  }
  put(path: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.base}${path}`, body);
  }
}
