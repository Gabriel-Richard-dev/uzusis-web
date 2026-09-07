import { AfterViewInit, Component, OnInit, ViewChildren } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../auth.service';
import { NotificacaoService } from 'src/app/core/service/notificacao.service';

@Component({
  selector: 'app-confirmar-senha',
  templateUrl: './confirmar-senha.component.html',
  styleUrls: ['./confirmar-senha.component.scss']
})
export class ConfirmarCodigoComponent implements OnInit, AfterViewInit {

  concatenatedValuesLenght = 0;
  concatenedValue = '';
  email = '';

  formInput = ['input1', 'input2', 'input3', 'input4', 'input5'];
  form: FormGroup = this.toFormGroup(this.formInput);

  @ViewChildren('formRow') rows: any;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private notificacao: NotificacaoService
  ) { }

  ngOnInit() {
    this.email = localStorage.getItem('guardarEmail') || '';
  }

  ngAfterViewInit() {
    setTimeout(() => this.focar(0));
  }

  toFormGroup(elementos: string[]): FormGroup {
    const grupo: any = {};
    elementos.forEach(nome => grupo[nome] = new FormControl('', Validators.required));
    return new FormGroup(grupo);
  }

  keyUpEvent(evento: KeyboardEvent, indice: number) {
    const apagou = evento.key === 'Backspace';
    if (apagou || !!this.form.value[this.formInput[indice]]) {
      this.focar(apagou ? indice - 1 : indice + 1);
    }
    this.atualizarCodigo();
  }

  colar(evento: ClipboardEvent) {
    const texto = (evento.clipboardData?.getData('text') || '').replace(/\s/g, '').slice(0, 5);
    if (!texto) return;
    evento.preventDefault();
    this.formInput.forEach((nome, i) => this.form.get(nome)!.setValue(texto[i] ?? ''));
    this.focar(Math.min(texto.length, 4));
    this.atualizarCodigo();
  }

  enviarCodigoEmail() {
    if (this.concatenatedValuesLenght !== 5) {
      this.notificacao.erro('Ops...', 'Você não preencheu todos os campos');
      return;
    }
    this.authService.enviarCodigoEmailCadastro(this.concatenedValue);
  }

  reenviar() {
    if (this.email) {
      this.authService.enviarCodigoConfirmarEmail({ email: this.email } as any, false);
    }
  }

  fechar() {
    this.dialog.closeAll();
  }

  private focar(indice: number) {
    if (indice > -1 && indice < this.formInput.length) {
      this.rows?._results[indice]?.nativeElement.focus();
    }
  }

  private atualizarCodigo() {
    const valores = this.form.value;
    this.concatenedValue = this.formInput.map(nome => valores[nome] || '').join('');
    this.concatenatedValuesLenght = this.concatenedValue.length;
    if (this.concatenatedValuesLenght === 5) {
      this.authService.enviarCodigoEmailCadastro(this.concatenedValue);
    }
  }
}
