import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminShellComponent } from './admin-shell.component';
import { GerenciadorFotosComponent } from './gerenciador-fotos.component';
import { PainelComponent } from './painel.component';
import { PedidosAdminComponent } from './pedidos-admin.component';
import { ProdutoFormComponent } from './produto-form.component';
import { ProdutosComponent } from './produtos.component';

@NgModule({
  declarations: [
    AdminShellComponent,
    GerenciadorFotosComponent,
    PainelComponent,
    PedidosAdminComponent,
    ProdutoFormComponent,
    ProdutosComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}
