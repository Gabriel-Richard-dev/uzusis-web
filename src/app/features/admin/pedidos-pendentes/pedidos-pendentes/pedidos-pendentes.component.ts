import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { pipe } from 'rxjs';
import { IPedidoPendentes } from 'src/app/core/interfaces/IPedidosPendentes';
import { MatDialog } from '@angular/material/dialog';
import { InformacaoComponent } from '../../modalInformacoes/informacao/informacao.component';


@Component({
  selector: 'app-pedidos-pendentes',
  templateUrl: './pedidos-pendentes.component.html',
  styleUrls: ['./pedidos-pendentes.component.css']
})
export class PedidosPendentesComponent implements OnInit {

displayedColumns = ['id', 'valor-item', 'tamanho', 'informacoes'];
dataSource = <IPedidoPendentes[]>[]

  constructor(private adminService: AdminService, private Dialog: MatDialog) { }

  ngOnInit() {  
    this.adminService.pedidosPendentes().subscribe({
      next: res =>{
      this.dataSource = res
      console.log(res)
      }
    })

  

  }

  abriModalInformacao(element: IPedidoPendentes){
  this.Dialog.open(InformacaoComponent, {
    data: element
  })
  }

}
