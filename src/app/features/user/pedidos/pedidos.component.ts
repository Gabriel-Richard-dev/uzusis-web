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
    this.navbarService.atualizarCarrinho().subscribe({
      next: (pedidos) => {
        let lista=0
        this.pedidos = pedidos;
        this.idPedido = pedidos.map(pedido => pedido.produtoId);
        lista=this.idPedido.length
        this.produtos=[]
  
        for(var i=0;lista>i;i++){
          
          this.carrinhoId[this.idPedido[i]] = this.pedidos[i].id;
          this.navbarService.getProdutoId(this.idPedido[i]).subscribe(res=>{        
          if (Array.isArray(res)) {
            this.produtos = [...this.produtos, ...res];
            
          } else {
            this.produtos = [...this.produtos,res];   
          }

        
        })
      
      }
  }
    })
  }

  
}
