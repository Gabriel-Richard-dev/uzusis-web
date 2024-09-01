import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IClienteauth, IClienteEmail, IResetarSenha } from 'src/app/core/interfaces/auth';
import { environment } from 'src/environments/environment.development';
import { IToken } from 'src/app/core/interfaces/token';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmarSenhaComponent } from './modal/confirmar-senha/confirmar-senha.component';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ResetarSenhaComponent } from './resetar-senha/resetar-senha/resetar-senha.component';


//MUDAR URL DEPOIS
const urlAuth = `${environment.apiUrl}/clienteauth`

// NESSA FAIXA

@Injectable({
  providedIn: 'root'
})
export class AuthService {


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

  enviarCodigoConfirmarEmail(email: IClienteEmail){
    this.dialog.open(ConfirmarSenhaComponent)
    this.http.post<any>(`${urlAuth}/enviar-confirmacao-email`, email).subscribe({
      next: res =>{
        if(res.status === 200){
          this.dialog.open(ConfirmarSenhaComponent)
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
    
    this.router.navigate(['/cadastro'])
    this.dialog.closeAll()
    //APAGAR DEPOIS
    
    
    
    this.http.post<any>(`${urlAuth}/codigo-valido`,codigo).subscribe({
      next: res =>{
        this.router.navigate(['/cadastro'])
        this.dialog.closeAll()
       
      },
      error: err =>{
        localStorage.removeItem("email")
      }
    })
  }

  

}
