import { Component } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { IClienteauth, IClienteEmail } from "src/app/core/interfaces/auth";
import { AuthService } from "../../auth.service";
import { NotificacaoService } from "src/app/core/service/notificacao.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent {

  formLogin = new FormGroup({
    email: new FormControl("", [Validators.email]),
    senha: new FormControl("", [Validators.required]),
  });

  formEnviarEmail = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
  });

  constructor(
    private authService: AuthService,
    private notificacao: NotificacaoService
  ) {}

  enviarEmail() {
    if (!this.formEnviarEmail.valid) {
      this.notificacao.erro("Ops...", "Preencha o campo de email corretamente");
      return;
    }
    this.authService.enviarCodigoConfirmarEmail(<IClienteEmail>{
      email: this.formEnviarEmail.value.email,
    });
  }

  logar() {
    if (!this.formLogin.valid) {
      this.notificacao.erro("Ops...", "Preencha email e senha corretamente");
      return;
    }
    this.authService.logar(<IClienteauth>{
      email: this.formLogin.value.email,
      senha: this.formLogin.value.senha,
    });
  }
}
