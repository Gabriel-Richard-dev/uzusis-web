import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { IResetarSenha } from 'src/app/core/interfaces/auth';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

export function senhasIguais(controle: AbstractControl): ValidationErrors | null {
  const senha = controle.get('senha')?.value;
  const confirmar = controle.get('confirmarSenha')?.value;
  return senha && confirmar && senha !== confirmar ? { senhasDiferentes: true } : null;
}

@Component({
  selector: 'app-resetar-senha',
  templateUrl: './resetar-senha.component.html',
  styleUrls: ['./resetar-senha.component.css']
})
export class ResetarSenhaComponent {

  email = localStorage.getItem('emailGuardar') || '';

  formResetarSenha = new FormGroup({
    codigo: new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(5)]),
    senha: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmarSenha: new FormControl('', [Validators.required, Validators.minLength(6)])
  }, { validators: senhasIguais });

  constructor(private authService: AuthService, private notificacao: NotificacaoService) { }

  resetarSenha() {
    if (this.formResetarSenha.invalid) {
      this.formResetarSenha.markAllAsTouched();
      this.notificacao.erro(
        'Ops...',
        this.formResetarSenha.hasError('senhasDiferentes')
          ? 'As senhas não são iguais'
          : 'Preencha todos os campos corretamente'
      );
      return;
    }

    this.authService.resetarSenha(<IResetarSenha>{
      codigoRecuperacao: this.formResetarSenha.value.codigo,
      novaSenha: this.formResetarSenha.value.senha,
      confirmarSenha: this.formResetarSenha.value.confirmarSenha
    });
  }
}
