import { Routes } from '@angular/router';

import { PedidoStatusComponent } from './pedido-status.component';

// /pedido/:id (confirmação e polling). O autenticadoGuard já está no app.routes.
const ROTAS: Routes = [{ path: ':id', component: PedidoStatusComponent, title: 'Seu pedido — Uzusis' }];

export default ROTAS;
