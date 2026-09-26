import { Component, Input, OnChanges, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';

import { CepService } from '../core/api/cep.service';
import { UFS } from '../core/util/ufs';
import { MatFormField, MatLabel, MatError, MatHint, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MascaraDirective } from './mascara.directive';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelect, MatOption } from '@angular/material/select';

/**
 * Campos de endereço para um form de criarFormEndereco(fb, inicial?, entrega?).
 * Com 8 dígitos no CEP, o ViaCEP preenche rua, bairro, cidade e UF (só o que ele souber).
 */
@Component({
    selector: 'uz-endereco-form',
    templateUrl: './endereco-form.component.html',
    styleUrls: ['./endereco-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MascaraDirective, MatHint, MatProgressSpinner, MatSuffix, MatSelect, MatOption]
})
export class EnderecoFormComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) form!: FormGroup;

  readonly ufs = UFS;
  buscandoCep = false;
  cepNaoEncontrado = false;

  private readonly cep = inject(CepService);
  private assinatura?: Subscription;

  ngOnChanges(): void {
    this.assinatura?.unsubscribe();
    this.assinatura = this.form.controls['cep'].valueChanges
      .pipe(
        map(v => String(v ?? '').replace(/\D/g, '')),
        distinctUntilChanged(),
        tap(() => (this.cepNaoEncontrado = false)),
        filter(digitos => digitos.length === 8),
        tap(() => (this.buscandoCep = true)),
        switchMap(digitos => this.cep.buscar(digitos)),
      )
      .subscribe(endereco => {
        this.buscandoCep = false;
        if (!endereco) {
          this.cepNaoEncontrado = true;
          return;
        }
        const conhecidos = Object.fromEntries(Object.entries(endereco).filter(([, v]) => v));
        this.form.patchValue(conhecidos);
      });
  }

  ngOnDestroy(): void {
    this.assinatura?.unsubscribe();
  }
}
