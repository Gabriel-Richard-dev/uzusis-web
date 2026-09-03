import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import {
  IAdicionarProduto,
  IEditarProduto,
} from "src/app/core/interfaces/IAdicionarProduto";
import { IPedidoPendentes } from "src/app/core/interfaces/IPedidosPendentes";
import { IUsuario } from "src/app/core/interfaces/IUser";
import { IClienteauth } from "src/app/core/interfaces/auth";
import { IToken } from "src/app/core/interfaces/token";
import { environment } from "src/environments/environment.development";
import { NotificacaoService } from "src/app/core/service/notificacao.service";

const apiUrlProduto = `${environment.apiUrl}/produto`;
const apiUrlAdm = `${environment.apiUrl}/administradorauth`;
const apiUrlCompra = `${environment.apiUrl}/compra`;
const apiUrlCompraAdm = `${apiUrlCompra}/administrador`;
const apiUrlCLiente = `${environment.apiUrl}/cliente`;

@Injectable({
  providedIn: "root",
})
export class AdminService {

  private get headers() {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem("tokenAdm")}` });
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificacao: NotificacaoService
  ) {}

  autenticar(dadosLogin: IClienteauth) {
    this.http.post<IToken>(`${apiUrlAdm}/login`, dadosLogin).subscribe({
      next: res => {
        localStorage.setItem("tokenAdm", res.token);
        this.toast("success", "Ok", "Login realizado com sucesso");
        this.router.navigate(["admin/dashboard"]);
      },
      error: () => this.toast("error", "Ops...", "Não foi possível entrar"),
    });
  }

  adicionarProduto(produto: IAdicionarProduto): Observable<any> {
    return this.http
      .post(`${apiUrlProduto}/adicionar`, this.montarFormData(produto), { headers: this.headers })
      .pipe(tap({
        next: () => this.toast("success", "OK", `O produto ${produto.Nome} foi adicionado com sucesso`),
        error: () => this.toast("error", "Ops...", "Algo inesperado aconteceu"),
      }));
  }

  editarProduto(produto: IEditarProduto): Observable<any> {
    const formData = this.montarFormData(produto);
    formData.append("id", produto.id.toString());

    return this.http
      .patch(`${apiUrlProduto}/atualizar`, formData, { headers: this.headers })
      .pipe(tap({
        next: () => this.toast("success", "OK", `O produto ${produto.Nome} foi editado com sucesso`),
        error: () => this.toast("error", "Ops...", "Algo inesperado aconteceu"),
      }));
  }

  pedidosPendentes(pedidoQuery: number = 1): Observable<IPedidoPendentes[]> {
    const params = new HttpParams().set("pedidoQuery", pedidoQuery);
    return this.http.get<IPedidoPendentes[]>(`${apiUrlCompraAdm}/dashboard`, {
      headers: this.headers,
      params,
    });
  }

  getCliente(id: number): Observable<IUsuario> {
    const params = new HttpParams().set("id", id);
    return this.http.get<IUsuario>(`${apiUrlCLiente}/admin/obter-cliente`, {
      params,
      headers: this.headers,
    });
  }

  getProduto(produtoId: number): Observable<any> {
    const params = new HttpParams().set("produtoId", produtoId);
    return this.http.get(`${apiUrlProduto}/id`, { params, headers: this.headers });
  }

  enviarProduto(itemCompraId: number): Observable<any> {
    const params = new HttpParams().set("itemCompraId", itemCompraId);
    return this.http
      .patch(`${apiUrlCompraAdm}/dashboard/enviar-produto`, null, { params, headers: this.headers })
      .pipe(tap({
        next: () => this.toast("success", "OK", "Produto enviado com sucesso"),
        error: () => this.toast("error", "Ops...", "Não foi possível enviar o produto"),
      }));
  }

  getProdutosEditar(): Observable<any> {
    return this.http.get(`${apiUrlProduto}/admin/dashboard`, { headers: this.headers });
  }

  getId(produtoId: number): Observable<any> {
    const params = new HttpParams().set("produtoId", produtoId);
    return this.http.get(`${apiUrlProduto}/id`, { params });
  }

  private montarFormData(produto: IAdicionarProduto | IEditarProduto): FormData {
    const formData = new FormData();
    formData.append("Nome", produto.Nome);
    formData.append("Preco", produto.Preco.toString());
    formData.append("QuantidadeP", produto.QuantidadeP.toString());
    formData.append("QuantidadeM", produto.QuantidadeM.toString());
    formData.append("QuantidadeG", produto.QuantidadeG.toString());
    formData.append("Categoria", produto.Categoria.toString());
    formData.append("Descricao", produto.Descricao);
    produto.FotoUrls.forEach((file: File) => formData.append("FotoFiles", file));
    return formData;
  }

  private toast(tipo: "success" | "error", titulo: string, texto: string) {
    if (tipo === "success") {
      this.notificacao.sucesso(titulo, texto);
    } else {
      this.notificacao.erro(titulo, texto);
    }
  }
}
