import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, NgZone, OnDestroy, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import {
  EMPTY,
  Observable,
  Subscription,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  from,
  map,
  of,
  startWith,
  switchMap,
  throwError,
} from 'rxjs';

import { mensagemDeErro } from '../../core/api/erros';
import {
  CarrinhoResposta,
  ConfigPagamento,
  EnderecoEntrega,
  FreteResposta,
  ItemResposta,
  PedidoResposta,
  PerfilResposta,
} from '../../core/api/modelos';
import { PagamentosService } from '../../core/api/pagamentos.service';
import { PedidosService } from '../../core/api/pedidos.service';
import { PerfilService } from '../../core/api/perfil.service';
import { SacolaService } from '../../core/api/sacola.service';
import { AvisoService } from '../../core/util/aviso.service';
import { criarFormEndereco } from '../../core/util/endereco-form';
import { UFS } from '../../core/util/ufs';
import { foiRecusado, marcarRecusado, repetirEnquanto404 } from './fluxo';
import { EstadoComponent } from '../../shared/estado.component';
import { MatButton } from '@angular/material/button';
import { ItensPedidoComponent } from './itens-pedido.component';
import { IconeComponent } from '../../shared/icone.component';
import { EnderecoFormComponent } from '../../shared/endereco-form.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';

const ERRO_STRIPE = 'Não foi possível carregar o pagamento. Verifique sua conexão.';

// Stripe.js só carrega aqui (módulo lazy), uma vez; uma falha libera nova tentativa.
let stripe$: Promise<Stripe> | undefined;
function carregarStripe(chave: string): Promise<Stripe> {
  stripe$ ??= loadStripe(chave)
    .then(s => s ?? Promise.reject(new Error('Stripe.js indisponível')))
    .catch(err => {
      stripe$ = undefined;
      throw err;
    });
  return stripe$;
}

interface Resumo {
  itens: ItemResposta[];
  subtotal: number;
  frete: number | null;
  total: number | null;
}

