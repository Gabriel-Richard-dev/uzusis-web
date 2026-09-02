import { Component, OnInit } from '@angular/core';
import { NavbarService } from '../../initial-page/components/services/navbar.service';
import { Pedido, produto } from 'src/app/core/interfaces/produto';

@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.scss']
})

export class PedidosComponent implements OnInit{
pedidos:Pedido[]=[]
idPedido:number[]=[]
 minhaConta: Boolean = true
 meusPedidos: boolean = false
 Historico: boolean = false
  produtos: produto[]=[];
  carrinhoId: any;



constructor(
  private navbarService:NavbarService
){
  
}
  ngOnInit(): void {

  }

setarMinhaConta(){
  this.minhaConta = true
  this.Historico = false
  this.meusPedidos = false
  console.log(this.minhaConta)
}

setarPedidos(){
  this.minhaConta = false
  this.Historico = false
  this.meusPedidos = true
  console.log(this.minhaConta)
}


setarHistorico(){
  this.minhaConta = false
  this.Historico = true
  this.meusPedidos = false
  console.log(this.minhaConta)
}



  
}
