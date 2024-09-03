import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NavbarComponent } from './navbar/navbar.component';
import { MaterialModule } from '../material.module';
import { PesquisarComponent } from './pesquisar/pesquisar.component';
import { FooterComponent } from './footer/footer.component';
import { CriarProdutoComponent } from 'src/app/features/admin/criar-produto/criarProduto/criarProduto.component';
import { LoginAdmComponent } from 'src/app/features/admin/tela-adm-logar/login-adm/login-adm.component';




@NgModule({
  declarations: [
    NavbarComponent,
    PesquisarComponent,
    FooterComponent,
    CriarProdutoComponent,
    LoginAdmComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    FormsModule,
    MaterialModule,
    
  ],
  exports: [
  NavbarComponent,
  PesquisarComponent,
  FooterComponent
  
  ], providers: [

  ]
})
export class ComponentsModule { }
