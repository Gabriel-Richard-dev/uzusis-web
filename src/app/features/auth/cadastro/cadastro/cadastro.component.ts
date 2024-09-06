import { Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ICadastro } from "src/app/core/interfaces/auth";
import { AuthService } from "../../auth.service";
import { ICEP } from "src/app/core/interfaces/cep";
import Swal from "sweetalert2";

@Component({
  selector: "app-cadastro",
  templateUrl: "./cadastro.component.html",
  styleUrls: ["./cadastro.component.css"],
})
export class CadastroComponent implements OnInit {
  email: string = localStorage.getItem("email") || "";
  formularioEnviarError: boolean = false;
  rua: string = "";
  cidade: string = "";
  bairro: string = "";
  estado: string = "";
  constructor(private AuthService: AuthService) {}

  ngOnInit() {}

  formCadastrar = new FormGroup({
    nome: new FormControl("", [Validators.required]),

    email: new FormControl({ value: this.email, disabled: true }, [
      Validators.required,
      Validators.email,
    ]),

    senha: new FormControl("", [Validators.required]),
    confirmarSenha: new FormControl("", [Validators.required]),

    cpf: new FormControl("", [
      Validators.required,
      Validators.minLength(11), // CPF geralmente tem 11 dígitos
      Validators.maxLength(11),
    ]),

    celular: new FormControl("", [
      Validators.required,
      Validators.minLength(10), // Celular pode ter 10 ou 11 dígitos
      Validators.maxLength(12),
    ]),

    dataNascimento: new FormControl("", [Validators.required]),

    cep: new FormControl("", [
      Validators.required,
      Validators.minLength(8), // CEP geralmente tem 8 dígitos
      Validators.maxLength(9),
    ]),

    rua: new FormControl("", [
      Validators.required,
      Validators.minLength(3), // Rua pode ter pelo menos 3 caracteres
      Validators.maxLength(100), // E até 100 caracteres
    ]),

    numero: new FormControl("", [
      Validators.required,
      Validators.minLength(1), // Número deve ter pelo menos 1 dígito
      Validators.maxLength(10), // E pode ter até 10 dígitos
    ]),

    bairro: new FormControl("", [
      Validators.required,
      Validators.minLength(3), // Bairro deve ter pelo menos 3 caracteres
      Validators.maxLength(50), // E até 50 caracteres
    ]),

    cidade: new FormControl("", [
      Validators.required,
      Validators.minLength(3), // Cidade deve ter pelo menos 3 caracteres
      Validators.maxLength(50), // E até 50 caracteres
    ]),

    estado: new FormControl("", [
      Validators.required,
      Validators.minLength(2), // Estado deve ter 2 caracteres (sigla)
      Validators.maxLength(2),
    ]),
  });

  puxarEndereco() {
    this.formCadastrar.get("rua")?.enable();
    this.formCadastrar.get("bairro")?.enable();
    this.formCadastrar.get("cidade")?.enable();
    this.formCadastrar.get("estado")?.enable();
    this.formCadastrar.patchValue({
      rua: "",
      bairro: "",
      cidade: "",
      estado: "",
    });

    const cep = this.formCadastrar.value.cep || "";
    console.log(cep.length);
    if (cep.length === 8 || cep.length === 9) {
      this.AuthService.enviarCep(cep).subscribe({
        next: (res: ICEP) => {
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
  }

  onSubmit() {
    this.formularioEnviarError = false;
    const cliente = <ICadastro>{
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

    if (this.formCadastrar.valid) {
      this.AuthService.cadastrar(cliente);
    } else {
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Ops...",
        text: "Você precisar preencher todos os campos corretamente",
        showConfirmButton: false,
        timer: 1500,
      });
      this.formularioEnviarError = true;
    }
  }
}
