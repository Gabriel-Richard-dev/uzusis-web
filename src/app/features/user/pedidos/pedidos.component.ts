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
  produtos: produto[]=[];
  carrinhoId: any;
constructor(
  private navbarService:NavbarService
){

}
  ngOnInit(): void {

  }

  
}