@Component({
    selector: 'uz-checkout',
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [EstadoComponent, MatButton, RouterLink, ItensPedidoComponent, IconeComponent, FormsModule, ReactiveFormsModule, EnderecoFormComponent, MatCheckbox, MatProgressSpinner, AsyncPipe, CurrencyPipe, DatePipe]
})
export class CheckoutComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly pagamentos = inject(PagamentosService);
  private readonly pedidos = inject(PedidosService);
  private readonly perfis = inject(PerfilService);
  private readonly aviso = inject(AvisoService);
  private readonly sacola = inject(SacolaService);

  readonly carrinho$ = this.sacola.carrinho$;

  passo: 'carregando' | 'erro' | 'entrega' | 'pagamento' = 'carregando';
  erro = '';
  config?: ConfigPagamento;
  resumoAberto = false;

  // Passo 1
  perfil?: PerfilResposta;
  form?: FormGroup;
  readonly salvarNoPerfil = new FormControl(true, { nonNullable: true });
  frete: FreteResposta | null = null;
  calculandoFrete = false;
  erroFrete = '';
  enviando = false;
  erroPedido = '';
  /** O6 deu 409: já existe um pedido aguardando pagamento. */
  pedidoPendente = false;

  // Passo 2
  pedido?: PedidoResposta;
  pronto = false;
  erroPreparo = '';
  pagando = false;
  erroPagamento = '';
  /** Depois de uma recusa o botão não volta (D4). */
  bloqueado = false;

  @ViewChild('elementoPagamento') private elementoPagamento?: ElementRef<HTMLElement>;
  private stripe?: Stripe;
  private elements?: StripeElements;
  private paymentElement?: StripePaymentElement;
  private retomar: number | null = null;
  private carga?: Subscription;
  private freteSub?: Subscription;
  private preparo?: Subscription;

  constructor() {
    // /checkout?pedido=:id retoma o passo 2. A troca de URL feita aqui depois do O6 não recarrega a tela.
    this.route.queryParamMap
      .pipe(
        map(q => Number(q.get('pedido')) || null),
        takeUntilDestroyed(),
      )
      .subscribe(id => {
        if (id && id === this.pedido?.id) return;
        this.retomar = id;
        this.carregar();
      });
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
    this.freteSub?.unsubscribe();
    this.limparPagamento();
  }

  carregar(): void {
    this.carga?.unsubscribe();
    this.limparPagamento();
    this.passo = 'carregando';
    this.pedido = undefined;
    this.erroPedido = '';
    const id = this.retomar;

    if (id) {
      this.carga = forkJoin({ config: this.pagamentos.config(), pedido: this.pedidos.obter(id) }).subscribe({
        next: ({ config, pedido }) => {
          this.config = config;
          if (pedido.status !== 'CRIADO' || foiRecusado(pedido.id)) {
            const recusado = pedido.status === 'CRIADO' ? { recusado: 1 } : {};
            this.router.navigate(['/pedido', pedido.id], { queryParams: recusado, replaceUrl: true });
            return;
          }
          this.abrirPagamento(pedido);
        },
        error: err => this.falhar(err),
      });
      return;
    }

    this.carga = forkJoin({
      config: this.pagamentos.config(),
      carrinho: this.sacola.carregar(),
      perfil: this.perfis.obter(),
    }).subscribe({
      next: ({ config, perfil }) => {
        this.config = config;
        this.perfil = perfil;
        this.montarForm(perfil);
        this.passo = 'entrega';
      },
      error: err => this.falhar(err),
    });
  }

  resumo(carrinho: CarrinhoResposta): Resumo {
    if (this.pedido) {
      const p = this.pedido;
      return { itens: p.itens, subtotal: p.subtotal, frete: p.frete, total: p.valorTotal };
    }
    const frete = this.frete?.valor ?? null;
    return {
      itens: carrinho.itens,
      subtotal: carrinho.valorTotal,
      frete,
      total: frete === null ? null : carrinho.valorTotal + frete,
    };
  }

  /** "Ir para o pagamento": salva no perfil (opcional), O6, atualiza a sacola e abre o passo 2. */
  criarPedido(): void {
    const form = this.form;
    if (!form || !this.config?.habilitado || this.enviando) return;
    if (form.invalid) {
      form.markAllAsTouched();
      this.host.querySelector<HTMLElement>('form .ng-invalid[formcontrolname]')?.focus();
      return;
    }
    const endereco = form.getRawValue() as EnderecoEntrega;
    this.enviando = true;
    this.erroPedido = '';
    this.pedidoPendente = false;
    this.salvarPerfil(endereco)
      .pipe(
        switchMap(() => this.pedidos.criar(endereco)),
        finalize(() => (this.enviando = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: pedido => {
          this.sacola.carregar();
          this.abrirPagamento(pedido);
          this.router.navigate([], { relativeTo: this.route, queryParams: { pedido: pedido.id }, replaceUrl: true });
        },
        error: err => {
          // 422 "Itens indisponíveis: …": mostra o detail e recarrega a sacola, que o servidor não mexeu.
          // 409 "Você já tem um pedido aguardando pagamento.": o detail e um link para os pedidos.
          this.erroPedido = mensagemDeErro(err);
          this.pedidoPendente = err instanceof HttpErrorResponse && err.status === 409;
          this.sacola.carregar();
        },
      });
  }

  /** P2 (repete no 404) + Stripe.js, depois monta o Payment Element. */
  prepararPagamento(): void {
    const pedido = this.pedido;
    const chave = this.config?.publishableKey;
    this.limparPagamento();
    if (!pedido || !this.config?.habilitado || !chave) return;

    this.preparo = forkJoin({
      segredo: this.pagamentos.clientSecret(pedido.id).pipe(repetirEnquanto404()),
      stripe: from(carregarStripe(chave)).pipe(catchError(() => throwError(() => ERRO_STRIPE))),
    }).subscribe({
      next: ({ segredo, stripe }) => {
        this.stripe = stripe;
        this.elements = stripe.elements({
          clientSecret: segredo.clientSecret,
          locale: 'pt-BR',
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#7a5a41',
              colorText: '#292b2e',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '4px',
            },
          },
        });
        this.paymentElement = this.elements.create('payment');
        this.paymentElement.on('ready', () => this.zone.run(() => (this.pronto = true)));
        this.paymentElement.on('loaderror', () => this.zone.run(() => (this.erroPreparo = ERRO_STRIPE)));
        this.paymentElement.mount(this.elementoPagamento!.nativeElement);
      },
      error: err => {
        if (err instanceof HttpErrorResponse && err.status === 409) {
          // Já pago ou cancelado: a confirmação mostra o que aconteceu.
          this.router.navigate(['/pedido', pedido.id], { replaceUrl: true });
          return;
        }
        this.erroPreparo = typeof err === 'string' ? err : mensagemDeErro(err);
      },
    });
  }

  async pagar(): Promise<void> {
    const { stripe, elements, pedido } = this;
    if (!stripe || !elements || !pedido || !this.pronto || this.pagando || this.bloqueado) return;
    this.pagando = true;
    this.erroPagamento = '';
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${location.origin}/pedido/${pedido.id}` },
      redirect: 'if_required',
    });
    this.zone.run(() => {
      if (!error) {
        this.router.navigate(['/pedido', pedido.id]);
      } else if (error.type === 'validation_error') {
        // Campo do cartão incompleto: nada foi enviado à Stripe, dá para corrigir aqui.
        this.erroPagamento = error.message ?? 'Confira os dados do cartão.';
        this.pagando = false;
      } else {
        // Uma recusa cancela o pedido (webhook). Nunca confirmar de novo este intent (D4).
        this.bloqueado = true;
        marcarRecusado(pedido.id);
        this.router.navigate(['/pedido', pedido.id], { queryParams: { recusado: 1 } });
      }
    });
  }

  private abrirPagamento(pedido: PedidoResposta): void {
    this.pedido = pedido;
    this.passo = 'pagamento';
    this.resumoAberto = false;
    this.prepararPagamento();
    // Só a query muda (?pedido=), e o AppComponent não move o foco: o botão do passo 1 some, o foco vai ao h1.
    setTimeout(() => this.host.querySelector<HTMLElement>('h1')?.focus());
  }

  private montarForm(perfil: PerfilResposta): void {
    const form = criarFormEndereco(this.fb, { ...perfil.endereco, destinatario: perfil.nome, telefone: perfil.celular });
    const uf = form.controls['uf'];
    this.form = form;
    this.freteSub?.unsubscribe();
    this.freteSub = uf.valueChanges
      .pipe(
        startWith(uf.value),
        map(v => String(v ?? '').toUpperCase()),
        distinctUntilChanged(),
        switchMap(sigla => {
          this.frete = null;
          this.erroFrete = '';
          this.calculandoFrete = UFS.includes(sigla);
          if (!this.calculandoFrete) return EMPTY;
          return this.pedidos.frete(sigla).pipe(
            catchError(err => {
              this.erroFrete = mensagemDeErro(err);
              return EMPTY;
            }),
            finalize(() => (this.calculandoFrete = false)),
          );
        }),
      )
      .subscribe(frete => (this.frete = frete));
  }

  /** I3 com o endereço (e I2 com o celular, se o perfil não tem). Uma falha avisa, mas não impede a compra. */
  private salvarPerfil(e: EnderecoEntrega): Observable<unknown> {
    if (!this.salvarNoPerfil.value) return of(null);
    const { cep, rua, numero, complemento, bairro, cidade, uf } = e;
    const chamadas: Observable<unknown>[] = [
      this.perfis.atualizarEndereco({ cep, rua, numero, complemento: complemento ?? '', bairro, cidade, uf }),
    ];
    if (!this.perfil?.celular && e.telefone) chamadas.push(this.perfis.atualizar({ celular: e.telefone }));
    return forkJoin(chamadas).pipe(
      catchError(err => {
        this.aviso.erro(`Não foi possível salvar o endereço no perfil: ${mensagemDeErro(err)}`);
        return of(null);
      }),
    );
  }

  private falhar(err: unknown): void {
    this.erro = mensagemDeErro(err);
    this.passo = 'erro';
  }

  private limparPagamento(): void {
    this.preparo?.unsubscribe();
    this.paymentElement?.destroy();
    this.paymentElement = this.elements = this.stripe = undefined;
    this.pronto = false;
    this.pagando = false;
    this.bloqueado = false;
    this.erroPreparo = '';
    this.erroPagamento = '';
  }
}
