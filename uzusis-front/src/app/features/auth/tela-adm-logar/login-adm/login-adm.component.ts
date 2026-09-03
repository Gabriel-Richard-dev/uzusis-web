import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IClienteauth } from 'src/app/core/interfaces/auth';
import { AdminService } from 'src/app/features/admin/admin.service';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

@Component({
  selector: 'app-login-adm',
  templateUrl: './login-adm.component.html',
  styleUrls: ['./login-adm.component.css']
})
export class LoginAdmComponent {

  formLogin = new FormGroup({
    email: new FormControl('', [Validators.required]),
    senha: new FormControl('', [Validators.required])
  });

  constructor(private adminService: AdminService, private notificacao: NotificacaoService) { }

  logar() {
    if (!this.formLogin.valid) {
      this.notificacao.erro('Ops...', 'Preencha email e senha corretamente');
      return;
    }

    this.adminService.autenticar(<IClienteauth>{
      email: this.formLogin.value.email,
      senha: this.formLogin.value.senha
    });
  }
}
