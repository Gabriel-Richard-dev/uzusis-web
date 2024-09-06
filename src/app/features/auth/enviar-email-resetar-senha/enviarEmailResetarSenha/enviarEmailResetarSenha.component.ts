import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth.service';
import { IClienteEmail } from 'src/app/core/interfaces/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { SpinnerService } from 'src/app/core/service/spinner.service';

@Component({
  selector: 'app-enviarEmailResetarSenha',
  templateUrl: './enviarEmailResetarSenha.component.html',
  styleUrls: ['./enviarEmailResetarSenha.component.css']
})
export class EnviarEmailResetarSenhaComponent implements OnInit {


 semSpinner = true




  constructor(private authService: AuthService,private spinnerService: SpinnerService) { }

  ngOnInit() {
    this.spinnerService.situacaoSpinner$.subscribe({
      next: res =>{
        this.semSpinner = res
      }
    })
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
