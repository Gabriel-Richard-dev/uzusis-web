import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
import { SidebarComponent } from 'src/app/features/admin/components-admin/sidebar/sidebar.component';
import { HistoricoPedidosComponent } from 'src/app/features/admin/historicos-de-pedidos/historico-pedidos/historico-pedidos.component';
import { PedidosPendentesComponent } from 'src/app/features/admin/pedidos-pendentes/pedidos-pendentes/pedidos-pendentes.component';
import { PegarProdutosComponent } from 'src/app/features/admin/pegarProdutos/pegarProdutos/pegarProdutos.component';
import { LoginAdmComponent } from 'src/app/features/auth/tela-adm-logar/login-adm/login-adm.component';;
import {SidebarModule} from 'primeng/sidebar'
import { ButtonModule } from 'primeng/button';
import { ModalPagamentoComponent } from './navbar/modal-pagamento/modal-pagamento.component';
import { InformacaoComponent } from 'src/app/features/admin/modalInformacoes/informacao/informacao.component';
import { HistoricoInformacaoComponent } from 'src/app/features/admin/modalInformacoes/historicoInformacao/historicoInformacao.component';
import { NotificacaoComponent } from './notificacao/notificacao.component';
import { DashboardComponent } from 'src/app/features/admin/dashboard/dashboard.component';


@NgModule({
  declarations: [
    NavbarComponent,
    PesquisarComponent,
    FooterComponent,
    LoginAdmComponent,
    SidebarComponent,
    CriarProdutoComponent,
    HistoricoPedidosComponent,
    PedidosPendentesComponent,
    PegarProdutosComponent,
    ModalPagamentoComponent,
    InformacaoComponent,
    HistoricoInformacaoComponent,
    NotificacaoComponent,
    DashboardComponent
 

    


   

  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    FormsModule,
    MaterialModule,
    SidebarModule,
    ButtonModule,
    
    
  ],
  exports: [
  NotificacaoComponent,
  NavbarComponent,
  PesquisarComponent,
  FooterComponent,
  SidebarComponent
  
  ], providers: [

  ]
})
export class ComponentsModule { }
