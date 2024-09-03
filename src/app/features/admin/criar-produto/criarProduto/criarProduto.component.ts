import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IAdicionarFoto, IAdicionarProduto } from 'src/app/core/interfaces/IAdicionarProduto';

@Component({
  selector: 'app-criarProduto',
  templateUrl: './criarProduto.component.html',
  styleUrls: ['./criarProduto.component.css']
})
export class CriarProdutoComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  produto: IAdicionarFoto = {
    FotoFiles: []
  }

  criarProduto = new FormGroup({

  })


  cadastrarFoto(){
    
  }

    onFilesSelected(event: any){
      this.produto.FotoFiles = Array.from(event.target.files)
      console.log(this.produto.FotoFiles)
    }


}
