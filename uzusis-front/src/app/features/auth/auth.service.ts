import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  ICadastro,
  IClienteauth,
  IClienteEmail,
  IResetarSenha,
} from "src/app/core/interfaces/auth";
import { environment } from "src/environments/environment.development";
import { IToken } from "src/app/core/interfaces/token";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmarCodigoComponent } from "./modal/confirmar-codigo/confirmar-codigo.component";
import { Router } from "@angular/router";
import { ICEP } from "src/app/core/interfaces/cep";
import { finalize, Observable } from "rxjs";
import { RouteService } from "src/app/core/service/route.service";
import { NotificacaoService } from "src/app/core/service/notificacao.service";

const urlAuth = `${environment.apiUrl}/clienteauth`;
let desativarBotao: boolean = false;

@Injectable({
  providedIn: "root",
})
export class AuthService {
  guardarConfirmarEmail: string = "";
  guardarResetarSenhaEmail: string = "";

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router,
    private notificacao: NotificacaoService,
    private routerService: RouteService
  ) {}

  logar(auth: IClienteauth) {
    if (desativarBotao) return;
    desativarBotao = true;

    this.http
      .post<IToken>(`${urlAuth}/login`, auth)
      .pipe(finalize(() => { desativarBotao = false; }))
      .subscribe({
        next: res => {
          localStorage.setItem("token", res.token);
          this.notificacao.sucesso("Login realizado com sucesso");
          this.router.navigate(["/"]);
        },
        error: err => this.notificacao.erro("Ops...", err.error?.[0]),
      });
  }

  enviarCodigoConfirmarEmail(email: IClienteEmail, abrirModal: boolean = true) {
    if (desativarBotao) return;
    desativarBotao = true;

    this.http
      .post<any>(`${urlAuth}/enviar-confirmacao-email`, email, {
        responseType: "text" as "json",
      })
      .pipe(
        finalize(() => {
          this.guardarConfirmarEmail = email.email;
          localStorage.setItem("guardarEmail", this.guardarConfirmarEmail);
          if (abrirModal) {
            this.dialog.open(ConfirmarCodigoComponent);
          }
          desativarBotao = false;
        })
      )
      .subscribe({
        next: () => this.notificacao.sucesso(
          "Código enviado",
          "Se esse email estiver cadastrado, chegará um email nele"
        ),
        error: () => this.notificacao.aviso("Já enviamos um email de validação"),
      });
  }

  enviarEmailResetarSenha(email: IClienteEmail) {
    this.http
      .post<any>(`${urlAuth}/enviar-recuperacao-senha`, email, {
        responseType: "text" as "json",
      })
      .subscribe({
        next: res => {
          if (res?.foiEnviado === true) {
            this.notificacao.aviso("Já enviamos um código para esse email");
          } else {
            this.notificacao.sucesso("Código enviado", "Confira a caixa de entrada do seu email");
          }
          this.guardarResetarSenhaEmail = email.email;
          localStorage.setItem("emailGuardar", this.guardarResetarSenhaEmail);
          this.router.navigate(["resetar-senha"]);
        },
        error: () => this.notificacao.erro("Ops...", "Algo inesperado aconteceu"),
      });
  }

  resetarSenha(resetar: IResetarSenha) {
    const corpo = {
      codigoRecuperacao: resetar.codigoRecuperacao,
      novaSenha: resetar.novaSenha,
      confirmarSenha: resetar.confirmarSenha,
      email: localStorage.getItem("emailGuardar"),
    };

    this.http.post<any>(`${urlAuth}/recuperar-senha`, corpo).subscribe({
      next: () => {
        this.notificacao.sucesso("Senha alterada com sucesso");
        localStorage.removeItem("emailGuardar");
        this.router.navigate(["login"]);
      },
      error: () => this.notificacao.erro("Ops...", "Ocorreu um erro na mudança de senha"),
    });
  }

  enviarCodigoEmailCadastro(codigo: string) {
    this.http
      .post<any>(`${urlAuth}/codigo-valido`, { codigo, email: this.guardarConfirmarEmail })
      .subscribe({
        next: () => {
          this.notificacao.sucesso("Código verificado");
          this.router.navigate(["/cadastro"]);
          this.dialog.closeAll();
          localStorage.setItem("email", this.guardarConfirmarEmail);
        },
        error: () => this.notificacao.erro("Ops...", "Código inválido"),
      });
  }

  enviarCep(cep: string): Observable<ICEP> {
    return this.http.get<ICEP>(`https://viacep.com.br/ws/${cep}/json/`);
  }

  cadastrar(cadastro: ICadastro) {
    this.http.post<any>(`${urlAuth}/cadastrar`, cadastro).subscribe({
      next: () => {
        this.notificacao.sucesso("Cadastro concluído", "Faça login para acessar o sistema");
        localStorage.removeItem("email");
        this.router.navigate(["login"]);
      },
      error: err => this.notificacao.erro("Ops...", err.error?.[0]),
    });
  }

  getConfirmarEmail() {
    return this.guardarConfirmarEmail;
  }

  getResetarSenhaEmail() {
    return this.guardarResetarSenhaEmail;
  }
}
