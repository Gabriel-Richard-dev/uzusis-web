import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IPedidoPendentes } from 'src/app/core/interfaces/IPedidosPendentes';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-informacao',
  templateUrl: './informacao.component.html',
  styleUrls: ['./informacao.component.css']
})
export class InformacaoComponent implements OnInit {

  clienteData = []
  produtoData = []
  constructor(@Inject(MAT_DIALOG_DATA) public data: IPedidoPendentes,private DialogRef: MatDialogRef<InformacaoComponent>, private adminService: AdminService) { }

  ngOnInit() {
    console.log(this.data)
    this.getCliente()
    this.getProduto()
    console.log(this.clienteData)
    console.log(this.produtoData)
  }

  getCliente(){
    this.adminService.getClente(this.data.clienteId).subscribe({
      next: res =>{
        this.clienteData = res
        console.log(res)
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
