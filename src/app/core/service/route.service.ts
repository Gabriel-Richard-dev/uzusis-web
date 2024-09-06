import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteService {

  constructor(private router: Router) {
    // Ouve as mudanças de navegação
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Rola para o topo
      window.scrollTo(0, 0);
    });
  }
}



