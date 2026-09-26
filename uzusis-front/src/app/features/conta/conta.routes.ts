import { Routes } from '@angular/router';

import { ContaComponent } from './conta.component';
import { DadosComponent } from './dados.component';
import { PedidosComponent } from './pedidos.component';

// O autenticadoGuard já está no app.routes.
const ROTAS: Routes = [
  {
    path: '',
    component: ContaComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      { path: 'pedidos', component: PedidosComponent, title: 'Minha conta — Uzusis' },
      { path: 'dados', component: DadosComponent, title: 'Minha conta — Uzusis' },
    ],
  },
];

export default ROTAS;
