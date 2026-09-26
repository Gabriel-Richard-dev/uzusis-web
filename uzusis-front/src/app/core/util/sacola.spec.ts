import { resumirSacola } from './sacola';

describe('resumirSacola', () => {
  it('lista vazia', () => {
    expect(resumirSacola([])).toEqual({ quantidadeItens: 0, valorTotal: 0 });
  });

  it('soma quantidades (> 1) e subtotal sem erro de ponto flutuante', () => {
    const itens = [
      { quantidade: 2, valorTotal: 179.8 },
      { quantidade: 1, valorTotal: 0.1 },
      { quantidade: 3, valorTotal: 0.2 },
    ];
    expect(resumirSacola(itens)).toEqual({ quantidadeItens: 6, valorTotal: 180.1 });
  });
});
