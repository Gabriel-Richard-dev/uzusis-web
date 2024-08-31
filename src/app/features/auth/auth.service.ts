import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IClienteauth, IClienteEmail } from 'src/app/core/interfaces/auth';
import { environment } from 'src/environments/environment.development';
import { IToken } from 'src/app/core/interfaces/token';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmarSenhaComponent } from './modal/confirmar-senha/confirmar-senha.component';
import { Router } from '@angular/router';

const urlAuth = `${environment.apiUrl}/clienteauth`
const urlAuthEmail = `${environment.apiUrl}/clienteauth/confimarEmail`

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

  enviarEmail(email: IClienteEmail){
    this.dialog.open(ConfirmarSenhaComponent)
    this.http.post<any>(`${urlAuth}/enviar-confirmacao-email`, email).subscribe({
      next: res =>{
        if(res.status === 200){
          this.dialog.open(ConfirmarSenhaComponent)
          const enviarEmail = email.toString()
          localStorage.setItem("email", enviarEmail)

        }
      },
      error: err =>{
        if(err.status === 200){
          console.log("eu abri o erro?")
  
         
        }
        if(err.status === 400){
          alert(err)

        }

      }
    })
  }

  enviarCodigoEmail(codigo: string){
    this.http.post<any>(urlAuthEmail,codigo).subscribe({
      next: res =>{
        this.dialog.closeAll()
        this.router.navigate(['/cadastro'])
      },
      error: err =>{
        localStorage.removeItem("email")
      }
    })
  }

  

}
