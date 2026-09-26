import { Routes } from '@angular/router';

import { adminGuard, autenticadoGuard } from './core/auth/auth.guards';
import { NaoEncontradoComponent } from './layout/nao-encontrado.component';
import { ShellComponent } from './layout/shell.component';

// Todo title segue '<Página> — Uzusis' (WCAG 2.4.2); os das features ficam nos *.routes.ts delas.
export const ROTAS: Routes = [
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'checkout',
        canActivate: [autenticadoGuard],
        loadChildren: () => import('./features/checkout/checkout.routes'),
      },
      {
        path: 'pedido',
        canActivate: [autenticadoGuard],
        loadChildren: () => import('./features/checkout/pedido.routes'),
      },
      {
        path: 'conta',
        canActivate: [autenticadoGuard],
        loadChildren: () => import('./features/conta/conta.routes'),
      },
      {
        path: '',
        loadChildren: () => import('./features/vitrine/vitrine.routes'),
      },
      { path: '**', component: NaoEncontradoComponent, title: 'Página não encontrada — Uzusis' },
    ],
  },
];
