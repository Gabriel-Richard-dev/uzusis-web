import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CheckoutComponent } from './checkout.component';

// /checkout e /checkout?pedido=:id (retomar). O autenticadoGuard já está no app-routing.
const routes: Routes = [{ path: '', component: CheckoutComponent, title: 'Finalizar compra — Uzusis' }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CheckoutRoutingModule {}
