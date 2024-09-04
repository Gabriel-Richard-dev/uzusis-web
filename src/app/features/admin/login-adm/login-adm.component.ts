import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IClienteauth } from 'src/app/core/interfaces/auth';
import { AdminService } from '../admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login-adm',
  templateUrl: './login-adm.component.html',
  styleUrls: ['./login-adm.component.css']
})
export class LoginAdmComponent {

  constructor(private adminService: AdminService){

  }
  
  formLogin = new FormGroup({
    email: new FormControl('',[
      Validators.required
    ]),
    senha: new FormControl('',[
      Validators.required,
 
    ])
  })



  


  logar(){
    const DadosLogin = <IClienteauth> {
      email: this.formLogin.value.email,
      senha: this.formLogin.value.senha
    }
    
if(this.formLogin.valid){
    this.adminService.autenticar(DadosLogin)
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
