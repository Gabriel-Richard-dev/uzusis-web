import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../admin.service';
import { InformacaoComponent } from '../../modalInformacoes/informacao/informacao.component';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

@Component({
  selector: 'app-pedidos-pendentes',
  templateUrl: './pedidos-pendentes.component.html',
  styleUrls: ['./pedidos-pendentes.component.css']
})
export class PedidosPendentesComponent implements OnInit {

  dataSource: any[] = [];

  constructor(
    private adminService: AdminService,
    private Dialog: MatDialog,
    private notificacao: NotificacaoService
  ) { }

  ngOnInit() {
    this.carregarPedidos();
  }

  carregarPedidos() {
    this.adminService.pedidosPendentes(1).subscribe({
      next: (res: any) => this.dataSource = res
    });
  }

  abriModalInformacao(dados: any) {
    this.Dialog.open(InformacaoComponent, { data: dados });
  }

  enviarProduto(id: any) {
    this.notificacao.confirmar({
      titulo: 'Enviar este produto?',
      texto: 'O pedido será marcado como enviado.',
      confirmar: 'Sim, enviar',
      cancelar: 'Cancelar'
    }).then(confirmado => {
      if (confirmado) {
        this.adminService.enviarProduto(id).subscribe({
          next: () => this.carregarPedidos(),
          error: () => {}
        });
      }
    });
  }
}
