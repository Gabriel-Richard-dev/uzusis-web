import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/internal/Observable';
import { IAdicionarFoto, IAdicionarProduto } from 'src/app/core/interfaces/IAdicionarProduto';
import { IClienteauth } from 'src/app/core/interfaces/auth';
import { IToken } from 'src/app/core/interfaces/token';
import { environment } from 'src/environments/environment.development';
import Swal from 'sweetalert2';

const apiUrlProduto = `${environment.apiUrl}/produto`
const apiUrlAdm = `${environment.apiUrl}/administradorauth`
const apiUrlCompra = `${environment.apiUrl}/compra`



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


      this.router.navigate(['admin/criar-produto'])
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
  const formDataAdicionarProduto = new FormData()
  formDataAdicionarProduto.append("Nome", adicionarProduto.Nome);
  formDataAdicionarProduto.append("Preco", adicionarProduto.Preco.toString())
  formDataAdicionarProduto.append("QuantidadeP", adicionarProduto.QuantidadeP.toString())
  formDataAdicionarProduto.append("QuantidadeM", adicionarProduto.QuantidadeM.toString())
  formDataAdicionarProduto.append("QuantidadeG", adicionarProduto.QuantidadeG.toString())
  formDataAdicionarProduto.append("Categoria", adicionarProduto.Categoria.toString())
  formDataAdicionarProduto.append("Descricao", adicionarProduto.Descricao)

console.log(adicionarProduto.FotoUrls)
 adicionarProduto.FotoUrls.forEach((file: File) =>{
  formDataAdicionarProduto.append(`FotoFiles`,file)
    console.log(file)
  })


 
this.http.post(`${apiUrlProduto}/adicionar`,formDataAdicionarProduto).subscribe()

}


pedidosPendentes() :Observable<any>{



  const headers = new HttpHeaders({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "ngrok-skip-browser-warning": "69420"
  })

  const options = {
    headers
  }

  return this.http.get<any>(`${apiUrlCompra}/administrador/dashboard`,options)

}

}
