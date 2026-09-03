import { Component, Inject, OnInit } from '@angular/core';
import { NavbarService } from 'src/app/features/initial-page/components/services/navbar.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { produto } from 'src/app/core/interfaces/produto';
import { AuthService } from 'src/app/features/auth/auth.service';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

@Component({
  selector: 'app-modal-pagamento',
  templateUrl: './modal-pagamento.component.html',
  styleUrls: ['./modal-pagamento.component.scss']
})
export class ModalPagamentoComponent implements OnInit {

  form: FormGroup;

  formCep = new FormGroup({
    cep: new FormControl('')
  });

  precoItens = 0;
  cpfInvalido = false;
  precoTotal = 0;
  preco: number[] = [];
  produtos: produto[] = [];
  cep = '';
  frete = 0;
  chave: string | number = 0;
  selected = '';
  comprarTrue = false;
  agoraPode = false;
  agorarealpode = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: produto[],
    public dialog: MatDialog,
    private navbarService: NavbarService,
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private notificacao: NotificacaoService
  ) {
    this.form = this.fb.group({
      pagamento: ['', Validators.required],
      nome: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.produtos = [...this.data];
    this.preco = this.produtos.map(p => p.preco);
    for (let i = 0; i < this.preco.length; i++) {
      this.precoTotal += this.preco[i];
    }
    this.precoItens = this.precoTotal;
  }

  onPaymentChange(evento: Event) {
    this.agoraPode = false;
    const alvo = evento.target as HTMLInputElement;
    const valor = alvo.value;

    if (valor != '') {
      this.comprarTrue = true;
      this.selected = alvo.value;
    }
    if (valor === 'pix') {
      this.chave = this.generateRandomKey(80);
    }
  }

  comprar() {
    this.navbarService.comprar().subscribe(() => {
      this.dialog.closeAll();
      this.notificacao
        .alerta('Concluída!', 'Produto comprado com sucesso!')
        .then(() => this.router.navigate(['pedidos']));
    });
  }

  getNameValue() {
    this.agoraPode = false;
    if (this.form.get('nome')?.value) {
      this.agoraPode = true;
    }
    return this.form.get('nome')?.value || '';
  }

  getCep() {
    this.cpfInvalido = true;

    this.authService.enviarCep(this.formCep.value.cep as string).subscribe((res: any) => {
      if (res.estado === 'Ceará') {
        this.precoTotal = this.preco.reduce((a, b) => a + b, 0) + 10;
        this.agorarealpode = true;
        this.frete = 10;
        this.cpfInvalido = false;
      } else if (res.estado) {
        this.precoTotal = this.preco.reduce((a, b) => a + b, 0) + 40;
        this.agorarealpode = true;
        this.frete = 40;
        this.cpfInvalido = false;
      }

      if (!this.agorarealpode) {
        this.cpfInvalido = true;
      }
    });
  }

  generateRandomKey(tamanho: number): string {
    this.agoraPode = true;
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let chave = '';
    for (let i = 0; i < tamanho; i++) {
      chave += caracteres.charAt(Math.floor(Math.random() * 62));
    }
    return 'Uzusis' + chave;
  }

  fecharModal() {
    this.dialog.closeAll();
  }
}
