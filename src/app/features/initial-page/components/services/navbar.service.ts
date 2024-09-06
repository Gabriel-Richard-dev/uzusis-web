import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { produto } from 'src/app/core/interfaces/produto'; // Ajuste conforme necessário
import { environment } from 'src/environments/environment.development';
import { Pedido } from 'src/app/core/interfaces/produto';
import { MatOptionSelectionChange } from '@angular/material/core';


@Injectable({
  providedIn: 'root'
})

export class NavbarService {
  private produtosSubject = new BehaviorSubject<produto[]>([]);
  produtosnew = this.produtosSubject.asObservable();
  private readonly token = localStorage.getItem('token')


  constructor(private http: HttpClient) {
   }
  
  apiurl = environment.apiUrl;
setCategoria(index:any){
  if(index==''){
    this.lista(0,'').subscribe({
      next:produtos=>{      
        this.updateProdutos(produtos)
      }
    
    })
  }
  else{
  this.lista(0,index).subscribe({
    next:produtos=>{
      
      this.updateProdutos(produtos)
    }
  
  })
}
}

  lista(pag: number,id:any): Observable<produto[]> {

    return this.http.get<{ produtos: produto[] }>(`${this.apiurl}/produto/${pag}?categoriaProduto=${id}`)
      .pipe(map(response => response.produtos));
      
    }
    //google-chrome --disable-web-security --user-data-dir="/tmp/"
    pesquisarProdutos(nome: string): Observable<produto[]> {
      if(nome.length>0){
        return this.http.get<produto[]>(`${this.apiurl}/produto/nome?nome=${nome}`)
      }
      else{
        return this.http.get<{ produtos: produto[] }>(`${this.apiurl}/produto/1?categoriaProduto=`)
      .pipe(map(response => response.produtos));
      }
    
    }

 

  getQuantidadePaginas(): Observable<number> {
    return this.http.get<{ quantidadePaginas: number }>(`${this.apiurl}/produto/0`)
      .pipe(map(response => response.quantidadePaginas));
  }

  updateProdutos(produtos: produto[]): void {
    this.produtosSubject.next(produtos);
  }

  
  atualizarCarrinho(): Observable<Pedido[]>{
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}` 
    });
    return this.http.get<Pedido[]>(`${this.apiurl}/carrinho/pedidos`,{headers})
  }
  getProdutoId(id:number){
    return this.http.get<produto[]>(`${this.apiurl}/produto/id?produtoId=${id}`)
  }
    retirarCarrinho(id:number): Observable<number>{
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${this.token}` 
      });
      return this.http.delete<number>(`${this.apiurl}/carrinho/remover-carrinho?pedidoId=${id}`,{headers})

    }
  
   comprar(){
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}` 
    });
    console.log(this.token)
    return this.http.post<any>(`${this.apiurl}/compra/cliente/carrinho`,null,{headers})
   }



}


