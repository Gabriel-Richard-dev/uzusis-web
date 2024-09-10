import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { pipe } from 'rxjs';
import { IPedidoPendentes } from 'src/app/core/interfaces/IPedidosPendentes';
import { MatDialog } from '@angular/material/dialog';
import { InformacaoComponent } from '../../modalInformacoes/informacao/informacao.component';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-pedidos-pendentes',
  templateUrl: './pedidos-pendentes.component.html',
  styleUrls: ['./pedidos-pendentes.component.css']
})
export class PedidosPendentesComponent implements OnInit {
data: IPedidoPendentes[] = [];
displayedColumns = ['id', 'valor-item', 'informacoes', 'enviar'];
dataSource = <IPedidoPendentes[]>[]

  constructor(private adminService: AdminService, private Dialog: MatDialog) { }

  ngOnInit() {  
    this.adminService.pedidosPendentes().subscribe({
      next: res =>{
      this.dataSource = res
      this.data = res
      console.log(res)
      }
    })
this.data.forEach(element =>{
  console.log(element)
})
   
  

  }

  abriModalInformacao(element: IPedidoPendentes){
  this.Dialog.open(InformacaoComponent, {
    data: element
  })
  }

enviarProduto(idPedido: number){
  Swal.fire({
    title: 'Tem certeza que deseja enviar esse produto??',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#2f9e41',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, enviar!',
    cancelButtonText: 'Não, cancelar',
  }).then(result => {
    if (result.isConfirmed) {
      this.adminService.enviarProduto(idPedido)
    }
  });

}

}
