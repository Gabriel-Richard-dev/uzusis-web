import { Component } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { IClienteauth, IClienteEmail } from "src/app/core/interfaces/auth";
import { AuthService } from "../../auth.service";
import Swal from "sweetalert2";
import { SpinnerService } from "src/app/core/service/spinner.service";
import { Observable, tap } from "rxjs";
@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent {
  spinnerSituacao = true;
  
  constructor(
    private authService: AuthService,
    private spinnerService: SpinnerService
  ) {}


ngOnInit(){
  this.spinnerService.situacaoSpinner$.subscribe({
    next: res =>{
     this.spinnerSituacao = res
     console.log(res)
    }
  })
}


  formLogin = new FormGroup({
    email: new FormControl("", [Validators.email]),
    senha: new FormControl("", [Validators.required]),
  });

  formEnviarEmail = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
  });

  enviarEmail() {
    if (this.formEnviarEmail.valid) {
      this.spinnerSituacao = true
      const enviarEmail = <IClienteEmail>{
        email: this.formEnviarEmail.value.email,
      };
      this.authService.enviarCodigoConfirmarEmail(enviarEmail);
    }

    else{
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Ops..",
        text: `Preencha o campo de email corretamente`,
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  logar() {
    const DadosLogin = <IClienteauth>{
      email: this.formLogin.value.email,
      senha: this.formLogin.value.senha,
    };

    if (this.formLogin.valid) {
      this.authService.logar(DadosLogin);
    } else {
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Oops...",
        text: "Modelo invalido",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  }
}
