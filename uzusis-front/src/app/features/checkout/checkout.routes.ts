import { Routes } from '@angular/router';

import { CheckoutComponent } from './checkout.component';

// /checkout e /checkout?pedido=:id (retomar). O autenticadoGuard já está no app.routes.
const ROTAS: Routes = [{ path: '', component: CheckoutComponent, title: 'Finalizar compra — Uzusis' }];

export default ROTAS;
