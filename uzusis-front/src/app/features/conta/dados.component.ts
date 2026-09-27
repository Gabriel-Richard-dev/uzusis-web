import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { mensagemDeErro } from '../../core/api/erros';
import { PerfilResposta, ProblemDetail } from '../../core/api/modelos';
import { PerfilService } from '../../core/api/perfil.service';
import { AuthService } from '../../core/auth/auth.service';
import { criarFormEndereco } from '../../core/util/endereco-form';
import { AvisoService } from '../../core/util/aviso.service';
import { EstadoComponent } from '../../shared/estado.component';
import { MascaraDirective } from '../../shared/mascara.directive';
import { EnderecoFormComponent } from '../../shared/endereco-form.component';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

const digitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

export function celularValido(c: AbstractControl): ValidationErrors | null {
  const n = digitos(c.value).length;
  return n === 0 || n === 10 || n === 11 ? null : { celular: true };
}

/** Como o backend (@Past e >= 1900-01-01). O valor do <input type="date"> é 'yyyy-MM-dd', comparável como texto. */
export function nascimentoValido(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '');
  return !v || (v >= '1900-01-01' && v < hoje()) ? null : { nascimento: true };
}

function hoje(): string {
  return formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
}

/** Põe no campo a mensagem de `erros[]` do ProblemDetail (400 de validação), para aparecer no hlm-field-error. */
export function marcarErrosDoServidor(form: FormGroup, err: unknown): void {
  const corpo = err instanceof HttpErrorResponse ? (err.error as ProblemDetail | null) : null;
  for (const e of corpo?.erros ?? []) {
    const campo = form.get(e.campo);
    campo?.setErrors({ servidor: e.mensagem });
    campo?.markAsTouched();
  }
}

const MENSAGENS: Record<string, string> = {
  nome: 'Use até 200 caracteres',
  cpf: 'Informe os 11 dígitos do CPF',
  celular: 'Informe DDD + número (10 ou 11 dígitos)',
  dataNascimento: 'Data de nascimento inválida',
};

/** /conta/dados: dados pessoais (I2), endereço (I3), e-mail só leitura e troca de senha no Keycloak. */
@Component({
    selector: 'uz-conta-dados',
    templateUrl: './dados.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [EstadoComponent, ReactiveFormsModule, MascaraDirective, EnderecoFormComponent, HlmButtonImports, HlmCardImports, HlmFieldImports, HlmInputImports, HlmSpinnerImports]
})
export class DadosComponent implements OnInit {
  private readonly api = inject(PerfilService);
  private readonly aviso = inject(AvisoService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly hoje = hoje();
  perfil: PerfilResposta | null = null;
  erro: string | null = null;
  salvandoPessoal = false;
  salvandoEndereco = false;

  readonly formPessoal = this.fb.nonNullable.group({
    nome: ['', Validators.maxLength(200)],
    cpf: ['', Validators.pattern(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)],
    celular: ['', celularValido],
    dataNascimento: ['', nascimentoValido],
  });
  formEndereco: FormGroup | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.perfil = null;
    this.erro = null;
    this.api.obter().subscribe({
      next: perfil => {
        this.preencherPessoal(perfil);
        this.formEndereco = criarFormEndereco(this.fb, perfil.endereco, false);
        this.perfil = perfil;
      },
      error: err => (this.erro = mensagemDeErro(err)),
    });
  }

  erroPessoal(campo: string): string {
    return this.formPessoal.get(campo)?.getError('servidor') ?? MENSAGENS[campo];
  }

  salvarPessoal(): void {
    const form = this.formPessoal;
    if (!this.validar(form) || this.salvandoPessoal) return;
    const v = form.getRawValue();
    this.salvandoPessoal = true;
    // Vazio vira null (= mantém): o contrato não tem como apagar esses campos.
    this.api
      .atualizar({
        nome: v.nome.trim() || null,
        cpf: v.cpf || null,
        celular: v.celular || null,
        dataNascimento: v.dataNascimento || null,
      })
      .pipe(finalize(() => (this.salvandoPessoal = false)))
      .subscribe({
        next: perfil => {
          this.perfil = perfil;
          this.preencherPessoal(perfil);
          this.aviso.sucesso('Dados pessoais salvos.');
        },
        error: err => this.falhou(form, err),
      });
  }

  salvarEndereco(): void {
    const form = this.formEndereco;
    if (!form || !this.validar(form) || this.salvandoEndereco) return;
    this.salvandoEndereco = true;
    // complemento '' limpa o complemento salvo (I3).
    this.api
      .atualizarEndereco(form.getRawValue())
      .pipe(finalize(() => (this.salvandoEndereco = false)))
      .subscribe({
        next: perfil => {
          this.perfil = perfil;
          form.markAsPristine();
          this.aviso.sucesso('Endereço salvo.');
        },
        error: err => this.falhou(form, err),
      });
  }

  private validar(form: FormGroup): boolean {
    form.markAllAsTouched();
    if (form.valid) return true;
    this.aviso.erro('Confira os campos destacados.');
    return false;
  }

  private falhou(form: FormGroup, err: unknown): void {
    marcarErrosDoServidor(form, err);
    this.aviso.erro(err);
  }

  private preencherPessoal(p: PerfilResposta): void {
    this.formPessoal.reset({
      nome: p.nome ?? '',
      cpf: p.cpf ?? '',
      celular: p.celular ?? '',
      dataNascimento: p.dataNascimento ?? '',
    });
  }
}
