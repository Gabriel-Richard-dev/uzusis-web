import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ICadastro, IClienteauth, IClienteEmail, ICodigoEmail, IResetarSenha } from 'src/app/core/interfaces/auth';
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
          
          Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'Ok',
            text: `Login realizado com sucesso`,
            showConfirmButton: false,
            timer: 1500,
       
          });
  

          this.router.navigate(['/'])


        },
        error: err =>{
        }
      })
  }

  enviarCodigoConfirmarEmail(email: IClienteEmail
  ){

    this.http.post<any>(`${urlAuth}/enviar-confirmacao-email`, email, { responseType: 'text' as 'json' }).subscribe({
      next: res =>{

          Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'OK',
            text: 'Email enviado com sucesso',
            showConfirmButton: false,
            timer: 1500,
          });
          this.guardarConfirmarEmail = email.email
          this.dialog.open(ConfirmarCodigoComponent)
      
      },
      error: err =>{

   
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Ops..',
          text: `Ja foi enviado um email de validação`,
          showConfirmButton: false,
          timer: 1500,
     
        });

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

    const params = new HttpParams().
    set("email", this.guardarConfirmarEmail).
    set("codigo", codigo)

    const options = {
      params
    }
    
    this.http.get<any>(`${urlAuth}/codigo-valido`,options).subscribe({
      next: res =>{
        this.router.navigate(['/cadastro'])
        this.dialog.closeAll()
        localStorage.setItem("email", this.guardarConfirmarEmail)      
      },
      error: err =>{
        console.log(err.error)
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Ops...',
          text: `código invaido`,
          showConfirmButton: false,
          timer: 1500,
     
        });
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
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Ops...',
          text: `${err.error[0]}`,
          showConfirmButton: false,
          timer: 1500,
     
        });
      }
    })

  }



}
