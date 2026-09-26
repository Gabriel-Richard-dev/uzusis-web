import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';

import { celularValido, marcarErrosDoServidor, nascimentoValido } from './dados.component';

describe('dados da conta', () => {
  it('celular aceita vazio, 10 ou 11 dígitos', () => {
    expect(celularValido(new FormControl(''))).toBeNull();
    expect(celularValido(new FormControl('(85) 3333-4444'))).toBeNull();
    expect(celularValido(new FormControl('(85) 99999-0000'))).toBeNull();
    expect(celularValido(new FormControl('(85) 9999'))).toEqual({ celular: true });
  });

  it('nascimento: vazio ou passado desde 1900', () => {
    expect(nascimentoValido(new FormControl(''))).toBeNull();
    expect(nascimentoValido(new FormControl('1995-04-12'))).toBeNull();
    expect(nascimentoValido(new FormControl('1900-01-01'))).toBeNull();
    expect(nascimentoValido(new FormControl('1899-12-31'))).toEqual({ nascimento: true });
    expect(nascimentoValido(new FormControl('2999-01-01'))).toEqual({ nascimento: true });
  });

  it('põe erros[] do ProblemDetail nos campos e ignora corpo sem erros', () => {
    const form = new FormGroup({ cpf: new FormControl('111.111.111-11'), nome: new FormControl('Maria') });
    const erro = new HttpErrorResponse({
      status: 400,
      error: { detail: 'Dados inválidos: cpf: CPF inválido', erros: [{ campo: 'cpf', mensagem: 'CPF inválido' }] },
    });

    marcarErrosDoServidor(form, erro);
    marcarErrosDoServidor(form, new HttpErrorResponse({ status: 502, error: '<html>' }));

    expect(form.controls.cpf.getError('servidor')).toBe('CPF inválido');
    expect(form.controls.cpf.touched).toBeTrue();
    expect(form.controls.nome.valid).toBeTrue();
  });
});
