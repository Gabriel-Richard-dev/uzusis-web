import { Component, OnInit } from "@angular/core";
import { NavbarService } from "src/app/features/initial-page/components/services/navbar.service";
import { AdminService } from "../../admin.service";
import { IgetProduto } from "src/app/core/interfaces/getProdutos";
import Swal from "sweetalert2";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import {
  Categoria,
  IAdicionarFoto,
} from "src/app/core/interfaces/IAdicionarProduto";

@Component({
  selector: "app-pegarProdutos",
  templateUrl: "./pegarProdutos.component.html",
  styleUrls: ["./pegarProdutos.component.css"],
})
export class PegarProdutosComponent implements OnInit {
  listarProduto: boolean = true;
  data!: IgetProduto[];
  dataId!: IgetProduto;
  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getProdutosEditar().subscribe({
      next: (res) => {
        this.data = res;
        console.log(this.data);
        this.data.forEach((element) => {
          console.log(element);
        });
      },
    });
  }

  imageUrl1: string | ArrayBuffer | null | undefined = null;
  imageUrl2: string | ArrayBuffer | null | undefined = null;
  imageUrl3: string | ArrayBuffer | null | undefined = null;
  backgroundImageUrl1: string = "../../../../../assets/icons8-adicionar-50.png";
  backgroundImageUrl2: string = "../../../../../assets/icons8-adicionar-50.png";
  backgroundImageUrl3: string = "../../../../../assets/icons8-adicionar-50.png";
  enviarFoto = false;
  id!: number;
  selecionado!: number;
  contadorFiles = 0;
  categorias: Categoria[] = [
    { categoria: 0, nomeCategoria: "Calça" },
    { categoria: 1, nomeCategoria: "Short" },
    { categoria: 2, nomeCategoria: "Saia" },
    { categoria: 3, nomeCategoria: "Cropped" },
    { categoria: 4, nomeCategoria: "Conjuntos" },
    { categoria: 5, nomeCategoria: "Blusão" },
    { categoria: 6, nomeCategoria: "Body" },
    { categoria: 7, nomeCategoria: "Blusa" },
    { categoria: 8, nomeCategoria: "Acessórios" },
  ];
  quantidadeP = 0;
  quantidadeM = 0;
  quantidadeG = 0;

  produto: IAdicionarFoto = {
    FotoFiles: [],
  };

  criarProduto = new FormGroup({
    Nome: new FormControl("", [
      Validators.required, // Nome é obrigatório
      Validators.maxLength(100), // Máximo de 100 caracteres, ajuste conforme necessário
    ]),
    Preco: new FormControl(null, [
      Validators.required, // Preço é obrigatório
      Validators.min(0), // Preço não pode ser negativo
    ]),
    QuantidadeP: new FormControl(0, []),
    QuantidadeM: new FormControl(0, []),
    QuantidadeG: new FormControl(0, []),
    Categoria: new FormControl(null, []),
    Descricao: new FormControl("", [
      Validators.required, // Descrição é obrigatória
      Validators.maxLength(500), // Máximo de 500 caracteres, ajuste conforme necessário
    ]),
  });

  trocarParaOEnviarImagem() {
    this.enviarFoto = true;
  }

  editarProduto() {
    const minimoCategoria: boolean =
      (this.criarProduto.value.QuantidadeP ?? 0) +
        (this.criarProduto.value.QuantidadeP ?? 0) +
        (this.criarProduto.value.QuantidadeP ?? 0) >=
      1;

    const produtoValues = {
      Nome: this.criarProduto.value.Nome || "", // Valor padrão se Nome for null ou undefined
      Preco: this.criarProduto.value.Preco ?? 0, // Valor padrão se Preco for null ou undefined
      QuantidadeP: this.criarProduto.value.QuantidadeP ?? 0,
      QuantidadeM: this.criarProduto.value.QuantidadeM ?? 0,
      QuantidadeG: this.criarProduto.value.QuantidadeG ?? 0,
      FotoUrls: this.produto.FotoFiles, // Assumindo que FotoFiles é um array de arquivos
      Categoria: this.selecionado ?? 0,
      Descricao: this.criarProduto.value.Descricao || "",
    };

    if (this.criarProduto.valid && minimoCategoria) {
      if (this.contadorFiles === 3) {
        this.adminService.adicionarProduto(produtoValues);
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Ops...",
          text: "Você deve ter no minimo e no maximo três fotos",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } else {
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Ops...",
        text: "Você não preencheu todas as informações.",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }
  salvar() {
    console.log(this.contadorFiles);
    if (this.contadorFiles === 3) {
      this.enviarFoto = false;
    } else {
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Ops...",
        text: "Você deve ter exatamente três imagens.",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  apagarTodas() {
    this.produto.FotoFiles = [];
    this.imageUrl1 = "";
    this.imageUrl2 = "";
    this.imageUrl3 = "";
    this.contadorFiles = 0;
  }

  fotoClose() {
    this.enviarFoto = false;
    this.apagarTodas();
  }

  onFilesSelected(event: any, uploadFiles: string) {
    const file = event.target.files ? event.target.files[0] : null;
    if (this.contadorFiles < 3) {
      if (file) {
        this.produto.FotoFiles.push(event.target.files[0]);

        if (uploadFiles === "file-upload1") {
          this.imageUrl1 = event.target.files[0];
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            this.imageUrl1 = e.target?.result;
          };
          reader.readAsDataURL(file);
          console.log("imagem url 1:", uploadFiles);
        } else if (uploadFiles === "file-upload2") {
          this.imageUrl2 = event.target.files[0];
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            this.imageUrl2 = e.target?.result;
          };
          reader.readAsDataURL(file);
          console.log("imagem url 2:", uploadFiles);
        } else if (uploadFiles === "file-upload3") {
          this.imageUrl3 = event.target.files[0];
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            this.imageUrl3 = e.target?.result;
          };
          reader.readAsDataURL(file);
          console.log("imagem url 3:", uploadFiles);
        } else {
          console.log("entrei aqui?");
        }
      }

      this.contadorFiles++;
    } else {
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Ops...",
        text: "Você deve ter exatamente três imagens.",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  }

  decreaseQuantity(event: any) {
    if (event.target.name === "p") {
      if (this.quantidadeP > 0) this.quantidadeP--;
    }

    if (event.target.name === "g") {
      if (this.quantidadeG > 0) this.quantidadeG--;
    }

    if (event.target.name === "m") {
      if (this.quantidadeM > 0) this.quantidadeM--;
    }
  }

  increaseQuantity(event: any) {
    if (event.target.name === "p") {
      this.quantidadeP++;
    }

    if (event.target.name === "g") {
      this.quantidadeG++;
    }

    if (event.target.name === "m") {
      this.quantidadeM++;
    }
  }

  voltarParaListar() {
    this.listarProduto = true;
  }
  AlterarProdutoClicado(id: number) {
    this.id = id;
    this.listarProduto = false;
    this.getId();
  }

  getId() {
    this.adminService.getId(this.id).subscribe({
      next: (res) => {
        this.dataId = res;
        console.log(this.dataId);
      },
    });
  }
}
