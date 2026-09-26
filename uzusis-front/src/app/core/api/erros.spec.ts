import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErro } from './erros';

describe('mensagemDeErro', () => {
  it('usa o detail do ProblemDetail', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { type: 'about:blank', title: 'Unprocessable Entity', status: 422, detail: 'Sua sacola está vazia' },
    });
    expect(mensagemDeErro(err)).toBe('Sua sacola está vazia');
  });

  it('status 0 é falta de conexão', () => {
    expect(mensagemDeErro(new HttpErrorResponse({ status: 0 }))).toBe('Sem conexão com o servidor');
  });

  it('502 com corpo HTML vira indisponibilidade', () => {
    const err = new HttpErrorResponse({ status: 502, error: '<html><body>Bad Gateway</body></html>' });
    expect(mensagemDeErro(err)).toBe('Serviço temporariamente indisponível. Tente novamente.');
  });

  it('401 sem corpo pede novo login', () => {
    expect(mensagemDeErro(new HttpErrorResponse({ status: 401 }))).toBe('Sua sessão expirou. Entre novamente.');
  });

  it('erro desconhecido', () => {
    expect(mensagemDeErro(new Error('x'))).toBe('Erro inesperado. Tente novamente.');
    expect(mensagemDeErro(new HttpErrorResponse({ status: 418 }))).toBe('Erro inesperado. Tente novamente.');
  });
});
