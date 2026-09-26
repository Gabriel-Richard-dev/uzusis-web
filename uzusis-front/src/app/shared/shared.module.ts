import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BaseModule } from './base.module';
import { ConfirmacaoDialogComponent } from './confirmacao-dialog.component';
import { EnderecoFormComponent } from './endereco-form.component';
import { EsqueletoComponent } from './esqueleto.component';
import { LinhaDoTempoComponent } from './linha-do-tempo.component';
import { MascaraDirective } from './mascara.directive';
import { StatusPedidoComponent } from './status-pedido.component';

// Os módulos cujo tema entra em styles/_tema.scss. Um componente Material novo entra nos dois lugares.
const MATERIAL = [
  MatBadgeModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDialogModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatInputModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSidenavModule,
  MatSnackBarModule,
  MatTableModule,
  MatTabsModule,
  MatTooltipModule,
];

const COMPARTILHADOS = [
  ConfirmacaoDialogComponent,
  EnderecoFormComponent,
  EsqueletoComponent,
  LinhaDoTempoComponent,
  MascaraDirective,
  StatusPedidoComponent,
];

/** Importe só este módulo nas features: traz Common, Forms, Router, Material e os componentes uz-* (inclusive os do BaseModule). */
@NgModule({
  declarations: COMPARTILHADOS,
  imports: [BaseModule, ReactiveFormsModule, ...MATERIAL],
  exports: [BaseModule, ReactiveFormsModule, ...MATERIAL, ...COMPARTILHADOS],
})
export class SharedModule {}
