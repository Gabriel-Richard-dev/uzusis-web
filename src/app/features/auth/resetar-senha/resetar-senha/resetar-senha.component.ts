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

  
  formEnviarEmail = new FormGroup({
    senha: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ]),
    confirmarSenha: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ])
  })

enviarEmailResetarSenha(){
  if(this.formEnviarEmail.valid){
    const resetarSenha = <IResetarSenha>{
      senha: this.formEnviarEmail.value.senha,
      confirmarSenha: this.formEnviarEmail.value.confirmarSenha
    }
    this.authService.resetarSenha(resetarSenha)
    
  }
}
}
