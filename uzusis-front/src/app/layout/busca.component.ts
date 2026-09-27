import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, afterRenderEffect, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationStart, Params, Router } from '@angular/router';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { filter } from 'rxjs';

import { CatalogoService } from '../core/api/catalogo.service';
import { IconeComponent } from '../shared/icone.component';
import { Opcao, lerRecentes, limparRecentes, montarPainel, salvarRecente, sugestoes } from './busca';

let seq = 0;

const SELECIONADA = 'cursor-pointer aria-selected:bg-accent aria-selected:ring-2 aria-selected:ring-inset aria-selected:ring-ring';

/**
 * Busca com sugestões: combobox com listbox (APG). O foco nunca sai do campo; a opção ativa vai em aria-activedescendant.
 * modo 'popup' (header ≥ lg): abre ao clicar, digitar ou ↓. modo 'tela' (sheet no celular): painel sempre visível.
 * Só signals: o OnPush padrão do Angular 22 serve.
 */
@Component({
  selector: 'uz-busca',
  templateUrl: './busca.component.html',
  imports: [CurrencyPipe, IconeComponent, HlmInputGroupImports, HlmSkeletonImports],
})
export class BuscaComponent {
  private readonly router = inject(Router);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly catalogo = inject(CatalogoService);

  readonly modo = input<'popup' | 'tela'>('popup');
  /** 2 instâncias podem coexistir (header + sheet). */
  readonly id = `busca-${++seq}`;
  readonly termo = signal('');
  readonly aberto = signal(false);
  readonly recentes = signal(lerRecentes());
  private readonly q = computed(() => this.termo().trim());
  /** Última resposta. Sem startWith: enquanto carrega, a anterior continua (esmaecida). */
  private readonly resposta = toSignal(
    sugestoes(toObservable(this.q), nome => this.catalogo.listar({ nome, size: 6, sort: 'criadoEm,desc' })),
    { initialValue: null },
  );
  readonly painel = computed(() => montarPainel(this.id, this.q(), this.resposta(), this.recentes()));
  readonly visivel = computed(() => this.modo() === 'tela' || this.aberto());
  /** Volta a -1 quando a lista muda. */
  readonly ativo = linkedSignal({ source: () => this.painel().opcoes, computation: () => -1 });
  readonly ativoId = computed(() => (this.visivel() && this.painel().opcoes[this.ativo()]?.id) || null);
  readonly anuncio = computed(() => (this.visivel() ? this.painel().anuncio : ''));

  constructor() {
    // Voltar do navegador com o popup aberto.
    this.router.events
      .pipe(filter(e => e instanceof NavigationStart), takeUntilDestroyed())
      .subscribe(() => this.fechar());
    afterRenderEffect(() => {
      const id = this.ativoId();
      if (id) document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
    });
  }

  classe(o: Opcao): string {
    const tela = this.modo() === 'tela';
    if (o.tipo === 'categoria') return `uz-pill max-w-full ${SELECIONADA}`;
    // Ação, não item da lista: link pequeno sublinhado (no modo tela mantém o alvo de toque de 44 px).
    if (o.tipo === 'limpar')
      return `flex w-fit ${tela ? 'min-h-11' : 'min-h-9'} items-center rounded-lg px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ${SELECIONADA}`;
    const altura = o.tipo === 'produto' ? (tela ? 'min-h-16' : 'min-h-14') : tela ? 'min-h-12' : 'min-h-11';
    const extra = o.tipo === 'ver' ? 'font-medium' : '';
    return `flex ${altura} items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent ${extra} ${SELECIONADA}`;
  }

  digitar(e: Event): void {
    this.termo.set((e.target as HTMLInputElement).value);
    this.aberto.set(true);
  }

  tecla(e: KeyboardEvent): void {
    if (e.isComposing) return;
    const n = this.painel().opcoes.length;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!this.visivel()) this.aberto.set(true);
        else this.ativo.update(i => (e.key === 'ArrowDown' ? (i + 1) % n : (i <= 0 ? n : i) - 1));
        return;
      case 'Enter': {
        const o = this.ativoId() ? this.painel().opcoes[this.ativo()] : undefined;
        if (o) {
          e.preventDefault();
          this.escolher(o);
        }
        return; // sem opção ativa, o submit segue
      }
      case 'Escape':
        if (this.modo() === 'tela') return; // o CDK fecha o sheet
        e.preventDefault(); // o type=search limparia o campo sozinho
        if (this.aberto()) this.fechar();
        else this.termo.set('');
        return;
      case 'Tab':
        if (this.modo() === 'popup') this.fechar();
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        this.ativo.set(-1);
    }
  }

  escolher(o: Opcao): void {
    if (o.tipo === 'limpar') {
      limparRecentes();
      this.recentes.set([]);
      return; // continua aberto
    }
    this.recentes.set(salvarRecente(o.grava));
    this.sair(o.rota, o.queryParams);
  }

  enviar(e: Event): void {
    e.preventDefault();
    const q = this.q();
    this.recentes.set(salvarRecente(q));
    this.sair(['/loja'], q ? { q } : {});
  }

  /** Clique fora ou foco fora do componente fecha o popup. */
  aoSair(e: FocusEvent): void {
    if (this.modo() === 'popup' && !this.host.nativeElement.contains(e.relatedTarget as Node | null)) this.fechar();
  }

  private fechar(): void {
    this.aberto.set(false);
    this.ativo.set(-1);
  }

  /** O shell fecha o sheet ao navegar. */
  private sair(rota: string[], queryParams?: Params): void {
    this.termo.set('');
    this.fechar();
    void this.router.navigate(rota, { queryParams });
  }
}
