import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth.service';
import { IClienteEmail } from 'src/app/core/interfaces/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-enviarEmailResetarSenha',
  templateUrl: './enviarEmailResetarSenha.component.html',
  styleUrls: ['./enviarEmailResetarSenha.component.css']
})
export class EnviarEmailResetarSenhaComponent implements OnInit {

  constructor(private authService: AuthService) { }

  ngOnInit() {
  }

  formEnviarEmail = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email
    ])
  })


enviarEmailResetarSenha(){
  if(this.formEnviarEmail.valid){
    const enviarEmail = <IClienteEmail>{
      email: this.formEnviarEmail.value.email
    }
    this.authService.enviarEmailResetarSenha(enviarEmail)
    
  }
}

}
