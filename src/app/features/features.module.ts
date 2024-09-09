import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ComponentsModule } from '../shared/components/components.module';
import { InitialPageComponent } from './initial-page/initial-page.component';
import { NgbCarousel } from '@ng-bootstrap/ng-bootstrap';
import { AllfotosComponent } from './initial-page/components/allfotos/allfotos.component';
import { ModalsComponent } from './initial-page/components/modals/modals.component';
import { LoginComponent } from './auth/login/login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmarCodigoComponent } from './auth/modal/confirmar-codigo/confirmar-codigo.component';
import { ResetarSenhaComponent } from './auth/resetar-senha/resetar-senha/resetar-senha.component';
import { CadastroComponent } from './auth/cadastro/cadastro/cadastro.component';
import { EnviarEmailResetarSenhaComponent } from './auth/enviar-email-resetar-senha/enviarEmailResetarSenha/enviarEmailResetarSenha.component';
import { FormsModule } from '@angular/forms';
import { UserComponent } from './user/user.component';
import { PedidosComponent } from './user/pedidos/pedidos.component';


@NgModule({
  declarations: [
    InitialPageComponent,
    AllfotosComponent,
    ModalsComponent,
    LoginComponent,
    ConfirmarCodigoComponent,
    ResetarSenhaComponent,
    CadastroComponent,
    EnviarEmailResetarSenhaComponent,
    UserComponent,
    PedidosComponent
    



  ],
  imports: [
    CommonModule,
    ComponentsModule,
    NgbModule,
    NgbCarousel,
    ReactiveFormsModule,
    FormsModule
  ],
  exports:[
   
    AllfotosComponent
  ]
})
export class FeaturesModule { }
