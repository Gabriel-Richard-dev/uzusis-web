import { HttpErrorResponse } from '@angular/common/http';

import { ProblemDetail } from './modelos';

/** Texto de erro para o usuário (§7.4): o `detail` do ProblemDetail, senão uma mensagem pelo status. */
export function mensagemDeErro(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const corpo = err.error as ProblemDetail | string | null;
    const detail = corpo && typeof corpo === 'object' ? corpo.detail : undefined;
    if (typeof detail === 'string' && detail) return detail;
    switch (err.status) {
      case 0:
        return 'Sem conexão com o servidor';
      case 401:
        return 'Sua sessão expirou. Entre novamente.';
      case 403:
        return 'Acesso negado';
      case 413:
        return 'Arquivo maior que 5 MB.';
      case 502:
      case 503:
      case 504:
        return 'Serviço temporariamente indisponível. Tente novamente.';
    }
  }
  return 'Erro inesperado. Tente novamente.';
}
