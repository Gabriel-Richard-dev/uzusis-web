import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ItensPedidoComponent } from './itens-pedido.component';
import { PedidoRoutingModule } from './pedido-routing.module';
import { PedidoStatusComponent } from './pedido-status.component';

@NgModule({
  declarations: [PedidoStatusComponent],
  imports: [SharedModule, PedidoRoutingModule, ItensPedidoComponent],
})
export class PedidoModule {}
