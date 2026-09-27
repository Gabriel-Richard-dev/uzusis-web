import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import { EnderecoEntrega } from '../api/modelos';
import { UFS } from './ufs';

/** Serve tanto EnderecoEntrega (pedido) quanto EnderecoPerfil (campos null). */
export type EnderecoInicial = Partial<Record<keyof EnderecoEntrega, string | null>>;

const digitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

function telefoneValido(c: AbstractControl): ValidationErrors | null {
  const d = digitos(c.value);
  return !d || d.length === 10 || d.length === 11 ? null : { telefone: true };
}

function ufValida(c: AbstractControl): ValidationErrors | null {
  return !c.value || UFS.includes(String(c.value).toUpperCase()) ? null : { uf: true };
}

/**
 * Form do `uz-endereco-form`, com as validações de §4.3.
 * entrega=true (checkout, O6): inclui destinatario e telefone. entrega=false (perfil, I3): só o endereço.
 * getRawValue() já tem o formato de EnderecoEntrega/AtualizarEndereco; CEP e telefone vão mascarados e o backend normaliza.
 */
export function criarFormEndereco(fb: FormBuilder, inicial?: EnderecoInicial | null, entrega = true): FormGroup {
  const v = (campo: keyof EnderecoEntrega) => inicial?.[campo] ?? '';
  const controles: Record<string, unknown> = entrega
    ? {
        destinatario: [v('destinatario'), [Validators.required, Validators.maxLength(200)]],
        telefone: [v('telefone'), telefoneValido],
      }
    : {};
  return fb.nonNullable.group({
    ...controles,
    cep: [v('cep'), [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    rua: [v('rua'), [Validators.required, Validators.maxLength(200)]],
    numero: [v('numero'), [Validators.required, Validators.maxLength(20)]],
    complemento: [v('complemento'), Validators.maxLength(100)],
    bairro: [v('bairro'), [Validators.required, Validators.maxLength(100)]],
    cidade: [v('cidade'), [Validators.required, Validators.maxLength(100)]],
    uf: [v('uf').toUpperCase(), [Validators.required, ufValida]],
  });
}
