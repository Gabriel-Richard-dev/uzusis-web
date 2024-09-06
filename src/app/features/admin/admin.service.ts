import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { IAdicionarProduto } from 'src/app/core/interfaces/IAdicionarProduto';
import { IClienteauth } from 'src/app/core/interfaces/auth';
import { IToken } from 'src/app/core/interfaces/token';
import { environment } from 'src/environments/environment.development';
import Swal from 'sweetalert2';

const apiUrl = `${environment}/produto`
const apiUrlAdm = `${environment.apiUrl}/administradorauth`



@Injectable({
  providedIn: 'root'
})

export class AdminService {

constructor(private http: HttpClient, private router: Router) { }

autenticar(auth: IClienteauth){
 console.log(auth)
  this.http.post<IToken>(`${apiUrlAdm}/login`, auth).subscribe({
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


      this.router.navigate(['admin'])
      setTimeout(() => {
        location.reload()
        
      }, 1000);


    },
    error: err =>{
      Swal.fire({
        position: 'center',
        icon: 'error',
        title: 'Ops...',
        text: `algo aconteceu`,
        showConfirmButton: false,
        timer: 1500,
   
      });
    }
  })
}


uploadFiles(imagens: File[]){

}

adicionarProduto(adicionarProduto: IAdicionarProduto){

}
}
