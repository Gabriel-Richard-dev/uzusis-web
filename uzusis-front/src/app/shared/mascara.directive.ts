import { Directive, ElementRef, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type TipoMascara = 'cpf' | 'celular' | 'cep';

function padrao(tipo: TipoMascara, digitos: string): string {
  switch (tipo) {
    case 'cpf':
      return '000.000.000-00';
    case 'cep':
      return '00000-000';
    case 'celular':
      return digitos.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000';
  }
}

/** Formata os dígitos no padrão (0 = dígito); para no último dígito digitado e descarta o excesso. */
export function aplicarMascara(tipo: TipoMascara, valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  const molde = padrao(tipo, digitos);
  if (!molde) return valor;
  let saida = '';
  let i = 0;
  for (const c of molde) {
    if (i >= digitos.length) break;
    saida += c === '0' ? digitos[i++] : c;
  }
  return saida;
}

/**
 * <input matInput formControlName="cpf" uzMascara="cpf">. O control recebe o valor já formatado
 * ("123.456.789-09"); o backend normaliza para só dígitos.
 */
@Directive({
    selector: 'input[uzMascara]',
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MascaraDirective), multi: true }],
    host: { '(input)': 'aoDigitar()', '(blur)': 'aoSair()' }
})
export class MascaraDirective implements ControlValueAccessor {
  @Input({ required: true }) uzMascara!: TipoMascara;
  private readonly el: HTMLInputElement = inject(ElementRef).nativeElement;
  private notificarMudanca: (valor: string) => void = () => undefined;
  private notificarToque: () => void = () => undefined;

  writeValue(valor: unknown): void {
    this.el.value = valor == null ? '' : aplicarMascara(this.uzMascara, String(valor));
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.notificarMudanca = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.notificarToque = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.el.disabled = desabilitado;
  }

  aoDigitar(): void {
    const valor = aplicarMascara(this.uzMascara, this.el.value);
    this.el.value = valor;
    this.notificarMudanca(valor);
  }

  aoSair(): void {
    this.notificarToque();
  }
}
