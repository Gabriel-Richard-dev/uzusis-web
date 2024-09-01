import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ICadastro } from 'src/app/core/interfaces/auth';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.css']
})
export class CadastroComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  
  // Defina o FormGroup com todos os campos do JSON
  formCadastrar = new FormGroup({
    nome: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    senha: new FormControl('', Validators.required),
    cpf: new FormControl('', Validators.required),
    celular: new FormControl('', Validators.required),
    dataNascimento: new FormControl('', Validators.required),
    endereco: new FormGroup({
    cep: new FormControl('', Validators.required),
    rua: new FormControl('', Validators.required),
    numero: new FormControl('', Validators.required),
    bairro: new FormControl('', Validators.required),
    cidade: new FormControl('', Validators.required),
    estado: new FormControl('', Validators.required)
    })
  });
  puxarEndereco(){
    console.log(this.formCadastrar.value.endereco?.cep)

  }

  onSubmit(){


    const cliente: ICadastro = {
      nome: this.formCadastrar.value.nome || "",
      email: this.formCadastrar.value.email || "",
      senha: this.formCadastrar.value.senha || "",
      cpf: this.formCadastrar.value.cpf || "",
      celular: this.formCadastrar.value.celular || "",
      dataNascimento: this.formCadastrar.value.dataNascimento || "" ,
      endereco: {
        cep: this.formCadastrar.value.endereco?.cep || "",
        rua: this.formCadastrar.value.endereco?.rua || "",
        numero: this.formCadastrar.value.endereco?.numero || "",
        bairro: this.formCadastrar.value.endereco?.bairro || "",
        cidade: this.formCadastrar.value.endereco?.cidade || "",
        estado: this.formCadastrar.value.endereco?.estado || ""
      }
    };

    
  }

}
