import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import {
  ICadastro,
  IClienteauth,
  IClienteEmail,
  ICodigoEmail,
  IResetarSenha,
  IResetarSenhaCodigo,
} from "src/app/core/interfaces/auth";
import { environment } from "src/environments/environment.development";
import { IToken } from "src/app/core/interfaces/token";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmarCodigoComponent } from "./modal/confirmar-codigo/confirmar-codigo.component";
import { Router } from "@angular/router";
import Swal from "sweetalert2";
import { ICEP } from "src/app/core/interfaces/cep";
import { finalize, Observable } from "rxjs";
import { SpinnerService } from "src/app/core/service/spinner.service";

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
    private spinnerService: SpinnerService
  ) {}

  logar(auth: IClienteauth) {
    if (!desativarBotao) {
      desativarBotao = true;

      this.http
        .post<IToken>(`${urlAuth}/login`, auth)
        .pipe(
          finalize(() => {
            desativarBotao = false;
          })
        )
        .subscribe({
          next: (res) => {
            localStorage.setItem("token", res.token);

            Swal.fire({
              position: "center",
              icon: "success",
              title: "Ok",
              text: `Login realizado com sucesso`,
              showConfirmButton: false,
              timer: 1500,
            });
            this.router.navigate(["/"]);
          },
          error: (err) => {
            Swal.fire({
              position: "center",
              icon: "error",
              title: "Ops...",
              text: `${err.error[0]}`,
              showConfirmButton: false,
              timer: 1500,
            });
          },
        });
    }
  }

  enviarCodigoConfirmarEmail(email: IClienteEmail) {

    if (!desativarBotao) {
      desativarBotao = true;

      this.http
        .post<any>(`${urlAuth}/enviar-confirmacao-email`, email, {
          responseType: "text" as "json",
        })
        .pipe(
          finalize(() => {
            this.spinnerService.hideSpinner();
            console.log(this.spinnerService.situacaoSpinner$);
            this.guardarConfirmarEmail = email.email;
            this.dialog.open(ConfirmarCodigoComponent);
            desativarBotao = false;
          })
        )
        .subscribe({
          next: (res) => {
            Swal.fire({
              position: "center",
              icon: "success",
              title: "OK",
              text: "Se esse email não estiver cadastrado, chegará um email nele",
              showConfirmButton: false,
              timer: 1500,
            });
   
          },
          error: (err) => {
            Swal.fire({
              position: "center",
              icon: "success",
              title: "OK",
              text: `Ja foi enviado um email de validação`,
              showConfirmButton: false,
              timer: 1500,
            });
          },
        });
    }
  }

  enviarEmailResetarSenha(email: IClienteEmail) {
    this.http
      .post<any>(`${urlAuth}/enviar-recuperacao-senha`, email, {
        responseType: "text" as "json",
      })
      .subscribe({
        next: (res) => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "OK",
            text: "Email enviado com sucesso",
            showConfirmButton: false,
            timer: 1500,
          });
          this.router.navigate(["/resetar-senha"]);
          this.guardarResetarSenhaEmail = email.email;
          localStorage.setItem("emailGuardar", this.guardarResetarSenhaEmail);
          console.log(this.guardarResetarSenhaEmail);
        },
        error: (err) => {
          const error = err.error
            .replace('"', "")
            .replace("[", "")
            .replace("]", "")
            .replace('"', "");

          Swal.fire({
            position: "center",
            icon: "error",
            title: "Ops...",
            text: `${error}`,
            showConfirmButton: false,
            timer: 1500,
          });

          this.guardarResetarSenhaEmail = email.email;
          localStorage.setItem("emailGuardar", this.guardarResetarSenhaEmail);
        },
      });
  }

  resetarSenha(formResetarSenha: IResetarSenha) {
    const formResetarSenhaCodigo = <IResetarSenhaCodigo>{
      codigoRecuperacao: formResetarSenha.codigoRecuperacao,
      novaSenha: formResetarSenha.novaSenha,
      confirmarSenha: formResetarSenha.confirmarSenha,
      email: localStorage.getItem("emailGuardar"),
    };

    this.http
      .post(`${urlAuth}/recuperar-senha`, formResetarSenhaCodigo)
      .subscribe({
        next: (res) => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "OK",
            text: "Senha resetada com sucesso",
            showConfirmButton: false,
            timer: 1500,
          });
          localStorage.removeItem("emailGuardar");
          this.router.navigate(['login'])
        },
        error: (err) => {
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Ops..",
            text: "Ocorreu um erro na mudança de senha",
            showConfirmButton: false,
            timer: 1500,
          });
        },
      });
  }

  enviarCodigoEmailCadastro(codigo: string) {
    const confirmarCodigoEmail = <ICodigoEmail>{
      codigo,
      email: this.guardarConfirmarEmail,
    };

    this.http
      .post<any>(`${urlAuth}/codigo-valido`, confirmarCodigoEmail)
      .subscribe({
        next: (res) => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "OK",
            text: `Código Verificado `,
            showConfirmButton: false,
            timer: 1000,
          });
          this.router.navigate(["/cadastro"]);
          this.dialog.closeAll();
          localStorage.setItem("email", this.guardarConfirmarEmail);
        },
        error: (err) => {
          console.log(err.error);
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Ops...",
            text: `código invaiido`,
            showConfirmButton: false,
            timer: 1500,
          });
        },
      });
  }

  enviarCep(cep: string): Observable<any> {
    return this.http.get<ICEP>(`https://viacep.com.br/ws/${cep}/json/`);
  }

  cadastrar(cadastro: ICadastro) {
    this.http.post(`${urlAuth}/cadastrar`, cadastro).subscribe({
      next: (res) => {
        Swal.fire({
          position: "center",
          icon: "success",
          title: "OK",
          text: "Usuario cadastrado com sucesso, logue-se para acessar o sistema",
          showConfirmButton: false,
          timer: 1500,
        });
        localStorage.removeItem("email");
        this.router.navigate(["login"]);
      },
      error: (err) => {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Ops...",
          text: `${err.error[0]}`,
          showConfirmButton: false,
          timer: 1500,
        });
      },
    });
  }

  getConfirmarEmail() {
    return this.guardarConfirmarEmail;
  }

  getResetarSenhaEmail() {
    return this.guardarResetarSenhaEmail;
  }
}
