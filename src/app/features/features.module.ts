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
import { ConfirmarSenhaComponent } from './auth/modal/confirmar-senha/confirmar-senha.component';





@NgModule({
  declarations: [
    InitialPageComponent,
    AllfotosComponent,
    ModalsComponent,
    LoginComponent,
    ConfirmarSenhaComponent,


  ],
  imports: [
    CommonModule,
    ComponentsModule,
    NgbModule,
    NgbCarousel,
    ReactiveFormsModule
  ],
  exports:[
   
    AllfotosComponent
  ]
})
export class FeaturesModule { }
