import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IAdicionarProduto } from 'src/app/core/interfaces/IAdicionarProduto';
import { environment } from 'src/environments/environment.development';

const apiUrl = `${environment}/produto`



@Injectable({
  providedIn: 'root'
})

export class AdminService {

constructor(private http: HttpClient) { }


uploadFiles(imagens: File[]){

}

adicionarProduto(adicionarProduto: IAdicionarProduto){

}
}
