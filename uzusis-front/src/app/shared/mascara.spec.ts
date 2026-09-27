import { aplicarMascara } from './mascara.directive';

describe('aplicarMascara', () => {
  it('cpf', () => {
    expect(aplicarMascara('cpf', '12345678909')).toBe('123.456.789-09');
    expect(aplicarMascara('cpf', '1234')).toBe('123.4');
    expect(aplicarMascara('cpf', '123.456.789-0999')).toBe('123.456.789-09');
  });

  it('celular com 10 e 11 dígitos', () => {
    expect(aplicarMascara('celular', '8533334444')).toBe('(85) 3333-4444');
    expect(aplicarMascara('celular', '85999990000')).toBe('(85) 99999-0000');
    expect(aplicarMascara('celular', '85')).toBe('(85');
  });

  it('cep', () => {
    expect(aplicarMascara('cep', '60000000')).toBe('60000-000');
    expect(aplicarMascara('cep', 'abc')).toBe('');
  });
});
