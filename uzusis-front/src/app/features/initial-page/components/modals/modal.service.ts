import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { getLocalStorage } from 'src/app/core/adapters/cache';
import { Carrinho } from 'src/app/core/interfaces/produto';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  constructor(private http: HttpClient) { 

  }
  private readonly token = localStorage.getItem('token')
  
  apiurl = environment.apiUrl;
  adicionarCarrinho(id:number, tamanho:string | null, quantidade:number){
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.token}` 
    });
      const body={
        produtoId:id,
        sigla:tamanho,
        quantidade:quantidade
      }
      return this.http.post<Carrinho>(`${this.apiurl}/carrinho/adicionar-ao-carrinho`,body,{headers})

  }
  }

