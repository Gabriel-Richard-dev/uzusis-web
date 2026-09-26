import { rotuloIntervalo } from './paginador.component';

describe('rotuloIntervalo', () => {
  it('primeira, última e vazia', () => {
    expect(rotuloIntervalo(0, 20, 37)).toBe('1 – 20 de 37');
    expect(rotuloIntervalo(1, 20, 37)).toBe('21 – 37 de 37');
    expect(rotuloIntervalo(0, 20, 0)).toBe('0 de 0');
  });
});
