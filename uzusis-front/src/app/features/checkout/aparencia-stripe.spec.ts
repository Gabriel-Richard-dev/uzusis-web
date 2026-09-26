import { aparenciaStripe } from './checkout.component';

describe('aparenciaStripe', () => {
  it('repassa os tokens do tema ao Payment Element, sem cor fixa', () => {
    const a = aparenciaStripe(nome => `tok(${nome})`);
    expect(a.labels).toBe('above');
    expect(a.variables).toMatchObject({
      colorPrimary: 'tok(--primary)',
      colorBackground: 'tok(--card)',
      colorText: 'tok(--foreground)',
      colorDanger: 'tok(--destructive)',
      focusBoxShadow: '0 0 0 2px tok(--ring)',
    });
    expect(a.rules?.['.Input']['border']).toBe('1px solid tok(--input)');
    expect(JSON.stringify(a)).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });

  it('lê os tokens do CSS do documento', () => {
    document.documentElement.style.setProperty('--primary', ' #1c1917');
    try {
      expect(aparenciaStripe().variables?.colorPrimary).toBe('#1c1917');
    } finally {
      document.documentElement.style.removeProperty('--primary');
    }
  });
});
