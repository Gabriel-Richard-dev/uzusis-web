import { Component, OnInit } from '@angular/core';
import { IPedidoPendentes } from 'src/app/core/interfaces/IPedidosPendentes';
import { AdminService } from '../../admin.service';
import { MatDialog } from '@angular/material/dialog';
import { HistoricoInformacaoComponent } from '../../modalInformacoes/historicoInformacao/historicoInformacao.component';

@Component({
  selector: 'app-historico-pedidos',
  templateUrl: './historico-pedidos.component.html',
  styleUrls: ['./historico-pedidos.component.css']
})
export class HistoricoPedidosComponent implements OnInit {

  displayedColumns = ['id', 'valor-item', 'informacoes'];
  dataSource = <IPedidoPendentes[]>[]
  
    constructor(private adminService: AdminService, private Dialog: MatDialog) { }
  
    ngOnInit() {  
      this.adminService.pedidosPendentes(0).subscribe({
        next: res =>{
        this.dataSource = res
        console.log(res)
        }
      })
    }
    abrirHistoricoPedidos(element: IPedidoPendentes){
      this.Dialog.open(HistoricoInformacaoComponent, {
        data: element
      })
      }
}
