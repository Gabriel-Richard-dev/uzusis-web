import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IPedidoPendentes, Iproduto } from 'src/app/core/interfaces/IPedidosPendentes';
import { IUsuario } from 'src/app/core/interfaces/IUser';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-historicoInformacao',
  templateUrl: './historicoInformacao.component.html',
  styleUrls: ['./historicoInformacao.component.css']
})
export class HistoricoInformacaoComponent implements OnInit {

  clienteData!: IUsuario
  produtoData!: Iproduto
  constructor(@Inject(MAT_DIALOG_DATA) public data: IPedidoPendentes,private DialogRef: MatDialogRef<HistoricoInformacaoComponent>, private adminService: AdminService) { 
    this.getCliente()
    this.getProduto()
  }

  ngOnInit() {
  
  }

  getCliente(){
    this.adminService.getCliente(this.data.clienteId).subscribe({
      next: res =>{
        this.clienteData = res
       
     
      }

    })
  }

  getProduto(){
    this.adminService.getProduto(this.data.produtoId).subscribe({
      next: res =>{
        this.produtoData = res
      }
    })
    
  }

  fecharModal(){
    this.DialogRef.close()
  }

}
