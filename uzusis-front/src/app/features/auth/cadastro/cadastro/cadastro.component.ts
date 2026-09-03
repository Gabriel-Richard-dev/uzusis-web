import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { AuthService } from "../../auth.service";
import { ICadastro } from "src/app/core/interfaces/auth";
import { NotificacaoService } from "src/app/core/service/notificacao.service";

@Component({
  selector: "app-cadastro",
  templateUrl: "./cadastro.component.html",
  styleUrls: ["./cadastro.component.css"],
})
export class CadastroComponent {

  email = localStorage.getItem("email") || "";
  formularioEnviarError = false;

  rua = "";
  cidade = "";
  bairro = "";
  estado = "";

  formCadastrar = new FormGroup({
    nome: new FormControl("", [Validators.required]),
    email: new FormControl({ value: this.email, disabled: true }, [Validators.required, Validators.email]),
    senha: new FormControl("", [Validators.required]),
    confirmarSenha: new FormControl("", [Validators.required]),
    cpf: new FormControl("", [Validators.required, Validators.minLength(11), Validators.maxLength(11)]),
    celular: new FormControl("", [Validators.required]),
    dataNascimento: new FormControl("", [Validators.required]),
    cep: new FormControl("", [Validators.required, Validators.minLength(8), Validators.maxLength(9)]),
    rua: new FormControl("", [Validators.required, Validators.minLength(3), Validators.maxLength(100)]),
    numero: new FormControl("", [Validators.required, Validators.minLength(1), Validators.maxLength(10)]),
    bairro: new FormControl("", [Validators.required, Validators.minLength(3), Validators.maxLength(50)]),
    cidade: new FormControl("", [Validators.required, Validators.minLength(3), Validators.maxLength(50)]),
    estado: new FormControl("", [Validators.required, Validators.minLength(2), Validators.maxLength(2)]),
  });

  constructor(
    private AuthService: AuthService,
    private notificacao: NotificacaoService
  ) {}

  puxarEndereco() {
    this.formCadastrar.get("rua")?.enable();
    this.formCadastrar.get("bairro")?.enable();
    this.formCadastrar.get("cidade")?.enable();
    this.formCadastrar.get("estado")?.enable();
    this.formCadastrar.patchValue({ rua: "", bairro: "", cidade: "", estado: "" });

    const cep = this.formCadastrar.value.cep || "";
    if (cep.length !== 8 && cep.length !== 9) return;

    this.AuthService.enviarCep(cep).subscribe({
      next: (res: any) => {
        this.rua = res.logradouro;
        this.bairro = res.bairro;
        this.cidade = res.localidade;
        this.estado = res.estado;

        if (res.erro != "true") {
          this.formCadastrar.patchValue({
            rua: res.logradouro,
            bairro: res.bairro,
            cidade: res.localidade,
            estado: res.estado,
          });
          this.formCadastrar.get("rua")?.disable();
          this.formCadastrar.get("bairro")?.disable();
          this.formCadastrar.get("cidade")?.disable();
          this.formCadastrar.get("estado")?.disable();
        }
      },
    });
  }

  onSubmit() {
    this.formularioEnviarError = false;

    const cadastro = <ICadastro>{
      nome: this.formCadastrar.value.nome || "",
      email: localStorage.getItem("email") || "",
      senha: this.formCadastrar.value.senha || "",
      confirmarSenha: this.formCadastrar.value.senha || "",
      cpf: this.formCadastrar.value.cpf || "",
      celular: this.formCadastrar.value.celular || "",
      dataNascimento: this.formCadastrar.value.dataNascimento || "",
      endereco: {
        cep: this.formCadastrar.value.cep || "",
        rua: this.rua,
        bairro: this.bairro,
        cidade: this.cidade,
        estado: this.estado,
        numero: this.formCadastrar.value.numero || "",
      },
    };

    if (!this.formCadastrar.valid) {
      this.notificacao.erro("Ops...", "Preencha todos os campos corretamente");
      this.formularioEnviarError = true;
      return;
    }

    this.AuthService.cadastrar(cadastro);
  }
}
