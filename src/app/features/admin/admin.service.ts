import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { Observable } from "rxjs/internal/Observable";
import {
  IAdicionarFoto,
  IAdicionarProduto,
} from "src/app/core/interfaces/IAdicionarProduto";
import {
  IPedidoPendentes,
  Iproduto,
} from "src/app/core/interfaces/IPedidosPendentes";
import { IUsuario } from "src/app/core/interfaces/IUser";
import { IClienteauth } from "src/app/core/interfaces/auth";
import { IgetProduto } from "src/app/core/interfaces/getProdutos";
import { produto } from "src/app/core/interfaces/produto";
import { IToken } from "src/app/core/interfaces/token";
import { environment } from "src/environments/environment.development";
import Swal from "sweetalert2";

const apiUrlProduto = `${environment.apiUrl}/produto`;
const apiUrlAdm = `${environment.apiUrl}/administradorauth`;
const apiUrlCompra = `${environment.apiUrl}/compra`;
const apiUrlCompraAdm = `${apiUrlCompra}/administrador`
const apiUrlCLiente = `${environment.apiUrl}/cliente`;

@Injectable({
  providedIn: "root",
})
export class AdminService {
  headers = new HttpHeaders({
    Authorization: `Bearer ${localStorage.getItem("tokenAdm")}`,
    "ngrok-skip-browser-warning": "69420",
  });

  constructor(private http: HttpClient, private router: Router) {}

  autenticar(auth: IClienteauth) {
    console.log(auth);
    this.http.post<IToken>(`${apiUrlAdm}/login`, auth).subscribe({
      next: (res) => {
        localStorage.setItem("tokenAdm", res.token);

        Swal.fire({
          position: "center",
          icon: "success",
          title: "Ok",
          text: `Login realizado com sucesso`,
          showConfirmButton: false,
          timer: 1500,
        });

        this.router.navigate(["admin/criar-produto"]);
        setTimeout(() => {
          location.reload();
        }, 1000);
      },
      error: (err) => {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Ops...",
          text: `algo aconteceu`,
          showConfirmButton: false,
          timer: 1500,
        });
      },
    });
  }

  adicionarProduto(adicionarProduto: IAdicionarProduto) {
    const formDataAdicionarProduto = new FormData();
    formDataAdicionarProduto.append("Nome", adicionarProduto.Nome);
    formDataAdicionarProduto.append("Preco", adicionarProduto.Preco.toString());
    formDataAdicionarProduto.append(
      "QuantidadeP",
      adicionarProduto.QuantidadeP.toString()
    );
    formDataAdicionarProduto.append(
      "QuantidadeM",
      adicionarProduto.QuantidadeM.toString()
    );
    formDataAdicionarProduto.append(
      "QuantidadeG",
      adicionarProduto.QuantidadeG.toString()
    );
    formDataAdicionarProduto.append(
      "Categoria",
      adicionarProduto.Categoria.toString()
    );
    formDataAdicionarProduto.append("Descricao", adicionarProduto.Descricao);

    console.log(adicionarProduto.FotoUrls);
    adicionarProduto.FotoUrls.forEach((file: File) => {
      formDataAdicionarProduto.append(`FotoFiles`, file);
      console.log(file);
    });

    this.http
      .post(`${apiUrlProduto}/adicionar`, formDataAdicionarProduto)
      .subscribe({
        next: (res) => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "OK",
            text: `O produto ${adicionarProduto.Nome} foi adicionado com sucesso`,
            showConfirmButton: false,
            timer: 1500,
          });
        },
        error: (err) => {
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Ops...",
            text: `Algo inesperado aconteceu`,
            showConfirmButton: false,
            timer: 1500,
          });
        },
      });
  }

  pedidosPendentes(): Observable<IPedidoPendentes[]> {
    const options = {
      headers: this.headers,
    };

    return this.http.get<IPedidoPendentes[]>(
      `${apiUrlCompraAdm}/dashboard`,
      options
    );
  }

  getCliente(id: number): Observable<IUsuario> {
    const params = new HttpParams().set("id", id);
    const options = {
      params,
      headers: this.headers,
    };
    return this.http.get<IUsuario>(
      `${apiUrlCLiente}/admin/obter-cliente`,
      options
    );
  }

  getProduto(id: number): Observable<Iproduto> {
    const params = new HttpParams().set("produtoId", id);
    const options = {
      params,
      headers: this.headers,
    };
    return this.http.get<Iproduto>(`${apiUrlProduto}/id`, options);
  }

  enviarProduto(itemCompraId: number){
    

   
    const params = new HttpParams().set("itemCompraId", itemCompraId)
    const options = {
      params,
      headers: this.headers

    }
    this.http.patch(`${apiUrlCompraAdm}/dashboard/enviar-produto`,null, options).subscribe({
      next: res =>{

        Swal.fire({
          position: "center",
          icon: "success",
          title: "OK",
          text: `Produto enviado com sucesso`,
          showConfirmButton: false,
          timer: 1500,
        });
        location.reload()
      }
    })

  }

  getProdutosEditar(): Observable<any>{
   return this.http.get<IgetProduto>(`${apiUrlProduto}/admin/dashboard`)
  }
}
