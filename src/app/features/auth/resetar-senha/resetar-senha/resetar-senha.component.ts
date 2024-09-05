import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {IResetarSenha } from 'src/app/core/interfaces/auth';
@Component({
  selector: 'app-resetar-senha',
  templateUrl: './resetar-senha.component.html',
  styleUrls: ['./resetar-senha.component.css']
})
export class ResetarSenhaComponent implements OnInit {

  constructor(private authService: AuthService) { }
  ngOnInit() {
  }

  
  formResetarSenha = new FormGroup({
    codigo: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(5)
    ]),
    senha: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ]),
    confirmarSenha: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ])
  })

resetarSenha(){
  if(this.formResetarSenha.valid){
    const resetarSenha = <IResetarSenha>{
      codigoRecuperacao: this.formResetarSenha.value.codigo,
      novaSenha: this.formResetarSenha.value.senha,
      confirmarSenha: this.formResetarSenha.value.confirmarSenha
    }
    this.authService.resetarSenha(resetarSenha)
    
  }
}
}