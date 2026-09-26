import { erroDoArquivo, filtroDaSituacao, lerPreco, tamanhosParaEnviar, trocar } from './admin-util';

describe('admin-util', () => {
  it('lerPreco aceita vírgula ou ponto com até 2 casas', () => {
    expect(lerPreco('59,90')).toBe(59.9);
    expect(lerPreco(' 59.9 ')).toBe(59.9);
    expect(lerPreco('100')).toBe(100);
    expect(lerPreco('1.234,56')).toBeNull();
    expect(lerPreco('5,999')).toBeNull();
    expect(lerPreco('-1')).toBeNull();
    expect(lerPreco('')).toBeNull();
  });

  it('filtroDaSituacao segue o C4', () => {
    expect(filtroDaSituacao('ativo')).toEqual({ ativo: true });
    expect(filtroDaSituacao('inativo')).toEqual({ ativo: false });
    expect(filtroDaSituacao('sem-estoque')).toEqual({ ativo: true, disponivel: false });
    expect(filtroDaSituacao(null)).toEqual({});
  });

  it('tamanhosParaEnviar: novos só com > 0; existentes sempre, mesmo zerados', () => {
    expect(tamanhosParaEnviar({ PP: null, P: 3, M: 0, G: null, GG: 2 })).toEqual([
      { sigla: 'P', quantidade: 3 },
      { sigla: 'GG', quantidade: 2 },
    ]);
    expect(tamanhosParaEnviar({ P: null, M: 7 }, ['P', 'M'])).toEqual([
      { sigla: 'P', quantidade: 0 },
      { sigla: 'M', quantidade: 7 },
    ]);
    expect(tamanhosParaEnviar({})).toEqual([]);
  });

  it('erroDoArquivo recusa tipo e tamanho', () => {
    const arquivo = (tipo: string, bytes: number) => new File([new Uint8Array(bytes)], 'x', { type: tipo });
    expect(erroDoArquivo(arquivo('image/png', 10))).toBeNull();
    expect(erroDoArquivo(arquivo('text/plain', 10))).toContain('Formato não suportado');
    expect(erroDoArquivo(arquivo('image/jpeg', 5 * 1024 * 1024 + 1))).toBe('Arquivo maior que 5 MB.');
  });

  it('trocar devolve cópia', () => {
    const lista = [1, 2, 3];
    expect(trocar(lista, 0, 1)).toEqual([2, 1, 3]);
    expect(lista).toEqual([1, 2, 3]);
  });
});
