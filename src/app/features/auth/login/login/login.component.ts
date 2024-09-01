import { Component } from '@angular/core';
import { FormGroup,FormControl, Validators} from '@angular/forms';
import  {IClienteauth, IClienteEmail } from 'src/app/core/interfaces/auth';
import { AuthService } from '../../auth.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
 

export class LoginComponent {
  constructor(private authService: AuthService){

  }
  
  formLogin = new FormGroup({
    email: new FormControl('',[
      Validators.email
    ]),
    senha: new FormControl('',[
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(
        '^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&áãâàäåæçéèêëíìîïóòôõöøúùûü])[A-Za-z\\d@$!%*?&áãâàäåæçéèêëíìîïóòôõöøúùûü]{8,}$'
      ),
    ])
  })

  formEnviarEmail = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email
    ])
  })

  enviarEmail(){
    if(this.formEnviarEmail.valid){
      const enviarEmail = <IClienteEmail>{
        email: this.formEnviarEmail.value.email
      }
      this.authService.enviarCodigoConfirmarEmail(enviarEmail)
    }

  }


  logar(){
    const DadosLogin = <IClienteauth> {
      email: this.formLogin.value.email,
      senha: this.formLogin.value.senha
    }
    
if(this.formLogin.valid){
    this.authService.logar(DadosLogin)
  }
  else{
    Swal.fire({
      position: 'center',
      icon: 'error',
      title: 'Oops...',
      text: 'Modelo invalido',
      showConfirmButton: false,
      timer: 3000,
    });
    
  }
  }

}
