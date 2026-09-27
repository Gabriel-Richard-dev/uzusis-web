import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { ProdutoResposta } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { ProdutoFormComponent } from './produto-form.component';

describe('ProdutoFormComponent (edição)', () => {
  it('só chama C8 com as siglas de estoque que o admin mexeu', () => {
    const produto = {
      id: 42,
      nome: 'Saia Midi',
      preco: 59.9,
      descricao: 'Linho',
      categoria: 'SAIA',
      tamanhos: [{ sigla: 'P', quantidade: 3 }, { sigla: 'M', quantidade: 3 }],
      fotos: [],
    } as unknown as ProdutoResposta;
    const catalogo = {
      obter: vi.fn().mockReturnValue(of(produto)),
      atualizar: vi.fn().mockReturnValue(of(produto)),
      atualizarEstoque: vi.fn().mockReturnValue(of(produto)),
    };
    TestBed.configureTestingModule({
      imports: [ProdutoFormComponent],
      providers: [
        { provide: CatalogoService, useValue: catalogo },
        { provide: AvisoService, useValue: { sucesso: vi.fn(), erro: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '42' }) } } },
      ],
    }).overrideTemplate(ProdutoFormComponent, '');
    const form = TestBed.createComponent(ProdutoFormComponent).componentInstance;

    // Só a descrição: o estoque lido ao abrir (M=3) não pode ser regravado por cima de uma reserva.
    form.form.controls.descricao.setValue('Linho lavado');
    form.salvar();
    expect(catalogo.atualizar).toHaveBeenCalledTimes(1);
    expect(catalogo.atualizarEstoque).not.toHaveBeenCalled();

    const g = form.form.controls.estoque.controls.G;
    g.setValue(2);
    g.markAsDirty();
    form.salvar();
    expect(catalogo.atualizarEstoque).toHaveBeenCalledExactlyOnceWith(42, [{ sigla: 'G', quantidade: 2 }]);
  });
});

describe('ProdutoFormComponent (template, criação)', () => {
  it('liga rótulos aos campos e foca o primeiro inválido ao salvar', fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [ProdutoFormComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogoService, useValue: {} },
        { provide: AvisoService, useValue: { sucesso: vi.fn(), erro: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
    });
    const fixture = TestBed.createComponent(ProdutoFormComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const campo = (rotulo: string) => {
      const label = [...el.querySelectorAll('label')].find(l => l.textContent?.trim() === rotulo);
      return label?.htmlFor ? el.querySelector<HTMLElement>('#' + label.htmlFor) : null;
    };
    const salvar = () => {
      fixture.componentInstance.salvar();
      fixture.detectChanges();
      tick();
      return document.activeElement;
    };

    // O e2e usa get_by_label('Nome' | 'Preço' | 'M' …) e combobox 'Categoria'.
    expect(campo('Nome')?.getAttribute('formcontrolname')).toBe('nome');
    expect(campo('Preço')?.getAttribute('formcontrolname')).toBe('preco');
    expect(campo('Categoria')?.tagName).toBe('SELECT');
    expect(campo('M')?.getAttribute('type')).toBe('number');

    expect(salvar()).toBe(campo('Nome'));
    expect(el.querySelector('hlm-field-error')?.textContent).toContain('Informe o nome.');

    const f = fixture.componentInstance.form.controls;
    f.nome.setValue('Saia');
    expect(salvar()).toBe(campo('Categoria'));

    f.categoria.setValue('SAIA');
    f.preco.setValue('59,90');
    f.descricao.setValue('Linho');
    expect(salvar()).toBe(campo('PP')); // nenhum tamanho com estoque: erro do fieldset
    expect(el.querySelector('fieldset > p[role=alert]')?.textContent).toContain('pelo menos um tamanho');
  }));
});
