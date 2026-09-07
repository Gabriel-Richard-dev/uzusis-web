import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { InitialPageComponent } from './features/initial-page/initial-page.component';
import { LoginComponent } from "./features/auth/login/login/login.component";
import { ResetarSenhaComponent } from "./features/auth/resetar-senha/resetar-senha/resetar-senha.component";
import { CadastroComponent } from "./features/auth/cadastro/cadastro/cadastro.component";
import { EnviarEmailResetarSenhaComponent } from "./features/auth/enviar-email-resetar-senha/enviarEmailResetarSenha/enviarEmailResetarSenha.component";
import { CriarProdutoComponent } from "./features/admin/criar-produto/criarProduto/criarProduto.component";
import { LoginAdmComponent } from "./features/auth/tela-adm-logar/login-adm/login-adm.component";
import { PedidosPendentesComponent } from "./features/admin/pedidos-pendentes/pedidos-pendentes/pedidos-pendentes.component";
import { HistoricoPedidosComponent } from "./features/admin/historicos-de-pedidos/historico-pedidos/historico-pedidos.component";
import { PegarProdutosComponent } from "./features/admin/pegarProdutos/pegarProdutos/pegarProdutos.component";
import { PedidosComponent } from './features/user/pedidos/pedidos.component';
import { DashboardComponent } from "./features/admin/dashboard/dashboard.component";
import { adminGuard, clienteGuard } from "./core/guards/auth.guard";






const routes: Routes = [

{
  path: "admin/dashboard",
  component: DashboardComponent,
  canActivate: [adminGuard]
},

{
  path: "admin/pegar-produtos",
  component: PegarProdutosComponent,
  canActivate: [adminGuard]
},

{

path: "admin/criar-produto",
component: CriarProdutoComponent,
  canActivate: [adminGuard]
},
{
  path: "admin/pedidos-pendentes",
  component: PedidosPendentesComponent,
  canActivate: [adminGuard],
},
{
  path: "admin/historico-pedidos",
  component: HistoricoPedidosComponent,
  canActivate: [adminGuard]
},


  {
    path:"",
    component:InitialPageComponent,
  },
  {
    path: "login",
    component: LoginComponent
  },
  {
    path: "resetar-senha",
    component: ResetarSenhaComponent
  },

  {
    path: "cadastro",
    component:CadastroComponent
  },

  {
    path: "admin",
    component: LoginAdmComponent
  },
  {
    path: "enviarEmail",
    component: EnviarEmailResetarSenhaComponent
  },
  {
    path: "pedidos",
    component: PedidosComponent,
    canActivate: [clienteGuard]
  }

  // {
  //   path: "",
  //   children: [
  //     {
  //       path: "",
  //       loadChildren: () =>
  //         import("./features/1-proj/portfolio.module").then(
  //           (m) => m.estruturaModule
  //         ),
  //     },
  //   ],
  // },
 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
