import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PedidoStatusComponent } from './pedido-status.component';

// /pedido/:id (confirmação e polling). O autenticadoGuard já está no app-routing.
const routes: Routes = [{ path: ':id', component: PedidoStatusComponent, title: 'Seu pedido — Uzusis' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PedidoRoutingModule {}
