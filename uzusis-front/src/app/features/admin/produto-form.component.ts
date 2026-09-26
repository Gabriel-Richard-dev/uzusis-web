import { Location } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ValidatorFn, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize, map, of, switchMap, tap } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, CategoriaProduto, ProdutoResposta, SIGLAS, Sigla } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { formatarPreco, lerPreco, tamanhosParaEnviar } from './admin-util';
import { GerenciadorFotosComponent } from './gerenciador-fotos.component';
import { IconeComponent } from '../../shared/icone.component';
import { EstadoComponent } from '../../shared/estado.component';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatPrefix, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';

const precoValido: ValidatorFn = c => {
  if (!c.value) return null; // o required cuida do vazio
  const preco = lerPreco(String(c.value));
  return preco !== null && preco >= 0.01 ? null : { preco: true };
};

/** C6 recusa lista vazia: na criação, pelo menos um tamanho com estoque. */
const algumEstoque: ValidatorFn = g =>
  Object.values((g as FormGroup).getRawValue()).some(v => Number(v) > 0) ? null : { semEstoque: true };

const quantidade = () => new FormControl<number | null>(null, Validators.pattern(/^\d{1,4}$/));

/** /admin/produtos/novo e /admin/produtos/:id: um componente, pré-preenchido na edição. */
@Component({
    selector: 'uz-produto-form',
    templateUrl: './produto-form.component.html',
    styleUrls: ['./produto-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink, IconeComponent, EstadoComponent, MatButton, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatSelect, MatOption, MatPrefix, MatHint, GerenciadorFotosComponent]
})
export class ProdutoFormComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly aviso = inject(AvisoService);
  private readonly location = inject(Location);
  private readonly titulo = inject(Title);
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly idParam = inject(ActivatedRoute).snapshot.paramMap.get('id');
  /** null em /novo. Um id que não é número vira NaN e cai no erro do C2. */
  private readonly idRota = this.idParam === null ? null : Number(this.idParam);

  @ViewChild(GerenciadorFotosComponent) private gerenciador?: GerenciadorFotosComponent;

  readonly mensagemDeErro = mensagemDeErro;
  readonly categorias = CATEGORIAS;
  readonly siglas = SIGLAS;

  readonly form = inject(NonNullableFormBuilder).group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    categoria: ['' as CategoriaProduto | '', Validators.required],
    preco: ['', [Validators.required, precoValido]],
    descricao: ['', [Validators.required, Validators.maxLength(2000)]],
    estoque: new FormGroup({ PP: quantidade(), P: quantidade(), M: quantidade(), G: quantidade(), GG: quantidade() }),
  });

  produto: ProdutoResposta | null = null;
  carregando = false;
  erroCarga: unknown = null;
  erroSalvar: string | null = null;
  salvando = false;

  get edicao(): boolean {
    return this.produto !== null || this.idRota !== null;
  }

  constructor() {
    if (this.idRota !== null) this.carregar();
    else this.form.controls.estoque.addValidators(algumEstoque);
  }

  carregar(): void {
    if (this.idRota === null) return;
    this.carregando = true;
    this.erroCarga = null;
    this.catalogo
      .obter(this.idRota)
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({ next: p => this.preencher(p), error: e => (this.erroCarga = e) });
  }

  salvar(): void {
    this.erroSalvar = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => this.el.querySelector<HTMLElement>('.ng-invalid:is(input, textarea, mat-select)')?.focus());
      return;
    }
    const v = this.form.getRawValue();
    const dados = {
      nome: v.nome.trim(),
      preco: lerPreco(v.preco) as number,
      descricao: v.descricao.trim(),
      categoria: v.categoria as CategoriaProduto,
    };
    const produto = this.produto;
    const estoque = this.form.controls.estoque.controls;
    // Na edição, só as siglas que o admin mexeu: C8 é absoluto, e reenviar o que foi lido ao abrir a tela
    // desfaria reservas e devoluções feitas nesse meio-tempo. Sigla não enviada fica intacta.
    const tamanhos = tamanhosParaEnviar(v.estoque, produto?.tamanhos.map(t => t.sigla)).filter(
      t => !produto || estoque[t.sigla].dirty,
    );

    this.salvando = true;
    const pedido$: Observable<string | null> = produto
      ? this.catalogo.atualizar(produto.id, dados).pipe(
          switchMap(p => (tamanhos.length ? this.catalogo.atualizarEstoque(produto.id, tamanhos) : of(p))),
          map(p => {
            this.preencher(p);
            return 'Produto salvo.';
          }),
        )
      : this.catalogo.criar({ ...dados, tamanhos }).pipe(
          tap(p => {
            // Daqui em diante a tela é a de edição, mesmo que alguma foto falhe (o erro fica por foto).
            this.preencher(p);
            this.location.replaceState(`/admin/produtos/${p.id}`);
            this.titulo.setTitle('Editar produto — Administração — Uzusis');
          }),
          switchMap(p => (this.gerenciador as GerenciadorFotosComponent).enviarPendentes(p.id)),
          map(falhas => {
            if (!falhas) return 'Produto criado.';
            this.aviso.erro(`Produto criado, mas ${falhas === 1 ? '1 foto não foi enviada' : falhas + ' fotos não foram enviadas'}.`);
            return null;
          }),
        );

    pedido$.pipe(finalize(() => (this.salvando = false))).subscribe({
      next: msg => {
        if (msg) this.aviso.sucesso(msg);
      },
      error: e => (this.erroSalvar = mensagemDeErro(e)),
    });
  }

  erroEstoque(s: Sigla): boolean {
    return this.form.controls.estoque.controls[s].invalid;
  }

  private preencher(p: ProdutoResposta): void {
    const qtd = (s: Sigla) => p.tamanhos.find(t => t.sigla === s)?.quantidade ?? null;
    this.produto = p;
    this.form.controls.estoque.removeValidators(algumEstoque);
    this.form.reset({
      nome: p.nome,
      categoria: p.categoria,
      preco: formatarPreco(p.preco),
      descricao: p.descricao,
      estoque: { PP: qtd('PP'), P: qtd('P'), M: qtd('M'), G: qtd('G'), GG: qtd('GG') },
    });
  }
}
