import { Injectable } from '@angular/core';
import { Cache } from '../adapters';
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
    const token = Cache.getSession({ key: 'token' });

    if (token !== null) {
      const authRequest = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`),
      });

      return next.handle(authRequest).pipe(
        catchError((error) => {
          console.error('HTTP Error:', error);
          if (error.status === 401 || error.status === 403) {
            this.router.navigateByUrl('/');
          }
          return throwError(error);
        })
      );
    } else {
      this.router.navigateByUrl('/');
    }

    return next.handle(request);
  }
}
