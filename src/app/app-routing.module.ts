import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { InitialPageComponent } from './features/initial-page/initial-page.component';
import { LoginComponent } from "./features/auth/login/login/login.component";
import { ResetarSenhaComponent } from "./features/auth/resetar-senha/resetar-senha/resetar-senha.component";
import { CadastroComponent } from "./features/auth/cadastro/cadastro/cadastro.component";
import { EnviarEmailResetarSenhaComponent } from "./features/auth/enviar-email-resetar-senha/enviarEmailResetarSenha/enviarEmailResetarSenha.component";






const routes: Routes = [
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
    path: "enviarEmail",
    component: EnviarEmailResetarSenhaComponent
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
