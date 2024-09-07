import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Categoria, IAdicionarFoto, IAdicionarProduto } from 'src/app/core/interfaces/IAdicionarProduto';
import { AdminService } from '../../admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-criarProduto',
  templateUrl: './criarProduto.component.html',
  styleUrls: ['./criarProduto.component.css']
})
export class CriarProdutoComponent implements OnInit {
  backgroundImageUrl1: string = '../../../../../assets/icons8-adicionar-50.png';
  backgroundImageUrl2: string = '../../../../../assets/icons8-adicionar-50.png';
  backgroundImageUrl3: string = '../../../../../assets/icons8-adicionar-50.png';
  enviarFoto = false
  selecionado!: number
  contadorFiles = 0
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
  quantidadeP = 0;
  quantidadeM = 0;
  quantidadeG = 0;

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
    if(this.criarProduto.valid){
    this.adminService.adicionarProduto(produtoValues)
  }
  else{
    Swal.fire({
      position: 'center',
      icon: 'error',
      title: 'Ops...',
      text: 'Você não preencheu todas as informações.',
      showConfirmButton: false,
      timer: 1500,
 
    });
  }
  }

  salvar(){
    console.log(this.contadorFiles)
    if(this.contadorFiles === 3){
    this.enviarFoto = false
    this.contadorFiles = 0
  }
  else{
    Swal.fire({
      position: 'center',
      icon: 'error',
      title: 'Ops...',
      text: 'Você deve ter no minimo e no maximo três imagens.',
      showConfirmButton: false,
      timer: 1500,
 
    });
  }
}

fotoClose(){
  this.enviarFoto = false
  this.contadorFiles = 0
  this.produto.FotoFiles = []


}

    onFilesSelected(event: any){
      
      if(  this.contadorFiles < 3  ){
    
        this.produto.FotoFiles.push(event.target.files[0])
       
      
        this.contadorFiles += 1
        console.log(this.contadorFiles)
      }

      else{
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'Ops...',
          text: 'Você deve ter no maximo três imagens.',
          showConfirmButton: false,
          timer: 1500,
     
        });
      }

    }

    decreaseQuantity(event: any) {
      
      if(event.target.name === "p" ){ 
        this.quantidadeP--;
      }

      if(event.target.name === "g" ){ 
        this.quantidadeG--;
      }

      if(event.target.name === "m" ){ 
        this.quantidadeM--;
      }
    }
   
  
  
    increaseQuantity(event: any) {
      if(event.target.name === "p" ){ 
        this.quantidadeP++;
      }

      if(event.target.name === "g" ){ 
        this.quantidadeG++;
      }

      if(event.target.name === "m" ){ 
        this.quantidadeM++;
      }
    }


}
