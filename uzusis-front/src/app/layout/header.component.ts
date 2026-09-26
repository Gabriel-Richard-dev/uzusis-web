import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CATEGORIAS } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'uz-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Output() abrirMenu = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  readonly sacola = inject(SacolaService);
  readonly usuario$ = this.auth.usuario$;
  readonly quantidade$ = this.sacola.quantidade$;
  readonly categorias = CATEGORIAS;
  private readonly router = inject(Router);

  termo = '';
  buscaAberta = false;

  buscar(): void {
    const q = this.termo.trim();
    this.buscaAberta = false;
    void this.router.navigate(['/loja'], { queryParams: q ? { q } : {} });
  }
}
