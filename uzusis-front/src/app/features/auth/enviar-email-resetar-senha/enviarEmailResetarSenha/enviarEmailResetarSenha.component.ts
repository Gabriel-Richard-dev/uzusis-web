import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-enviarEmailResetarSenha',
  templateUrl: './enviarEmailResetarSenha.component.html',
  styleUrls: ['./enviarEmailResetarSenha.component.css']
})
export class EnviarEmailResetarSenhaComponent {

  formEnviarEmail = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  constructor(private authService: AuthService) { }

  enviarEmailResetarSenha() {
    if (this.formEnviarEmail.valid) {
      this.authService.enviarEmailResetarSenha({ email: this.formEnviarEmail.value.email } as any);
    }
  }
}
