import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
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
    Nome: new FormControl('', [
      Validators.required,  // Nome é obrigatório
      Validators.maxLength(100)  // Máximo de 100 caracteres, ajuste conforme necessário
    ]),
    Preco: new FormControl(null, [
      Validators.required,  // Preço é obrigatório
      Validators.min(0)     // Preço não pode ser negativo
    ]),
    QuantidadeP: new FormControl(0, [
      Validators.required,  // Quantidade pequena é obrigatória
      Validators.min(0)     // Quantidade não pode ser negativa
    ]),
    QuantidadeM: new FormControl(0, [
      Validators.required,  // Quantidade média é obrigatória
      Validators.min(0)     // Quantidade não pode ser negativa
    ]),
    QuantidadeG: new FormControl(0, [
      Validators.required,  // Quantidade grande é obrigatória
      Validators.min(0)     // Quantidade não pode ser negativa
    ]),
    FotoFiles: new FormControl([], [
      Validators.required,  // Fotos são obrigatórias
    ]),  // Este campo pode precisar de uma abordagem diferente dependendo de como você está lidando com uploads de arquivos
    Categoria: new FormControl(null, [
      Validators.required,  // Categoria é obrigatória
      Validators.min(1)     // Categoria deve ser um número positivo
    ]),
    Descricao: new FormControl('', [
      Validators.required,  // Descrição é obrigatória
      Validators.maxLength(500)  // Máximo de 500 caracteres, ajuste conforme necessário
    ])
  });


  cadastrarFoto(){
    
  }

    onFilesSelected(event: any){
      this.produto.FotoFiles = Array.from(event.target.files)
      console.log(this.produto.FotoFiles)
    }


}
