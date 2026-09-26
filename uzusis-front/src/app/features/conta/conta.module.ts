import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ContaComponent } from './conta.component';
import { ContaRoutingModule } from './conta-routing.module';
import { DadosComponent } from './dados.component';
import { PedidosComponent } from './pedidos.component';

@NgModule({
  declarations: [ContaComponent, PedidosComponent, DadosComponent],
  imports: [SharedModule, ContaRoutingModule],
})
export class ContaModule {}
