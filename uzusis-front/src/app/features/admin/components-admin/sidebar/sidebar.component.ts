import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  aberta = false;

  itens = [
    { rota: '/admin/dashboard', rotulo: 'Painel' },
    { rota: '/admin/criar-produto', rotulo: 'Criar produto' },
    { rota: '/admin/pegar-produtos', rotulo: 'Atualizar produtos' },
    { rota: '/admin/pedidos-pendentes', rotulo: 'Pedidos pendentes' },
    { rota: '/admin/historico-pedidos', rotulo: 'Histórico de pedidos' }
  ];

  constructor(private router: Router, private notificacao: NotificacaoService) { }

  logout() {
    this.notificacao.confirmar({
      titulo: 'Deseja mesmo sair?',
      texto: 'Você precisará entrar de novo para acessar o painel.',
      confirmar: 'Sim, sair',
      cancelar: 'Cancelar'
    }).then(confirmado => {
      if (confirmado) {
        localStorage.removeItem('tokenAdm');
        this.router.navigate(['/']);
      }
    });
  }
}
