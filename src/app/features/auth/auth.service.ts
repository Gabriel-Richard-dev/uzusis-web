import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ICadastro, IClienteauth, IClienteEmail, IResetarSenha } from 'src/app/core/interfaces/auth';
import { environment } from 'src/environments/environment.development';
import { IToken } from 'src/app/core/interfaces/token';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmarCodigoComponent } from './modal/confirmar-codigo/confirmar-codigo.component';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ICEP } from 'src/app/core/interfaces/cep';
import { Observable } from 'rxjs';


//MUDAR URL DEPOIS
const urlAuth = `${environment.apiUrl}/clienteauth`

 

// NESSA FAIXA

@Injectable({
  providedIn: 'root'
})
export class AuthService {

guardarConfirmarEmail: any = ""
constructor(private http: HttpClient, private dialog: MatDialog, private router: Router ) { }

  logar(auth: IClienteauth){
      this.http.post<IToken>(`${urlAuth}/login`, auth).subscribe({
        next: res =>{
          localStorage.setItem("token", res.token)
        },
        error: err =>{
          console.error(err.status)
        }
      })
  }

  enviarCodigoConfirmarEmail(email: IClienteEmail
  ){
//APAGAR DEPOIS:
this.dialog.open(ConfirmarCodigoComponent)
this.guardarConfirmarEmail = email.email

    this.http.post<any>(`${urlAuth}/enviar-confirmacao-email`, email).subscribe({
      next: res =>{
        if(res.status === 200){
          this.guardarConfirmarEmail = email.toString()
          this.dialog.open(ConfirmarCodigoComponent)

         
        }
      },
      error: err =>{
        if(err.status === 200){
          Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'OK',
            text: 'Email enviado com sucesso',
            showConfirmButton: false,
            timer: 1500,
          });
  
         
        }
        if(err.status === 400){
          alert(err)

        }

      }
    })
  }

  enviarEmailResetarSenha(email: IClienteEmail){
    this.http.post<any>(`${urlAuth}/enviar-email-resetar-senha`, email).subscribe({
      next: res =>{
        if(res.status === 200){
        
          Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'OK',
            text: 'Email enviado com sucesso',
            showConfirmButton: false,
            timer: 1500,
       
          });
          this.router.navigate([""])
  


        }
      },
      error: err =>{

      }
    })
  }

  resetarSenha(Senhas: IResetarSenha){
    this.http.post(`${urlAuth}/resetar-senha`, Senhas).subscribe({
      next: res =>{
        Swal.fire({
          position: 'center',
          icon: 'success',
          title: 'OK',
          text: 'Senha resetada com sucesso',
          showConfirmButton: false,
          timer: 1500,
     
        });
      },
      error: err =>{
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Ops..',
          text: 'Ocorreu um erro na mudança de senha',
          showConfirmButton: false,
          timer: 1500,
     
        });
      }
    })

  }



  enviarCodigoEmailCadastro(codigo: string){
    localStorage.setItem("email", this.guardarConfirmarEmail)      
    this.router.navigate(['/cadastro'])
    this.dialog.closeAll()
    //APAGAR DEPOIS
    
    
    
    this.http.post<any>(`${urlAuth}/codigo-valido`,codigo).subscribe({
      next: res =>{
        this.router.navigate(['/cadastro'])
        this.dialog.closeAll()
        localStorage.setItem("email", this.guardarConfirmarEmail)      
      },
      error: err =>{
       
      }
    })
  }

  
  enviarCep(cep: string): Observable<any>{
  return  this.http.get<ICEP>(`https://viacep.com.br/ws/${cep}/json/`)
  }


  cadastrar(cadastro: ICadastro){
    this.http.post(`${urlAuth}/cadastrar`, cadastro).subscribe({
      next: res =>{
        Swal.fire({
          position: 'center',
          icon: 'success',
          title: 'OK',
          text: 'Usuario cadastrado com sucesso, logue-se para acessar o sistema',
          showConfirmButton: false,
          timer: 1500,
     
        });
        this.router.navigate(["login"])
      },
      error: err =>{

  // fazer validações para caso eu esteja mandando um dado que o back nao aceita

        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Ops...',
          text: 'Não foi possivel fazer o seu cadastro tente novamente',
          showConfirmButton: false,
          timer: 1500,
     
        });
      }
    })

  }



}
