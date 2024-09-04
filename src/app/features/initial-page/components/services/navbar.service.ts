import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { produto } from 'src/app/core/interfaces/produto'; // Ajuste conforme necessário
import { environment } from 'src/environments/environment.development';

const api = 'https://8c31-200-17-32-208.ngrok-free.app/';
const key = '';

@Injectable({
  providedIn: 'root'
})
export class NavbarService {
  private produtosSubject = new BehaviorSubject<produto[]>([]);
  produtosnew = this.produtosSubject.asObservable();
  private categoriaSubject = new BehaviorSubject<string | null>(null);
  categorias=this.categoriaSubject.asObservable()


  constructor(private http: HttpClient) { }
  setCategoria(Categoria:string){
    this.categoriaSubject.next(Categoria)
  }
    getCategoria(): Observable<string | null>{
      return this.categorias
    }
  apiurl = `${api}`;
  key = `${key}`;

  lista(pag: number,id:any): Observable<produto[]> {
    return this.http.get<{ produtos: produto[] }>(`${api}produto/${pag}?categoriaProduto=${id}`)
      .pipe(map(response => response.produtos));
  }
  //google-chrome --disable-web-security --user-data-dir="/tmp/"

 

  getQuantidadePaginas(): Observable<number> {
    return this.http.get<{ quantidadePaginas: number }>(`${api}produto/1`)
      .pipe(map(response => response.quantidadePaginas));
  }

  updateProdutos(produtos: produto[]): void {
    this.produtosSubject.next(produtos);
  }
}


