import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IPedidoPendentes, Iproduto } from 'src/app/core/interfaces/IPedidosPendentes';
import { AdminService } from '../../admin.service';
import { IUsuario } from 'src/app/core/interfaces/IUser';
import { produto } from 'src/app/core/interfaces/produto';

@Component({
  selector: 'app-informacao',
  templateUrl: './informacao.component.html',
  styleUrls: ['./informacao.component.css']
})
export class InformacaoComponent implements OnInit {

  clienteData!: IUsuario
  produtoData!: Iproduto
  constructor(@Inject(MAT_DIALOG_DATA) public data: IPedidoPendentes,private DialogRef: MatDialogRef<InformacaoComponent>, private adminService: AdminService) { 
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
