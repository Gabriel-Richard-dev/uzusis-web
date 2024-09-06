import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Categoria, IAdicionarFoto, IAdicionarProduto } from 'src/app/core/interfaces/IAdicionarProduto';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-criarProduto',
  templateUrl: './criarProduto.component.html',
  styleUrls: ['./criarProduto.component.css']
})
export class CriarProdutoComponent implements OnInit {
  enviarFoto = false
  selecionado!: number
  categorias: Categoria[] = [
    { categoria: 0, nomeCategoria: 'Calça' },
    { categoria: 1, nomeCategoria: 'Short' },
    { categoria: 2, nomeCategoria: 'Saia' },
    { categoria: 3, nomeCategoria: 'Cropped' },
    { categoria: 4, nomeCategoria: 'Conjuntos' },
    { categoria: 5, nomeCategoria: 'Blusão' },
    { categoria: 6, nomeCategoria: 'Body' },
    { categoria: 7, nomeCategoria: 'Blusa' },
    { categoria: 8, nomeCategoria: 'Acessórios' }
  ];

  constructor(private adminService: AdminService) { }

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

  trocarParaOEnviarImagem(){
    this.enviarFoto = true

  }


  cadastrarProduto(){
  
    const produtoValues = {
      Nome: this.criarProduto.value.Nome || '', // Valor padrão se Nome for null ou undefined
      Preco: this.criarProduto.value.Preco ?? 0, // Valor padrão se Preco for null ou undefined
      QuantidadeP: this.criarProduto.value.QuantidadeP ?? 0,
      QuantidadeM: this.criarProduto.value.QuantidadeM ?? 0,
      QuantidadeG: this.criarProduto.value.QuantidadeG ?? 0,
      FotoUrls: this.produto.FotoFiles, // Assumindo que FotoFiles é um array de arquivos
      Categoria: this.criarProduto.value.Categoria ?? 0,
      Descricao: this.criarProduto.value.Descricao || ''
    };;
    this.adminService.adicionarProduto(produtoValues)
  }

    onFilesSelected(event: any){
      this.produto.FotoFiles = Array.from(event.target.files)
      console.log(this.produto.FotoFiles)
    }


}
