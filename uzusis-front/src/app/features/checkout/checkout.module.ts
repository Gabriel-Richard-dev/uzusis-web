import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { CheckoutRoutingModule } from './checkout-routing.module';
import { CheckoutComponent } from './checkout.component';
import { ItensPedidoComponent } from './itens-pedido.component';

@NgModule({
  declarations: [CheckoutComponent],
  imports: [SharedModule, CheckoutRoutingModule, ItensPedidoComponent],
})
export class CheckoutModule {}
