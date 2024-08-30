import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IClienteauth } from 'src/app/core/interfaces/auth';
import { environment } from 'src/environments/environment.development';
import { IToken } from 'src/app/core/interfaces/token';
import { IClienteEmail } from 'src/app/core/interfaces/auth';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmarSenhaComponent } from './modal/confirmar-senha/confirmar-senha.component';

const urlAuth = `${environment.apiUrl}/clienteauth`

@Injectable({
  providedIn: 'root'
})
export class AuthService {


  constructor(private http: HttpClient, private dialog: MatDialog ) { }
  

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

    this.http.post<any>(`${urlAuth}/enviar-confirmacao-email`, email).subscribe({
      next: res =>{
        if(res.status === 200){
          this.dialog.open(ConfirmarSenhaComponent)

        }
      },
      error: err =>{
        if(err.status === 200){
          this.dialog.open(ConfirmarSenhaComponent)
          console.log("eu abri o erro?")
  
         
        }
        if(err.status === 400){
          alert(err)

        }
      
      }
    })
  }

  

}
