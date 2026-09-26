import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { GaleriaComponent } from './galeria.component';
import { GuiaMedidasComponent } from './guia-medidas.component';
import { HomeComponent } from './home.component';
import { LojaComponent } from './loja.component';
import { ProdutoCardComponent } from './produto-card.component';
import { ProdutoComponent } from './produto.component';
import { VitrineRoutingModule } from './vitrine-routing.module';

@NgModule({
  declarations: [
    GaleriaComponent,
    GuiaMedidasComponent,
    HomeComponent,
    LojaComponent,
    ProdutoCardComponent,
    ProdutoComponent,
  ],
  imports: [SharedModule, VitrineRoutingModule],
})
export class VitrineModule {}
