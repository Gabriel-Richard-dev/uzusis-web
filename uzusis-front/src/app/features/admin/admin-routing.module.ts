import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';
import { PainelComponent } from './painel.component';
import { PedidosAdminComponent } from './pedidos-admin.component';
import { ProdutoFormComponent } from './produto-form.component';
import { ProdutosComponent } from './produtos.component';

// Fora do ShellComponent da loja (tem o próprio <main id="conteudo">). adminGuard (canMatch) no app-routing.
const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', component: PainelComponent, title: 'Administração — Uzusis' },
      { path: 'produtos', component: ProdutosComponent, title: 'Produtos — Administração — Uzusis' },
      { path: 'produtos/novo', component: ProdutoFormComponent, title: 'Novo produto — Administração — Uzusis' },
      { path: 'produtos/:id', component: ProdutoFormComponent, title: 'Editar produto — Administração — Uzusis' },
      {
        path: 'pedidos',
        component: PedidosAdminComponent,
        data: { modo: 'enviar' },
        title: 'Pedidos a enviar — Administração — Uzusis',
      },
      {
        path: 'pedidos/historico',
        component: PedidosAdminComponent,
        data: { modo: 'historico' },
        title: 'Histórico de pedidos — Administração — Uzusis',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
