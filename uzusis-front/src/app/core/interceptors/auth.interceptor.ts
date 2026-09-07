import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('token');

    // Quem já mandou o próprio Authorization (admin usa `tokenAdm`) passa intacto.
    const requisicao =
      token && !request.headers.has('Authorization')
        ? request.clone({ headers: request.headers.set('Authorization', `Bearer ${token}`) })
        : request;

    return next.handle(requisicao).pipe(
      catchError((error) => {
        // Sessão expirada: limpa e volta pra home. Rota pública com 401 não derruba ninguém.
        if ((error.status === 401 || error.status === 403) && token) {
          localStorage.removeItem('token');
          this.router.navigateByUrl('/');
        }
        return throwError(() => error);
      })
    );
  }
}
