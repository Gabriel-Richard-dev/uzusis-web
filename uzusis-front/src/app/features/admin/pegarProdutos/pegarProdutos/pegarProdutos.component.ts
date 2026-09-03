import { Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { AdminService } from "../../admin.service";
import { NotificacaoService } from "src/app/core/service/notificacao.service";

@Component({
  selector: "app-pegarProdutos",
  templateUrl: "./pegarProdutos.component.html",
  styleUrls: ["./pegarProdutos.component.css"],
})
export class PegarProdutosComponent implements OnInit {

  listarProduto = true;
  data: any[] = [];
  dataId: any;
  id!: number;

  imageUrl1: string | ArrayBuffer | null | undefined = null;
  imageUrl2: string | ArrayBuffer | null | undefined = null;
  imageUrl3: string | ArrayBuffer | null | undefined = null;

  enviarFoto = false;
  contadorFiles = 0;
  selecionado?: number;

  tamanhos = [
    { sigla: "P", controle: "QuantidadeP" },
    { sigla: "M", controle: "QuantidadeM" },
    { sigla: "G", controle: "QuantidadeG" },
  ];

  categorias = [
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

  produto: { FotoFiles: File[] } = { FotoFiles: [] };

  criarProduto = new FormGroup({
    Nome: new FormControl("", [Validators.required, Validators.maxLength(100)]),
    Preco: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    QuantidadeP: new FormControl(0),
    QuantidadeM: new FormControl(0),
    QuantidadeG: new FormControl(0),
    Descricao: new FormControl("", [Validators.required, Validators.maxLength(500)]),
  });

  constructor(
    private adminService: AdminService,
    private notificacao: NotificacaoService
  ) {}

  ngOnInit() {
    this.carregarProdutos();
  }

  carregarProdutos() {
    this.adminService.getProdutosEditar().subscribe({
      next: res => this.data = res,
    });
  }

  trocarParaOEnviarImagem() {
    this.enviarFoto = true;
  }

  alterarQuantidade(controle: string, delta: number) {
    const campo = this.criarProduto.controls[controle as keyof typeof this.criarProduto.controls] as FormControl;
    campo.setValue(Math.max(0, (campo.value ?? 0) + delta));
  }

  editarProduto() {
    const valores = this.criarProduto.value;
    const total = (valores.QuantidadeP ?? 0) + (valores.QuantidadeM ?? 0) + (valores.QuantidadeG ?? 0);

    if (!this.criarProduto.valid || total < 1) {
      this.erro("Você não preencheu todas as informações.");
      return;
    }

    if (this.contadorFiles !== 3) {
      this.erro("Você deve ter no mínimo e no máximo três fotos");
      return;
    }

    this.adminService.editarProduto({
      id: this.id,
      Nome: valores.Nome || "",
      Preco: valores.Preco ?? 0,
      QuantidadeP: valores.QuantidadeP ?? 0,
      QuantidadeM: valores.QuantidadeM ?? 0,
      QuantidadeG: valores.QuantidadeG ?? 0,
      FotoUrls: this.produto.FotoFiles,
      Categoria: this.selecionado ?? 0,
      Descricao: valores.Descricao || "",
    } as any).subscribe({
      next: () => {
        this.voltarParaListar();
        this.carregarProdutos();
      },
      error: () => {},
    });
  }

  salvar() {
    if (this.contadorFiles === 3) {
      this.enviarFoto = false;
    } else {
      this.erro("Você deve ter exatamente três imagens.");
    }
  }

  apagarTodas() {
    this.produto.FotoFiles = [];
    this.imageUrl1 = null;
    this.imageUrl2 = null;
    this.imageUrl3 = null;
    this.contadorFiles = 0;
  }

  fotoClose() {
    this.enviarFoto = false;
    this.apagarTodas();
  }

  onFilesSelected(evento: Event, campo: string) {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (!arquivo) return;

    if (this.contadorFiles >= 3) {
      this.erro("Você deve ter exatamente três imagens.");
      return;
    }

    this.produto.FotoFiles.push(arquivo);
    this.contadorFiles++;

    const leitor = new FileReader();
    leitor.onload = evt => {
      const resultado = evt.target?.result;
      if (campo === "file-upload1") this.imageUrl1 = resultado;
      else if (campo === "file-upload2") this.imageUrl2 = resultado;
      else this.imageUrl3 = resultado;
    };
    leitor.readAsDataURL(arquivo);
  }

  voltarParaListar() {
    this.listarProduto = true;
    this.enviarFoto = false;
    this.apagarTodas();
    this.criarProduto.reset({
      Nome: "", Preco: null, QuantidadeP: 0, QuantidadeM: 0, QuantidadeG: 0, Descricao: "",
    });
  }

  AlterarProdutoClicado(id: number) {
    this.id = id;
    this.listarProduto = false;
    this.getId();
  }

  getId() {
    this.adminService.getId(this.id).subscribe({
      next: res => this.dataId = res,
    });
  }

  private erro(texto: string) {
    this.notificacao.erro("Ops...", texto);
  }
}
