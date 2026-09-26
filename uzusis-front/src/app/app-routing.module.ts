import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard, autenticadoGuard } from './core/auth/auth.guards';
import { NaoEncontradoComponent } from './layout/nao-encontrado.component';
import { ShellComponent } from './layout/shell.component';

// Todo title segue '<Página> — Uzusis' (WCAG 2.4.2); os das features ficam nos routing modules delas.
const routes: Routes = [
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'checkout',
        canActivate: [autenticadoGuard],
        loadChildren: () => import('./features/checkout/checkout.module').then(m => m.CheckoutModule),
      },
      {
        path: 'pedido',
        canActivate: [autenticadoGuard],
        loadChildren: () => import('./features/checkout/pedido.module').then(m => m.PedidoModule),
      },
      {
        path: 'conta',
        canActivate: [autenticadoGuard],
        loadChildren: () => import('./features/conta/conta.module').then(m => m.ContaModule),
      },
      {
        path: '',
        loadChildren: () => import('./features/vitrine/vitrine.module').then(m => m.VitrineModule),
      },
      { path: '**', component: NaoEncontradoComponent, title: 'Página não encontrada — Uzusis' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
