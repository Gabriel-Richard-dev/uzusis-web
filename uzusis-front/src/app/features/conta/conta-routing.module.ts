import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ContaComponent } from './conta.component';
import { DadosComponent } from './dados.component';
import { PedidosComponent } from './pedidos.component';

// O autenticadoGuard já está no app-routing.
const routes: Routes = [
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContaRoutingModule {}
