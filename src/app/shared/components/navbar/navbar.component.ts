import { Dialog } from '@angular/cdk/dialog';
import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Route, Router } from '@angular/router';
import { Pedido, produto } from 'src/app/core/interfaces/produto';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';
import Swal from 'sweetalert2';
import { ModalPagamentoComponent } from './modal-pagamento/modal-pagamento.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @ViewChild('dropdownImage') dropdownImage!: ElementRef;
 
  categoria:string | null='';
  produtos:produto[]=[]
  dataSource:any;
  categorias:string[]=['calças', 'shorts', 'saias', 'cropped', 'conjuntos']
  dropdownOpen: boolean = false;
  selectedFilter: string = '';
  Options: string[] = ["blusão", "body","blusas","acessórios"]
  pedidos:Pedido[]=[]
  idPedido:number[]=[]
  quantidadeProduto: { [key: number]: number } = {};
  carrinhoId: { [key: number]: number } = {};
  valor:number[]=[];
  valorTotal:number=0;
  constructor(
    private navbarService:NavbarService,
    private router:Router,
    private dialog:MatDialog
  ){}
  sidebarVisible: boolean = false;
  handleClick(index:any){

    index === '' ? setTimeout(() => {
      location.reload()
      
    }, 1): this.navbarService.setCategoria(index);
    }
  

adicionarCarrinho(){
  this.valorTotal=0
  const token = localStorage.getItem('token')
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: "btn btn-success",
      cancelButton: "btn btn-danger"
    },
    buttonsStyling: false
  });
  if(!token){
    swalWithBootstrapButtons.fire({
      title: "Você não está logado!",
      text: "Deseja se cadastrar para adicionar ao carrinho?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim",
      cancelButtonText: "Não",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
         this.router.navigate(['login'])
      } 
    });
    }
    else{
      this.navbarService.atualizarCarrinho().subscribe({
        next: (pedidos) => {
          let lista=0
          this.sidebarVisible = true;
          this.pedidos = pedidos;
          this.idPedido = pedidos.map(pedido => pedido.produtoId);
          lista=this.idPedido.length
          this.produtos=[]
          this.valor=pedidos.map(preco=>preco.valorPedido)
          for(var i=0;i<this.valor.length;i++){
            this.valorTotal=this.valor[i]+this.valorTotal
          }
          for(var i=0;lista>i;i++){
            
            this.quantidadeProduto[this.idPedido[i]] = this.pedidos[i].quantidade;
            
            this.carrinhoId[this.idPedido[i]] = this.pedidos[i].id;
            this.navbarService.getProdutoId(this.idPedido[i]).subscribe(res=>{        
            if (Array.isArray(res)) {
              this.produtos = [...this.produtos, ...res];
              
            } else {
           
              this.produtos = [...this.produtos,res];   
            }
           
          
          })
        
        }
        },
        error: (err) => {
          swalWithBootstrapButtons.fire({
            title: "Você não está logado!",
            text: "Deseja se cadastrar para adicionar ao carrinho?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim",
            cancelButtonText: "Não",
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
               this.router.navigate(['login']);
            }
          });
          this.sidebarVisible = false;
        }
      });
      

}
}
apagarCarrinho(id:number){
this.navbarService.retirarCarrinho(id).subscribe(res=>{

 location.reload()

})
}
comprar(element: produto[]) {

  const produtosComQuantidades = element.map(produto => {
 
    const quantidade = this.quantidadeProduto[produto.id] || 0;

    return {
      ...produto,
      quantidadePedida: quantidade
    };
  });

  this.sidebarVisible = false;
  const dialogRef = this.dialog.open(ModalPagamentoComponent, {
    width: '100vw',
    height: '100%',
    data: produtosComQuantidades, 
  });
}

}
  





